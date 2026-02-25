/**
 * 轻量级 Guitar Pro 文件头解析器
 *
 * 纯 TypeScript 二进制解析，无外部依赖。
 * 适用于 Cloudflare Workers 环境（不依赖 alphaTab）。
 *
 * 支持格式：GP3 / GP4 / GP5 / GPX（GP6 BCFZ）/ GP7+（ZIP）
 *
 * 编码处理：
 * - GP3/4/5：字符串可能是 UTF-8 或 GBK（中文系统创建）
 * - GP7+/GPX：内部 XML 始终为 UTF-8
 */

export interface GpHeaderInfo {
  title: string;
  artist: string;
  album: string;
  tempo: number;
  trackCount: number;
  trackNames: string[];
  version: string;
}

const EMPTY_RESULT: GpHeaderInfo = {
  title: "",
  artist: "",
  album: "",
  tempo: 120,
  trackCount: 0,
  trackNames: [],
  version: "",
};

// ── 编码处理 ──────────────────────────────────────────

/**
 * 解码二进制字符串，自动检测编码。
 *
 * GP3/4/5 文件中的字符串编码取决于创建时的系统区域设置：
 * - 西文系统 → CP1252 / Latin-1
 * - 中文系统 → GBK (Code Page 936)
 * - 日文系统 → Shift-JIS
 *
 * 策略：先尝试 UTF-8 严格模式，失败则尝试 GBK，最后兜底 Latin-1。
 */
function decodeString(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  // 去除尾部 null 字节
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  if (end === 0) return "";
  const trimmed = bytes.slice(0, end);

  // 1. 尝试 UTF-8 严格模式
  try {
    const result = new TextDecoder("utf-8", { fatal: true }).decode(trimmed);
    if (!result.includes("\uFFFD")) {
      return result;
    }
  } catch {
    // Not valid UTF-8
  }

  // 2. 尝试 GBK（中文 GP 文件常用编码）
  try {
    const decoder = new TextDecoder("gbk", { fatal: false });
    const result = decoder.decode(trimmed);
    if (result.length > 0) return result;
  } catch {
    // GBK 不被当前运行时支持
  }

  // 3. 兜底 Latin-1 (ISO-8859-1)
  let result = "";
  for (const b of trimmed) {
    result += String.fromCharCode(b);
  }
  return result;
}

// ── 二进制读取器 ──────────────────────────────────────

class BinaryReader {
  private view: DataView;
  private pos = 0;

  constructor(private buffer: Uint8Array) {
    this.view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
  }

  get position(): number {
    return this.pos;
  }

  get remaining(): number {
    return this.buffer.byteLength - this.pos;
  }

  seek(offset: number): void {
    this.pos = offset;
  }

  skip(n: number): void {
    this.pos += n;
  }

  readByte(): number {
    if (this.remaining < 1) return 0;
    return this.buffer[this.pos++];
  }

  readInt32LE(): number {
    if (this.remaining < 4) return 0;
    const v = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return v;
  }

  readUint32LE(): number {
    if (this.remaining < 4) return 0;
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }

  /** GP 格式的 Pascal 字符串：4字节int长度 + 字符串内容 */
  readIntString(): string {
    const len = this.readInt32LE();
    if (len <= 0 || len > 10000 || this.remaining < len) {
      if (len > 0) this.skip(Math.min(len, this.remaining));
      return "";
    }
    const bytes = this.buffer.slice(this.pos, this.pos + len);
    this.pos += len;
    return decodeString(bytes);
  }

  /**
   * GP3-5 的"双重前缀"字符串格式：
   * int32(totalLen) + byte(stringLen) + chars[stringLen]
   * totalLen = stringLen + 1
   */
  readIntByteString(): string {
    const totalLen = this.readInt32LE();
    if (totalLen <= 0) return "";
    const strLen = this.readByte();
    if (strLen <= 0 || strLen > 10000 || this.remaining < strLen) {
      // 跳过剩余数据
      if (totalLen > 1) this.skip(Math.min(totalLen - 1, this.remaining));
      return "";
    }
    const bytes = this.buffer.slice(this.pos, this.pos + strLen);
    this.pos += strLen;
    // 跳过填充
    const padding = totalLen - 1 - strLen;
    if (padding > 0) this.skip(Math.min(padding, this.remaining));
    return decodeString(bytes);
  }

  readBytes(n: number): Uint8Array {
    const end = Math.min(this.pos + n, this.buffer.byteLength);
    const result = this.buffer.slice(this.pos, end);
    this.pos = end;
    return result;
  }
}

// ── GP3/4/5 解析 ─────────────────────────────────────

function parseGp345(data: Uint8Array): GpHeaderInfo {
  const reader = new BinaryReader(data);

  // 读取版本字符串（31字节：1字节长度 + 最多30字符）
  const versionLen = reader.readByte();
  const versionBytes = reader.readBytes(30);
  const version = decodeString(versionBytes.slice(0, versionLen));

  // 判断版本号
  const isGp5 = version.includes("5.");
  const isGp4 = version.includes("4.");
  // const isGp3 = version.includes("3.");

  // 信息块 — 使用 intByteString (双重前缀)
  const title = reader.readIntByteString();
  const subtitle = reader.readIntByteString(); // subtitle，忽略
  void subtitle;
  const artist = reader.readIntByteString();
  const album = reader.readIntByteString();

  // GP5 有 words 字段，GP3-4 没有
  if (isGp5) {
    reader.readIntByteString(); // words (lyrics author)
  }

  reader.readIntByteString(); // music (作曲)
  reader.readIntByteString(); // copyright
  reader.readIntByteString(); // tab author
  reader.readIntByteString(); // instructions

  // 注释块
  const numComments = reader.readInt32LE();
  for (let i = 0; i < numComments && i < 100; i++) {
    reader.readIntByteString();
  }

  // 接下来的结构因版本而异，尝试定位 tempo 和轨道
  let tempo = 120;
  let trackCount = 0;
  const trackNames: string[] = [];

  try {
    if (isGp5) {
      // GP5: lyrics block + page setup + tempo
      reader.readInt32LE(); // lyrics track
      for (let i = 0; i < 5; i++) {
        reader.readInt32LE(); // start bar
        reader.readIntString(); // text
      }

      // 页面设置（GP5）— 11 个 intByteString
      for (let i = 0; i < 11; i++) {
        reader.readIntByteString();
      }

      // tempo name + tempo value
      reader.readIntByteString(); // tempo name (如 "Moderate")
      tempo = reader.readInt32LE();

    } else if (isGp4) {
      // GP4: lyrics block + tempo
      reader.readInt32LE(); // lyrics track
      for (let i = 0; i < 5; i++) {
        reader.readInt32LE(); // start bar
        reader.readIntString();
      }
      tempo = reader.readInt32LE();

    } else {
      // GP3: 直接 tempo
      tempo = reader.readInt32LE();
    }
  } catch {
    // 解析到一半出错也没关系，我们已经拿到了基本信息
  }

  // 如果 tempo 不合理，回退默认值
  if (tempo <= 0 || tempo > 1000) tempo = 120;

  return {
    title,
    artist,
    album,
    tempo,
    trackCount,
    trackNames,
    version,
  };
}

// ── GPX (GP6/7/8) 解析 ───────────────────────────────

/**
 * 解压 BCFZ 容器数据
 *
 * BCFZ 格式：
 * - 4 字节魔数 "BCFZ"
 * - 4 字节解压后大小 (uint32 LE)
 * - 剩余：deflate 压缩的 BCFS 容器数据
 */
async function decompressBcfz(data: Uint8Array): Promise<Uint8Array> {
  const compressedData = data.slice(8);

  // 尝试 deflate-raw 和 deflate (zlib) 两种格式
  for (const format of ["deflate-raw", "deflate"] as CompressionFormat[]) {
    try {
      const ds = new DecompressionStream(format);
      const blob = new Blob([compressedData as unknown as BlobPart]);
      const stream = blob.stream().pipeThrough(ds);
      const response = new Response(stream);
      const buffer = await response.arrayBuffer();
      const result = new Uint8Array(buffer);
      if (result.length > 0) return result;
    } catch {
      continue;
    }
  }

  throw new Error("BCFZ decompression failed with all formats");
}

/**
 * 在 BCFS 容器数据中搜索 score.gpif XML
 */
function findXmlInBinary(data: Uint8Array): string | null {
  const str = new TextDecoder("utf-8", { fatal: false }).decode(data);

  // 尝试找 <Score> 块
  const scoreStart = str.indexOf("<Score>");
  if (scoreStart !== -1) {
    const scoreEnd = str.indexOf("</Score>");
    if (scoreEnd !== -1) {
      return str.slice(scoreStart, scoreEnd + "</Score>".length);
    }
  }

  // 尝试找完整 GPIF 文档
  const gpifStart = str.indexOf("<GPIF>");
  if (gpifStart !== -1) {
    const gpifEnd = str.indexOf("</GPIF>");
    if (gpifEnd !== -1) {
      return str.slice(gpifStart, gpifEnd + "</GPIF>".length);
    }
    return str.slice(gpifStart);
  }

  // 尝试找 <?xml 开头
  const xmlStart = str.indexOf("<?xml");
  if (xmlStart !== -1) {
    const gpifEndAlt = str.indexOf("</GPIF>", xmlStart);
    if (gpifEndAlt !== -1) {
      return str.slice(xmlStart, gpifEndAlt + "</GPIF>".length);
    }
  }

  return null;
}

function parseGpifXml(xml: string): GpHeaderInfo {
  /**
   * 提取 XML 标签内容，支持：
   * - 普通文本: <Tag>text</Tag>
   * - CDATA: <Tag><![CDATA[text]]></Tag>
   */
  const getTag = (tag: string): string => {
    // 先尝试 CDATA 格式
    const cdataRegex = new RegExp(
      `<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`,
    );
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1].trim();

    // 再尝试普通文本
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
    const match = xml.match(regex);
    return match?.[1]?.trim() ?? "";
  };

  const title = getTag("Title");
  const artist = getTag("Artist");
  const album = getTag("Album");

  // Tempo — GP8 格式: <Automation> 块中 <Type>Tempo</Type> 与 <Value> 之间
  // 有多个标签（<Linear>, <Bar>, <Position> 等），需要跨标签匹配
  let tempo = 120;
  const tempoBlockMatch = xml.match(
    /<Type>Tempo<\/Type>[\s\S]*?<Value>([\d.]+)/,
  );
  if (tempoBlockMatch) {
    const t = Math.round(parseFloat(tempoBlockMatch[1]));
    if (t > 0 && t <= 1000) tempo = t;
  }

  // 轨道名 — 支持 CDATA: <Name><![CDATA[Steel Guitar]]></Name>
  const trackNames: string[] = [];
  const trackRegex =
    /<Track\s[^>]*>[\s\S]*?<Name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/Name>/g;
  let match;
  while ((match = trackRegex.exec(xml)) !== null) {
    const name = match[1].trim();
    if (name) trackNames.push(name);
  }

  return {
    title,
    artist,
    album,
    tempo,
    trackCount: trackNames.length,
    trackNames,
    version: "GPX",
  };
}

/**
 * 解析 GPX (GP6/7/8) 格式
 */
async function parseGpx(data: Uint8Array): Promise<GpHeaderInfo> {
  const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
  let containerData: Uint8Array;

  if (magic === "BCFZ") {
    try {
      containerData = await decompressBcfz(data);
    } catch (e) {
      console.error(
        JSON.stringify({
          message: "BCFZ decompression failed",
          error: String(e),
          dataSize: data.byteLength,
        }),
      );
      return { ...EMPTY_RESULT, version: "GPX" };
    }
  } else if (magic === "BCFS") {
    containerData = data;
  } else {
    return { ...EMPTY_RESULT, version: "GPX" };
  }

  const xmlContent = findXmlInBinary(containerData);
  if (!xmlContent) {
    console.error(
      JSON.stringify({
        message: "score.gpif XML not found in container",
        containerSize: containerData.byteLength,
        magic,
      }),
    );
    return { ...EMPTY_RESULT, version: "GPX" };
  }

  return parseGpifXml(xmlContent);
}

// ── 主入口 ────────────────────────────────────────────

/**
 * 解析 Guitar Pro 文件头信息（异步）
 *
 * 支持 GP3/4/5/GPX/GP7+(ZIP) 格式，在 Workers 环境中运行。
 * 只解析元信息（标题、艺术家、专辑、速度），不解析完整乐谱。
 */
export async function parseGpHeader(
  data: Uint8Array,
): Promise<GpHeaderInfo> {
  if (data.byteLength < 32) return EMPTY_RESULT;

  try {
    const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);

    // GP7/8: ZIP 格式（PK\x03\x04）
    if (data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
      return await parseGpZip(data);
    }

    // GP6: BCFS/BCFZ 容器格式
    if (magic === "BCFS" || magic === "BCFZ") {
      return await parseGpx(data);
    }

    // GP3/4/5: 二进制格式
    return parseGp345(data);
  } catch (e) {
    console.error(
      JSON.stringify({
        message: "gp header parse failed",
        error: String(e),
        firstBytes: Array.from(data.slice(0, 16))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" "),
      }),
    );
    return EMPTY_RESULT;
  }
}

// ── ZIP 格式解析（GP7/8）──────────────────────────────

/**
 * 从 ZIP 格式的 .gp 文件中提取 Content/score.gpif 并解析
 *
 * GP7/8 的 .gp 文件是标准 ZIP 压缩包，内含：
 * - Content/score.gpif — UTF-8 XML 乐谱数据
 * - Content/BinaryStylesheet
 * - Content/Assets/ — 附件（音频等）
 * - meta.json, VERSION
 */
async function parseGpZip(data: Uint8Array): Promise<GpHeaderInfo> {
  const gpifData = await extractFileFromZip(data, "Content/score.gpif");
  if (!gpifData) {
    console.error(
      JSON.stringify({
        message: "Content/score.gpif not found in ZIP",
        zipSize: data.byteLength,
      }),
    );
    return { ...EMPTY_RESULT, version: "GP7+" };
  }

  const xml = new TextDecoder("utf-8", { fatal: false }).decode(gpifData);
  const result = parseGpifXml(xml);
  result.version = "GP7+";
  return result;
}

/**
 * 最小化 ZIP 解析器 — 从 ZIP 中提取指定文件
 *
 * 通过读取 End of Central Directory (EOCD) → Central Directory → Local File Header
 * 来定位并解压目标文件。支持 DEFLATE (method=8) 和 STORE (method=0)。
 */
async function extractFileFromZip(
  data: Uint8Array,
  targetName: string,
): Promise<Uint8Array | null> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const len = data.byteLength;

  // 1. 查找 End of Central Directory Record (EOCD)
  //    签名: 0x06054b50, 从文件末尾往前搜索
  let eocdOffset = -1;
  const searchStart = Math.max(0, len - 65557); // EOCD + max comment
  for (let i = len - 22; i >= searchStart; i--) {
    if (
      data[i] === 0x50 &&
      data[i + 1] === 0x4b &&
      data[i + 2] === 0x05 &&
      data[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    console.error(JSON.stringify({ message: "ZIP EOCD not found" }));
    return null;
  }

  // 2. 读取 EOCD，获取 Central Directory 偏移量
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const numEntries = view.getUint16(eocdOffset + 10, true);

  // 3. 遍历 Central Directory 条目，找到目标文件
  let pos = cdOffset;
  for (let i = 0; i < numEntries; i++) {
    if (pos + 46 > len) break;
    // Central Directory 签名: 0x02014b50
    if (
      data[pos] !== 0x50 ||
      data[pos + 1] !== 0x4b ||
      data[pos + 2] !== 0x01 ||
      data[pos + 3] !== 0x02
    ) {
      break;
    }

    const compMethod = view.getUint16(pos + 10, true);
    const compSize = view.getUint32(pos + 20, true);
    const uncompSize = view.getUint32(pos + 24, true);
    const fnLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);

    const fnBytes = data.slice(pos + 46, pos + 46 + fnLen);
    const fileName = new TextDecoder("utf-8", { fatal: false }).decode(fnBytes);

    if (fileName === targetName) {
      // 4. 读取 Local File Header 来获取实际数据位置
      const localPos = localHeaderOffset;
      if (localPos + 30 > len) return null;
      const localFnLen = view.getUint16(localPos + 26, true);
      const localExtraLen = view.getUint16(localPos + 28, true);
      const dataStart = localPos + 30 + localFnLen + localExtraLen;

      if (compMethod === 0) {
        // STORE: 直接读取
        return data.slice(dataStart, dataStart + uncompSize);
      } else if (compMethod === 8) {
        // DEFLATE: 解压
        const compressed = data.slice(dataStart, dataStart + compSize);
        return await inflateData(compressed);
      } else {
        console.error(
          JSON.stringify({
            message: "Unsupported ZIP compression method",
            method: compMethod,
            fileName,
          }),
        );
        return null;
      }
    }

    // 移动到下一个 Central Directory 条目
    pos += 46 + fnLen + extraLen + commentLen;
  }

  return null;
}

/**
 * 解压 DEFLATE 压缩的数据
 */
async function inflateData(compressed: Uint8Array): Promise<Uint8Array> {
  // 尝试 deflate-raw（ZIP 使用 raw deflate，无 zlib header）
  for (const format of ["deflate-raw", "deflate"] as CompressionFormat[]) {
    try {
      const ds = new DecompressionStream(format);
      const blob = new Blob([compressed as unknown as BlobPart]);
      const stream = blob.stream().pipeThrough(ds);
      const response = new Response(stream);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } catch {
      continue;
    }
  }
  throw new Error("Inflate failed with all formats");
}
