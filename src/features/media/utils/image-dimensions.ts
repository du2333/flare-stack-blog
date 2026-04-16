/**
 * 从图片二进制数据的头部解析宽高，支持 JPEG/PNG/WebP/GIF。
 * 纯 Uint8Array 操作，无 Node.js 依赖，可在 Cloudflare Workers 中运行。
 */
export function getImageDimensions(
  buffer: ArrayBuffer,
): { width: number; height: number } | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 10) return null;

  // PNG: 89 50 4E 47 → IHDR chunk at offset 16
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    if (bytes.length < 24) return null;
    const width = readUint32BE(bytes, 16);
    const height = readUint32BE(bytes, 20);
    return { width, height };
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    if (bytes.length < 10) return null;
    const width = readUint16LE(bytes, 6);
    const height = readUint16LE(bytes, 8);
    return { width, height };
  }

  // JPEG: FF D8
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return parseJpegDimensions(bytes);
  }

  // WebP: "RIFF" ... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return parseWebpDimensions(bytes);
  }

  return null;
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

/** JPEG: 扫描 SOF 标记 (0xFFC0–0xFFCF，排除 0xFFC4 DHT 和 0xFFC8) */
function parseJpegDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  let offset = 2; // skip FF D8

  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) return null;

    // 跳过 padding FF
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset++;
    }
    if (offset >= bytes.length) return null;

    const marker = bytes[offset];
    offset++;

    // SOF markers: C0-CF, excluding C4 (DHT) and C8 (JPG extension)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8
    ) {
      if (offset + 7 > bytes.length) return null;
      // 2 bytes length + 1 byte precision + 2 bytes height + 2 bytes width
      const height = readUint16BE(bytes, offset + 3);
      const width = readUint16BE(bytes, offset + 5);
      return { width, height };
    }

    // 跳过当前段
    if (offset + 1 >= bytes.length) return null;
    const segmentLength = readUint16BE(bytes, offset);
    offset += segmentLength;
  }

  return null;
}

/** WebP: 支持 VP8 (lossy)、VP8L (lossless)、VP8X (extended) */
function parseWebpDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < 16) return null;

  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);

  // VP8X (extended)
  if (chunk === "VP8X") {
    if (bytes.length < 30) return null;
    const width =
      ((bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) & 0xffffff) + 1;
    const height =
      ((bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) & 0xffffff) + 1;
    return { width, height };
  }

  // VP8L (lossless)
  if (chunk === "VP8L") {
    if (bytes.length < 25) return null;
    // signature byte at offset 21 should be 0x2F
    if (bytes[21] !== 0x2f) return null;
    const bits =
      bytes[22] | (bytes[23] << 8) | (bytes[24] << 16) | (bytes[25] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  // VP8 (lossy)
  if (chunk === "VP8 ") {
    // VP8 bitstream 帧头从 chunk data + 10 偏移开始
    // offset 12 是 chunk tag，+4 chunk size，+3 frame tag = 23
    // 然后检查 keyframe signature 9D 01 2A
    if (bytes.length < 30) return null;
    const frameStart = 20 + 3; // skip chunk header (8) + 12 base + 3 frame tag
    if (
      bytes[frameStart] !== 0x9d ||
      bytes[frameStart + 1] !== 0x01 ||
      bytes[frameStart + 2] !== 0x2a
    ) {
      return null;
    }
    const width = readUint16LE(bytes, frameStart + 3) & 0x3fff;
    const height = readUint16LE(bytes, frameStart + 5) & 0x3fff;
    return { width, height };
  }

  return null;
}
