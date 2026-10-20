import type { CSSProperties } from "react";

/**
 * 文章视觉指纹（Plate）：由 slug 确定性推导的装饰层。
 * fnv1a 哈希 → 图案 / 色相 / 位置 / 日语背景词，同一篇永远是同一张。
 * 只用纸墨金蓝夜色池，不引入随机鲜艳色。
 */

const WORDS = [
  "夜空",
  "図書館",
  "魔法使",
  "紙と光",
  "星の軌跡",
  "月齢",
  "灯台",
  "海辺",
  "白昼夢",
  "苦い珈琲",
  "透明",
  "古典",
  "庭の雨",
  "灯り",
] as const;

const INKS = ["#b8892f", "#2f57c8", "#1c2340", "#7a5520"] as const;

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface PlateSpec {
  pattern: number; // 0–3 图案
  ink: string; // 色池中的一支
  word: string; // 背景日语词
  x: number; // 焦点横向位置（%）
  rot: number; // 图案微旋转（deg）
  no: string; // 版号，如 "No.042"
}

export function plateOf(slug: string): PlateSpec {
  const h = fnv1a(slug);
  return {
    pattern: h % 4,
    ink: INKS[(h >>> 3) % INKS.length],
    word: WORDS[(h >>> 7) % WORDS.length],
    x: 55 + (h % 40), // 55–95%，偏右，给标题留纸
    rot: (h % 17) - 8, // -8°–8°
    no: `No.${String(h % 1000).padStart(3, "0")}`,
  };
}

interface PlateProps {
  slug: string;
  /** 是否显示版号角标 */
  mark?: boolean;
}

/** 绝对定位装饰层：放进 position:relative 的容器里，内容需自行 z-10 */
export function Plate({ slug, mark = true }: PlateProps) {
  const spec = plateOf(slug);
  const style = {
    "--pa-ink": spec.ink,
    "--pa-x": `${spec.x}%`,
    "--pa-rot": `${spec.rot}deg`,
  } as CSSProperties;

  return (
    <div
      className={`yz-plate yz-plate--p${spec.pattern}`}
      style={style}
      aria-hidden="true"
    >
      <div className="yz-plate__wash" />
      <div className="yz-plate__word">{spec.word}</div>
      {mark && <div className="yz-plate__no">{spec.no}</div>}
    </div>
  );
}
