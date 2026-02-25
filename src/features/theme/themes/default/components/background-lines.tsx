/**
 * 装饰性几何线条背景
 * 使用 SVG 绘制简洁的交叉线条 + 菱形散布，固定在视口底层
 * 通过 CSS 变量自动适配明暗模式
 */
export function BackgroundLines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── 对角交叉细线 ─────────────────── */}
        {/* 主斜线组 — 从左上到右下 */}
        <line
          x1="0" y1="200" x2="600" y2="800"
          className="stroke-foreground/[0.045] dark:stroke-foreground/[0.07]"
          strokeWidth="0.6"
        />
        <line
          x1="200" y1="0" x2="800" y2="600"
          className="stroke-foreground/[0.035] dark:stroke-foreground/[0.06]"
          strokeWidth="0.5"
        />
        <line
          x1="600" y1="0" x2="1200" y2="600"
          className="stroke-foreground/[0.03] dark:stroke-foreground/[0.05]"
          strokeWidth="0.5"
        />
        <line
          x1="900" y1="0" x2="1200" y2="300"
          className="stroke-foreground/[0.025] dark:stroke-foreground/[0.04]"
          strokeWidth="0.4"
        />

        {/* 反向斜线组 — 从右上到左下 */}
        <line
          x1="1200" y1="150" x2="600" y2="750"
          className="stroke-accent/[0.05] dark:stroke-accent/[0.08]"
          strokeWidth="0.5"
        />
        <line
          x1="1000" y1="0" x2="400" y2="600"
          className="stroke-accent/[0.04] dark:stroke-accent/[0.06]"
          strokeWidth="0.4"
        />
        <line
          x1="500" y1="0" x2="0" y2="500"
          className="stroke-accent/[0.045] dark:stroke-accent/[0.07]"
          strokeWidth="0.5"
        />

        {/* ── 交叉点菱形装饰 ───────────────── */}
        <g className="fill-accent/[0.07] dark:fill-accent/[0.1]">
          <rect x="396" y="396" width="5" height="5" rx="0.5" transform="rotate(45 398.5 398.5)" />
          <rect x="596" y="296" width="4" height="4" rx="0.5" transform="rotate(45 598 298)" />
          <rect x="796" y="396" width="4" height="4" rx="0.5" transform="rotate(45 798 398)" />
          <rect x="296" y="196" width="3.5" height="3.5" rx="0.5" transform="rotate(45 297.75 197.75)" />
          <rect x="896" y="196" width="3" height="3" rx="0.5" transform="rotate(45 897.5 197.5)" />
        </g>

        {/* ── 水平辅助细线（偏下方，与导航栏区分） ─── */}
        <line
          x1="100" y1="520" x2="500" y2="520"
          className="stroke-foreground/[0.03] dark:stroke-foreground/[0.045]"
          strokeWidth="0.4"
          strokeDasharray="3 8"
        />
        <line
          x1="700" y1="620" x2="1100" y2="620"
          className="stroke-foreground/[0.025] dark:stroke-foreground/[0.04]"
          strokeWidth="0.4"
          strokeDasharray="2 10"
        />

        {/* ── 弧线点缀 ───────────────────── */}
        <path
          d="M 100 700 Q 300 600 500 700"
          className="stroke-accent/[0.045] dark:stroke-accent/[0.07]"
          strokeWidth="0.5"
          fill="none"
        />
        <path
          d="M 700 100 Q 900 200 1100 100"
          className="stroke-accent/[0.035] dark:stroke-accent/[0.06]"
          strokeWidth="0.4"
          fill="none"
        />

        {/* ── 小圆点散落（交叉节点） ────────── */}
        <g className="fill-foreground/[0.05] dark:fill-foreground/[0.08]">
          <circle cx="400" cy="400" r="1.5" />
          <circle cx="600" cy="300" r="1.2" />
          <circle cx="800" cy="400" r="1" />
          <circle cx="300" cy="200" r="1" />
          <circle cx="900" cy="200" r="0.8" />
          <circle cx="200" cy="600" r="1.2" />
          <circle cx="1000" cy="500" r="1" />
        </g>
      </svg>

      {/* 底部渐变遮罩 — 让线条往底部逐渐消隐 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background:
            "linear-gradient(to bottom, transparent, hsl(var(--background)))",
        }}
      />

      {/* 顶部渐变遮罩 — 让导航栏区域更干净 */}
      <div
        className="absolute inset-x-0 top-0 h-32"
        style={{
          background:
            "linear-gradient(to bottom, hsl(var(--background)), transparent)",
        }}
      />
    </div>
  );
}
