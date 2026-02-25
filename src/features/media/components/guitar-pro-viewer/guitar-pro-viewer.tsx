import { AlphaTabApi, Environment } from "@coderline/alphatab";
import {
  Activity,
  ChevronDown,
  ListMusic,
  Maximize2,
  Mic,
  Minimize2,
  Minus,
  Music,
  Pause,
  Play,
  Plus,
  Repeat,
  Square,
  Timer,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GuitarProViewerProps } from "./types";
import { Button } from "@/components/ui/button";

// ─── Helpers ────────────────────────────────────────────

/** 毫秒 → mm:ss */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ─── Constants ──────────────────────────────────────────

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0];
const ZOOM_STEPS = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 2.0];
const DEFAULT_MASTER_VOLUME = 1.0;
const MAX_MASTER_VOLUME = 1.0;

/**
 * 将歌词从曲谱上方移动到下方。
 * alphaTab 内部将歌词绑定在 BarRendererFactory 上，
 * 使用 EffectBandMode.SharedTop (2) 渲染在谱上方。
 * 这里通过 monkey-patch 将其改为 SharedBottom (3)，使歌词渲染在谱下方。
 * 在模块加载时立即执行，确保在任何 AlphaTabApi 实例化之前完成。
 */
const EFFECT_BAND_MODE_SHARED_BOTTOM = 3;
const NOTATION_ELEMENT_EFFECT_LYRICS = 24;
try {
  const env = Environment as unknown as Record<string, unknown>;
  const renderers = env.defaultRenderers as unknown[];
  if (Array.isArray(renderers)) {
    for (const factory of renderers) {
      const f = factory as Record<string, unknown>;
      const bands = f.effectBands as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(bands)) continue;
      for (const band of bands) {
        const effect = band.effect as Record<string, unknown> | undefined;
        if (!effect) continue;
        // 尝试读取 notationElement (getter)
        let ne: unknown;
        try { ne = effect.notationElement; } catch { continue; }
        if (ne === NOTATION_ELEMENT_EFFECT_LYRICS) {
          band.mode = EFFECT_BAND_MODE_SHARED_BOTTOM;
        }
      }
    }
  }
} catch {
  // 静默失败
}

type DisplayMode = "scoreTab" | "score" | "tab";

interface DisplayModeOption {
  value: DisplayMode;
  label: string;
  profile: number;
}

const DISPLAY_MODES: DisplayModeOption[] = [
  { value: "scoreTab", label: "标准 + TAB", profile: 1 },
  { value: "score", label: "五线谱", profile: 2 },
  { value: "tab", label: "TAB 谱", profile: 3 },
];

interface TrackState {
  index: number;
  name: string;
  isSelected: boolean;
  isMuted: boolean;
  isSolo: boolean;
  volume: number; // 0–16 (alphaTab range)
}

/**
 * alphaTab 光标样式 + 深色模式适配
 *
 * 注意：`.at-cursor-beat` 的 width / height / transform 由 alphaTab JS 通过
 * inline style 设定（ScalableHtmlElementContainer），CSS !important 无法覆盖。
 * 只有 background / opacity / box-shadow 等属性可以通过 CSS 安全修改。
 * I-beam（工字）效果通过 JS 叠加独立 DOM 元素实现，见 setupIBeamOverlay()。
 */
const ALPHATAB_CURSOR_STYLES = `
  .at-cursor-bar {
    background: hsl(var(--accent) / 0.06) !important;
  }
  .at-cursor-beat {
    background: hsl(var(--accent) / 0.85) !important;
    opacity: 1 !important;
    z-index: 100 !important;
    overflow: visible !important;
  }
  .at-highlight * {
    fill: hsl(var(--accent)) !important;
  }
  .at-selection div {
    background: hsl(var(--accent) / 0.1) !important;
  }

  /* ── alphaTab 深色模式适配 ── */
  /* alphaTab SVG 使用 rgb(0,0,0) / rgb(255,255,255) 硬编码颜色 */
  .dark .at-surface svg text {
    fill: hsl(var(--foreground)) !important;
  }
  .dark .at-surface svg path {
    fill: hsl(var(--foreground) / 0.85) !important;
    stroke: hsl(var(--foreground) / 0.85) !important;
  }
  /* 背景矩形（白色 → 透明） */
  .dark .at-surface svg rect[fill="rgb(255,255,255)"],
  .dark .at-surface svg rect[fill="white"],
  .dark .at-surface svg rect[fill="#ffffff"],
  .dark .at-surface svg rect[fill="#FFFFFF"],
  .dark .at-surface svg rect[fill="#fff"] {
    fill: transparent !important;
  }
  /* 拍线和小节线 — 使用较高不透明度确保可见 */
  .dark .at-surface svg line {
    stroke: hsl(var(--foreground) / 0.75) !important;
  }
  /* 黑色细矩形（alphaTab 用于绘制小节线、beam 等） */
  .dark .at-surface svg rect[fill="rgb(0,0,0)"],
  .dark .at-surface svg rect[fill="black"],
  .dark .at-surface svg rect[fill="#000000"],
  .dark .at-surface svg rect[fill="#000"] {
    fill: hsl(var(--foreground) / 0.75) !important;
  }
  .dark .at-surface svg circle {
    fill: hsl(var(--foreground) / 0.85) !important;
    stroke: hsl(var(--foreground) / 0.85) !important;
  }
  /* 让高亮保持 accent 色不被覆盖 */
  .dark .at-highlight * {
    fill: hsl(var(--accent)) !important;
    stroke: hsl(var(--accent)) !important;
  }

  /* Viewer open/close — clip-path expand from origin */
  .gp-viewer-root {
    will-change: clip-path;
    transition: clip-path 500ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  .gp-viewer-root[data-state="exiting"] {
    transition-duration: 350ms;
  }
  .gp-viewer-root[data-state="open"] {
    clip-path: inset(0 0 0 0);
  }

  /* Backdrop */
  .gp-viewer-backdrop {
    transition: opacity 400ms ease;
  }
  .gp-viewer-root[data-state="entering"] .gp-viewer-backdrop {
    opacity: 0;
  }
  .gp-viewer-root[data-state="open"] .gp-viewer-backdrop {
    opacity: 1;
  }
  .gp-viewer-root[data-state="exiting"] .gp-viewer-backdrop {
    opacity: 0;
    transition-duration: 250ms;
  }

  /* Inner panel — smooth fullscreen toggle */
  .gp-viewer-panel {
    transition: top 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
                left 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
                right 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
                bottom 500ms cubic-bezier(0.34, 1.56, 0.64, 1),
                border-radius 400ms cubic-bezier(0.16, 1, 0.3, 1),
                box-shadow 400ms ease;
  }

  .gp-viewer-content {
    transition: opacity 350ms ease;
  }
  .gp-viewer-root[data-state="entering"] .gp-viewer-content {
    opacity: 0;
  }
  .gp-viewer-root[data-state="open"] .gp-viewer-content {
    opacity: 1;
  }
  .gp-viewer-root[data-state="exiting"] .gp-viewer-content {
    opacity: 0;
    transition-duration: 200ms;
  }
`;

// ─── Sub-components ─────────────────────────────────────

/** 自定义滑轨 — 带已填充进度指示 */
function SliderTrack({
  value,
  max,
  onChange,
  className = "",
  disabled = false,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`relative h-1.5 group ${className}`}>
      {/* 轨道背景 + 已填充部分 */}
      <div className="absolute inset-0 bg-muted/30 overflow-hidden">
        <div
          className="h-full bg-foreground/30 group-hover:bg-foreground/50 transition-colors"
          style={{ width: `${percent}%` }}
        />
      </div>
      {/* 不可见的原生滑块（提供交互） */}
      <input
        type="range"
        min={0}
        max={max}
        step={max / 200 || 0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
      />
      {/* 拖拽指示点 */}
      <div
        className="absolute top-1/2 w-2.5 h-2.5 bg-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ left: `${percent}%`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}

// ─── Audio Effects ──────────────────────────────────────

/**
 * 为 alphaTab 的音频输出添加混响 + 压缩器效果链。
 * 通过访问内部 AudioContext 实现（非公开 API，但稳定可用）。
 *
 * 信号链：outputNode → compressor → dryGain ─┐
 *         outputNode → compressor → convolver → wetGain ─┤→ destination
 */
function setupAudioEffects(api: AlphaTabApi): void {
  try {
    const output = (api as any).player?.output;
    if (!output) return;

    const ctx: AudioContext | undefined = output.context;
    if (!ctx) return;

    // 找到 alphaTab 的输出节点（AudioWorklet 或 ScriptProcessor 模式）
    const outputNode: AudioNode | undefined =
      output._worklet ?? output._audioNode;
    if (!outputNode) return;

    // 断开原始连接（outputNode → destination）
    outputNode.disconnect();

    // ── 压缩器：增加延音 / 减少动态范围 ──
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -30; // 较低阈值，捕获更多信号
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.5; // 慢释放 = 更长延音感

    // ── 混响（卷积器 + 算法脉冲响应）──
    const convolver = ctx.createConvolver();
    const reverbTime = 1.8; // 秒
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * reverbTime);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // 指数衰减 + 随机噪声 = 类似厅堂混响
        const decay = Math.pow(1 - i / length, 2.0);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    convolver.buffer = impulse;

    // ── 干 / 湿混合 ──
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    dryGain.gain.value = 0.72;
    wetGain.gain.value = 0.28;

    // ── 连接效果链 ──
    outputNode.connect(compressor);
    compressor.connect(dryGain);
    compressor.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(ctx.destination);
    wetGain.connect(ctx.destination);

    console.log(
      JSON.stringify({ message: "audio effects chain initialized" }),
    );
  } catch (e) {
    // 如果 hack 失败，静默降级（无效果但仍可播放）
    console.warn(
      JSON.stringify({
        message: "audio effects setup failed, falling back to dry output",
        error: String(e),
      }),
    );
  }
}

// ─── I-beam Overlay ─────────────────────────────────────

/**
 * 在 `.at-cursor-beat` 内部创建 I-beam（工字）横杠。
 *
 * alphaTab 的拍光标是 ScalableHtmlElementContainer：
 *   - 基础尺寸 width:300px, height:100px
 *   - 用 transform: translate(X,Y) scale(sX,sY) translateX(-50%) 缩放到实际尺寸
 *
 * 将横杠作为 beatCursor 的 **子元素** 可以零延迟跟随移动，
 * 再通过反向 scale(1/sX, 1/sY) 抵消父级缩放，使横杠保持正常像素尺寸。
 */
function setupIBeamOverlay(container: HTMLElement): (() => void) | null {
  const beatCursor = container.querySelector(
    ".at-cursor-beat",
  ) as HTMLElement | null;
  if (!beatCursor) return null;

  const SERIF_W = 14; // 横杠视觉宽度 px
  const SERIF_H = 3; // 横杠视觉高度 px

  // 创建上下两个横杠 —— 作为 beatCursor 的子元素
  const serifTop = document.createElement("div");
  const serifBottom = document.createElement("div");
  serifTop.className = "ibeam-serif";
  serifBottom.className = "ibeam-serif";

  // 基础样式（在父级坐标系内定位）
  for (const el of [serifTop, serifBottom]) {
    el.style.position = "absolute";
    el.style.left = "50%";
    el.style.width = `${SERIF_W}px`;
    el.style.height = `${SERIF_H}px`;
    el.style.pointerEvents = "none";
    el.style.background = "hsl(var(--accent) / 0.9)";
    el.style.borderRadius = "1px";
    el.style.zIndex = "101";
  }
  // 顶部横杠锚定在父级 top:0，变换原点设为顶部中心
  serifTop.style.top = "0";
  serifTop.style.transformOrigin = "center top";
  // 底部横杠锚定在父级 bottom:0，变换原点设为底部中心
  serifBottom.style.bottom = "0";
  serifBottom.style.transformOrigin = "center bottom";

  beatCursor.appendChild(serifTop);
  beatCursor.appendChild(serifBottom);

  /** 从 beatCursor 的 inline transform 中提取 scale(sX, sY) 并设置反向缩放 */
  function syncCounterScale() {
    const t = beatCursor!.style.transform;
    const m = t.match(/scale\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)/);
    if (!m) return;
    const sX = parseFloat(m[1]);
    const sY = parseFloat(m[2]);
    if (!sX || !sY) return;
    // 反向缩放 + 水平居中
    const counter = `translateX(-50%) scale(${1 / sX}, ${1 / sY})`;
    serifTop.style.transform = counter;
    serifBottom.style.transform = counter;
  }

  // 监听 beatCursor style 属性变化
  const observer = new MutationObserver(syncCounterScale);
  observer.observe(beatCursor, {
    attributes: true,
    attributeFilter: ["style"],
  });

  // 初始同步
  syncCounterScale();

  return () => {
    observer.disconnect();
    serifTop.remove();
    serifBottom.remove();
  };
}

// ─── Main ───────────────────────────────────────────────

export default function GuitarProViewer({
  isOpen,
  fileUrl,
  fileName,
  onClose,
  originRect,
}: GuitarProViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const ibeamCleanupRef = useRef<(() => void) | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // ── clip-path 展开/折叠动画 ──
  // 计算从 originRect 到全屏的 inset 值
  const getClipInset = useCallback(() => {
    if (!originRect) return "inset(0 0 0 0)";
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
    const top = originRect.top;
    const right = vw - originRect.left - originRect.width;
    const bottom = vh - originRect.top - originRect.height;
    const left = originRect.left;
    return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  }, [originRect]);

  type ViewerState = "entering" | "open" | "exiting";
  const [viewerState, setViewerState] = useState<ViewerState>("entering");

  // ── 锁定 body 滚动，防止查看器打开期间页面漂移 ──
  useEffect(() => {
    if (!isOpen) return;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const origOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = origOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = rootRef.current;
    if (!el) return;
    // 设置初始 clip-path (卡片位置)
    el.style.clipPath = getClipInset();
    // 下一帧展开到全屏
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.clipPath = "inset(0 0 0 0)";
        setViewerState("open");
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, getClipInset]);

  const handleClose = useCallback(() => {
    const el = rootRef.current;
    if (el) {
      el.style.clipPath = getClipInset();
    }
    setViewerState("exiting");
    setTimeout(() => onClose(), 370);
  }, [onClose, getClipInset]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  // ── 基础状态 ──
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── 播放控制 ──
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(DEFAULT_MASTER_VOLUME);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);

  // ── 显示 ──
  const [displayMode, setDisplayMode] = useState<DisplayMode>("scoreTab");
  const [scale, setScale] = useState(1.0);
  const [showDisplayMenu, setShowDisplayMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── 轨道 ──
  const [tracks, setTracks] = useState<TrackState[]>([]);
  const [showTrackPanel, setShowTrackPanel] = useState(false);

  // ── 伴奏音频轨 ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [audioTrackUrl, setAudioTrackUrl] = useState<string | null>(null);
  const [audioTrackName, setAudioTrackName] = useState<string>("");
  const [audioVolume, setAudioVolume] = useState(1.0);
  const [audioMuted, setAudioMuted] = useState(false);

  const prevVolumeRef = useRef(DEFAULT_MASTER_VOLUME);

  // ────────────────────────────────────────────────────
  // 初始化 alphaTab
  // ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    setIsLoading(true);
    setLoadError(null);
    setIsPlayerReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setTotalTime(0);

    const api = new AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: "/font/",
        engine: "svg",
        logLevel: 1,
        enableLazyLoading: true,
        useWorkers: false, // 主线程渲染，使歌词位置 monkey-patch 生效
        tracks: [-1], // 渲染所有音轨（-1 = all）
      },
      display: {
        scale: 1.0,
        layoutMode: 0, // Page
        staveProfile: 1, // ScoreTab
        padding: [40, 40, 40, 40],
        lyricLinesPaddingBetween: 8, // 多行歌词间距
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableAnimatedBeatCursor: true,
        enableElementHighlighting: true,
        enableUserInteraction: true,
        soundFont: "/soundfont/sonivox.sf2",
        scrollMode: 1, // Continuous
        scrollSpeed: 300,
      },
      notation: {
        notationMode: 0, // GuitarPro
      },
      importer: {
        beatTextAsLyrics: true, // 将拍文本解析为歌词（GP3-5）
      },
    });

    // 提高默认音量
    api.masterVolume = DEFAULT_MASTER_VOLUME;

    apiRef.current = api;
    const unsubs: (() => void)[] = [];

    // 乐谱信息
    unsubs.push(
      api.scoreLoaded.on(
        (score: {
          title?: string;
          artist?: string;
          tracks: Array<{ name: string }>;
        }) => {
          setSongTitle(score.title || fileName);
          setSongArtist(score.artist || "");
          setTracks(
            score.tracks.map((t, i) => ({
              index: i,
              name: t.name || `轨道 ${i + 1}`,
              isSelected: true, // 默认显示所有音轨
              isMuted: false,
              isSolo: false,
              volume: 16,
            })),
          );
          // 音轨已通过 core.tracks: [-1] 全部渲染，无需再调用 renderTracks
        },
      ),
    );

    unsubs.push(
      api.renderFinished.on(() => {
        setIsLoading(false);
        // 初始化 I-beam 叠加层（需在 DOM 渲染完成后）
        if (containerRef.current) {
          // 清理之前的叠加层（缩放/模式切换会触发重新渲染）
          if (ibeamCleanupRef.current) ibeamCleanupRef.current();
          ibeamCleanupRef.current =
            setupIBeamOverlay(containerRef.current) ?? null;
        }
      }),
    );
    unsubs.push(
      api.playerReady.on(() => {
        setIsPlayerReady(true);
        // 注入混响 + 压缩器效果链
        setupAudioEffects(api);
      }),
    );
    unsubs.push(
      api.playerStateChanged.on((args: { state: number }) => {
        const playing = args.state === 1;
        setIsPlaying(playing);
        // 同步伴奏音频
        if (audioRef.current) {
          if (playing) {
            audioRef.current.play().catch(() => {});
          } else {
            audioRef.current.pause();
          }
        }
      }),
    );
    unsubs.push(
      api.playerPositionChanged.on(
        (args: { currentTime: number; endTime: number }) => {
          setCurrentTime(args.currentTime);
          setTotalTime(args.endTime);
          // 同步伴奏音频位置（当偏差 >500ms 时校正）
          if (audioRef.current && !audioRef.current.paused) {
            const audioMs = audioRef.current.currentTime * 1000;
            if (Math.abs(audioMs - args.currentTime) > 500) {
              audioRef.current.currentTime = args.currentTime / 1000;
            }
          }
        },
      ),
    );
    unsubs.push(
      api.error.on((error: unknown) => {
        console.error(
          JSON.stringify({ message: "alphaTab error", error: String(error) }),
        );
        setLoadError("无法加载乐谱文件");
        setIsLoading(false);
      }),
    );

    // 通过 fetch 获取二进制数据再传给 alphaTab
    let cancelled = false;
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (!cancelled) api.load(new Uint8Array(buffer));
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(
            JSON.stringify({
              message: "guitar pro file fetch failed",
              url: fileUrl,
              error: String(err),
            }),
          );
          setLoadError("无法下载乐谱文件");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => fn());
      if (ibeamCleanupRef.current) {
        ibeamCleanupRef.current();
        ibeamCleanupRef.current = null;
      }
      api.destroy();
      apiRef.current = null;
      // 停止伴奏音频
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, fileUrl, fileName]);

  // ────────────────────────────────────────────────────
  // 快捷键: Space 播放/暂停, Esc 关闭
  // ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === " " && isPlayerReady) {
        e.preventDefault();
        apiRef.current?.playPause();
      } else if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isPlayerReady, handleClose]);

  // ────────────────────────────────────────────────────
  // 操作回调
  // ────────────────────────────────────────────────────

  const handlePlayPause = useCallback(() => apiRef.current?.playPause(), []);
  const handleStop = useCallback(() => {
    apiRef.current?.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // 速度
  const handleSpeedChange = useCallback((s: number) => {
    if (!apiRef.current) return;
    apiRef.current.playbackSpeed = s;
    if (audioRef.current) audioRef.current.playbackRate = s;
    setSpeed(s);
  }, []);

  // 主音量
  const handleVolumeChange = useCallback((v: number) => {
    if (!apiRef.current) return;
    apiRef.current.masterVolume = v;
    setVolume(v);
    setIsMuted(v === 0);
    if (v > 0) prevVolumeRef.current = v;
  }, []);

  const handleToggleMute = useCallback(() => {
    if (!apiRef.current) return;
    if (isMuted) {
      const restore = prevVolumeRef.current || DEFAULT_MASTER_VOLUME;
      apiRef.current.masterVolume = restore;
      setVolume(restore);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = volume;
      apiRef.current.masterVolume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // 循环
  const handleToggleLoop = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.isLooping = !isLooping;
    setIsLooping(!isLooping);
  }, [isLooping]);

  // 节拍预备
  const handleToggleCountIn = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.countInVolume = countInEnabled ? 0 : 1;
    setCountInEnabled(!countInEnabled);
  }, [countInEnabled]);

  // 节拍器
  const handleToggleMetronome = useCallback(() => {
    if (!apiRef.current) return;
    apiRef.current.metronomeVolume = metronomeEnabled ? 0 : 1;
    setMetronomeEnabled(!metronomeEnabled);
  }, [metronomeEnabled]);

  // 进度跳转
  const handleSeek = useCallback(
    (val: number) => {
      if (apiRef.current && totalTime > 0) {
        const ms = (val / 100) * totalTime;
        apiRef.current.timePosition = ms;
        if (audioRef.current) audioRef.current.currentTime = ms / 1000;
      }
    },
    [totalTime],
  );

  // 显示模式
  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    if (!apiRef.current) return;
    const cfg = DISPLAY_MODES.find((d) => d.value === mode);
    if (!cfg) return;
    apiRef.current.settings.display.staveProfile = cfg.profile;
    apiRef.current.updateSettings();
    apiRef.current.render();
    setDisplayMode(mode);
    setShowDisplayMenu(false);
  }, []);

  // 缩放
  const handleZoomIn = useCallback(() => {
    const idx = ZOOM_STEPS.findIndex((z) => z > scale);
    if (idx < 0) return;
    const next = ZOOM_STEPS[idx];
    if (apiRef.current) {
      apiRef.current.settings.display.scale = next;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
    setScale(next);
  }, [scale]);

  const handleZoomOut = useCallback(() => {
    const reversed = [...ZOOM_STEPS].reverse();
    const idx = reversed.findIndex((z) => z < scale);
    if (idx < 0) return;
    const next = reversed[idx];
    if (apiRef.current) {
      apiRef.current.settings.display.scale = next;
      apiRef.current.updateSettings();
      apiRef.current.render();
    }
    setScale(next);
  }, [scale]);

  // 轨道 — 渲染可见性
  const handleTrackToggle = useCallback(
    (trackIndex: number) => {
      if (!apiRef.current?.score) return;
      const updated = tracks.map((t) =>
        t.index === trackIndex ? { ...t, isSelected: !t.isSelected } : t,
      );
      if (updated.every((t) => !t.isSelected)) return;
      setTracks(updated);
      const selected = updated
        .filter((t) => t.isSelected)
        .map((t) => apiRef.current!.score!.tracks[t.index]);
      apiRef.current.renderTracks(selected);
    },
    [tracks],
  );

  // 轨道 — 静音
  const handleTrackMute = useCallback(
    (trackIndex: number) => {
      if (!apiRef.current?.score) return;
      const cur = tracks.find((t) => t.index === trackIndex);
      if (!cur) return;
      const newMuted = !cur.isMuted;
      const track = apiRef.current.score.tracks[trackIndex];
      apiRef.current.changeTrackMute([track], newMuted);
      setTracks((prev) =>
        prev.map((t) =>
          t.index === trackIndex ? { ...t, isMuted: newMuted } : t,
        ),
      );
    },
    [tracks],
  );

  // 轨道 — 独奏
  const handleTrackSolo = useCallback(
    (trackIndex: number) => {
      if (!apiRef.current?.score) return;
      const cur = tracks.find((t) => t.index === trackIndex);
      if (!cur) return;
      const newSolo = !cur.isSolo;
      const track = apiRef.current.score.tracks[trackIndex];
      apiRef.current.changeTrackSolo([track], newSolo);
      setTracks((prev) =>
        prev.map((t) =>
          t.index === trackIndex ? { ...t, isSolo: newSolo } : t,
        ),
      );
    },
    [tracks],
  );

  // 轨道 — 音量
  const handleTrackVolume = useCallback(
    (trackIndex: number, newVol: number) => {
      if (!apiRef.current?.score) return;
      const track = apiRef.current.score.tracks[trackIndex];
      apiRef.current.changeTrackVolume([track], newVol);
      setTracks((prev) =>
        prev.map((t) =>
          t.index === trackIndex ? { ...t, volume: newVol } : t,
        ),
      );
    },
    [],
  );

  // ── 伴奏音频轨道 ──

  /** 加载本地音频文件作为伴奏 */
  const handleLoadAudioTrack = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // 释放之前的 URL
      if (audioTrackUrl) URL.revokeObjectURL(audioTrackUrl);
      const url = URL.createObjectURL(file);
      setAudioTrackUrl(url);
      setAudioTrackName(file.name);

      // 创建或复用 audio 元素
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.volume = audioVolume;
      audioRef.current.muted = audioMuted;
      audioRef.current.load();

      // 如果正在播放，同步开始
      if (isPlaying && apiRef.current) {
        audioRef.current.currentTime = currentTime / 1000;
        audioRef.current.play().catch(() => {});
      }

      // 清理 input
      if (audioInputRef.current) audioInputRef.current.value = "";
    },
    [audioTrackUrl, audioVolume, audioMuted, isPlaying, currentTime],
  );

  /** 移除伴奏音轨 */
  const handleRemoveAudioTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (audioTrackUrl) URL.revokeObjectURL(audioTrackUrl);
    setAudioTrackUrl(null);
    setAudioTrackName("");
  }, [audioTrackUrl]);

  /** 调节伴奏音量 */
  const handleAudioVolumeChange = useCallback((v: number) => {
    if (audioRef.current) audioRef.current.volume = Math.min(v, 1);
    setAudioVolume(v);
    setAudioMuted(v === 0);
  }, []);

  /** 伴奏静音 */
  const handleToggleAudioMute = useCallback(() => {
    if (audioRef.current) audioRef.current.muted = !audioMuted;
    setAudioMuted(!audioMuted);
  }, [audioMuted]);

  // ── 派生值 ──
  const progress = totalTime > 0 ? (currentTime / totalTime) * 100 : 0;
  const currentDisplayLabel =
    DISPLAY_MODES.find((d) => d.value === displayMode)?.label ?? "";
  const VolumeIcon =
    isMuted || volume === 0
      ? VolumeX
      : volume < MAX_MASTER_VOLUME * 0.3
        ? Volume1
        : Volume2;

  if (!isOpen) return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[200] gp-viewer-root overflow-hidden" data-state={viewerState}>
      {/* 注入拍光标样式 */}
      <style>{ALPHATAB_CURSOR_STYLES}</style>

      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 gp-viewer-backdrop"
        onClick={handleClose}
      />

      {/* 查看器面板 */}
      <div className={`gp-viewer-panel absolute flex flex-col bg-background overflow-hidden ${
        isFullscreen
          ? "inset-0"
          : "top-[4%] left-[8%] right-[8%] bottom-[4%] rounded-2xl shadow-2xl"
      }`}>

      {/* ════════════════════════════════════════════════
          顶部工具栏
          ════════════════════════════════════════════════ */}
      <div className="h-12 border-b border-border/20 flex items-center justify-between px-4 shrink-0 bg-background/95 backdrop-blur-sm gp-viewer-content">
        {/* 左：曲目信息 */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-accent/10">
            <Music size={14} className="text-accent" />
          </div>
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-sm font-medium truncate max-w-[280px]">
              {songTitle || fileName}
            </span>
            {songArtist && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[160px] hidden sm:inline">
                {songArtist}
              </span>
            )}
          </div>
        </div>

        {/* 右：显示控制 */}
        <div className="flex items-center gap-0.5">
          {/* 谱面模式 */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDisplayMenu((v) => !v)}
              className="rounded-lg h-8 gap-1 text-[10px] uppercase tracking-wider font-mono px-2.5"
            >
              <span className="hidden sm:inline">{currentDisplayLabel}</span>
              <span className="sm:hidden">谱面</span>
              <ChevronDown size={10} />
            </Button>
            {showDisplayMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDisplayMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg min-w-[130px] overflow-hidden">
                  {DISPLAY_MODES.map((m) => (
                    <button
                      key={m.value}
                      className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${
                        displayMode === m.value
                          ? "text-foreground bg-accent/5"
                          : "text-muted-foreground hover:bg-accent/5"
                      }`}
                      onClick={() => handleDisplayModeChange(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 缩放 */}
          <div className="hidden sm:flex items-center border-l border-border/20 ml-1 pl-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={scale <= ZOOM_STEPS[0]}
              className="rounded-lg h-7 w-7"
              title="缩小">
              <ZoomOut size={12} />
            </Button>
            <button
              className="text-[10px] font-mono w-10 text-center tabular-nums text-muted-foreground select-none hover:text-foreground transition-colors"
              onClick={() => {
                // 重置为 100%
                if (apiRef.current) {
                  apiRef.current.settings.display.scale = 1.0;
                  apiRef.current.updateSettings();
                  apiRef.current.render();
                }
                setScale(1.0);
              }}
              title="重置缩放"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              className="rounded-lg h-7 w-7"
              title="放大">
              <ZoomIn size={12} />
            </Button>
          </div>

          {/* 全屏切换 + 关闭 */}
          <div className="border-l border-border/20 ml-1 pl-1 flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFullscreen}
              className="rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
              title={isFullscreen ? "退出全屏" : "全屏"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="关闭 (Esc)"
            >
              <X size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          乐谱渲染区域
          ════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 relative overflow-auto custom-scrollbar gp-viewer-content">
        {/* 加载中 */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                解析乐谱中...
              </span>
            </div>
          </div>
        )}

        {/* 错误 */}
        {loadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
              <Music
                size={48}
                strokeWidth={1}
                className="text-muted-foreground opacity-30"
              />
              <p className="text-sm font-mono text-muted-foreground">
                {loadError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="rounded-lg font-mono text-xs"
              >
                关闭
              </Button>
            </div>
          </div>
        )}

        {/* alphaTab 渲染容器 */}
        <div
          ref={containerRef}
          className="w-full min-h-full"
          style={{ position: "relative" }}
        />
      </div>

      {/* ════════════════════════════════════════════════
          轨道面板（浮动在底栏上方）
          ════════════════════════════════════════════════ */}
      {showTrackPanel && (
        <>
          <div
            className="absolute inset-0 z-[201]"
            onClick={() => setShowTrackPanel(false)}
          />
          <div className="absolute bottom-14 right-3 z-[202] w-80 max-h-72 overflow-y-auto bg-background border border-border rounded-xl shadow-xl">
            <div className="px-3 py-2 border-b border-border/30">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                轨道管理
              </span>
            </div>
            <div className="p-1.5">
              {tracks.map((track) => (
                <div
                  key={track.index}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/5 transition-colors"
                >
                  {/* 渲染可见性 */}
                  <button
                    className={`shrink-0 w-3.5 h-3.5 border flex items-center justify-center transition-colors ${
                      track.isSelected
                        ? "bg-foreground border-foreground"
                        : "border-muted-foreground/50"
                    }`}
                    onClick={() => handleTrackToggle(track.index)}
                    title="显示 / 隐藏"
                  >
                    {track.isSelected && (
                      <span className="text-background text-[8px] leading-none">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* 名称 */}
                  <span className="flex-1 text-xs font-mono truncate min-w-0">
                    {track.name}
                  </span>

                  {/* Solo */}
                  <button
                    className={`shrink-0 text-[9px] font-mono font-bold w-5 h-5 flex items-center justify-center transition-colors ${
                      track.isSolo
                        ? "text-amber-500 bg-amber-500/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                    onClick={() => handleTrackSolo(track.index)}
                    title="独奏"
                  >
                    S
                  </button>

                  {/* Mute */}
                  <button
                    className={`shrink-0 text-[9px] font-mono font-bold w-5 h-5 flex items-center justify-center transition-colors ${
                      track.isMuted
                        ? "text-red-500 bg-red-500/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                    onClick={() => handleTrackMute(track.index)}
                    title="静音"
                  >
                    M
                  </button>

                  {/* 单轨音量 */}
                  <div className="shrink-0 w-16">
                    <SliderTrack
                      value={track.volume}
                      max={16}
                      onChange={(v) => handleTrackVolume(track.index, v)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── 伴奏音频轨 ── */}
            <div className="border-t border-border/30 px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  伴奏音轨
                </span>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleLoadAudioTrack}
                />
                <button
                  className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  onClick={() => audioInputRef.current?.click()}
                >
                  <Upload size={10} />
                  添加
                </button>
              </div>

              {audioTrackUrl ? (
                <div className="flex items-center gap-2 px-2 py-1.5 bg-accent/5">
                  <Mic size={12} className="shrink-0 text-purple-500" />
                  <span className="flex-1 text-xs font-mono truncate min-w-0">
                    {audioTrackName}
                  </span>
                  <button
                    className={`shrink-0 text-[9px] font-mono font-bold w-5 h-5 flex items-center justify-center transition-colors ${
                      audioMuted
                        ? "text-red-500 bg-red-500/10"
                        : "text-muted-foreground/50 hover:text-muted-foreground"
                    }`}
                    onClick={handleToggleAudioMute}
                    title="静音伴奏"
                  >
                    M
                  </button>
                  <div className="shrink-0 w-16">
                    <SliderTrack
                      value={audioVolume}
                      max={1}
                      onChange={handleAudioVolumeChange}
                    />
                  </div>
                  <button
                    className="shrink-0 text-muted-foreground/50 hover:text-red-500 transition-colors"
                    onClick={handleRemoveAudioTrack}
                    title="移除伴奏"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="text-[9px] font-mono text-muted-foreground/50 px-2 py-1.5">
                  未加载伴奏音轨 · 支持 MP3 / WAV / OGG
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════
          底部播放控制栏
          ════════════════════════════════════════════════ */}
      <div className="h-14 border-t border-border/20 flex items-center gap-1.5 px-3 shrink-0 bg-background/95 backdrop-blur-sm relative gp-viewer-content">
        {/* ── 播放 / 停止 ── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          disabled={!isPlayerReady}
          className="rounded-full h-9 w-9 bg-accent/10 hover:bg-accent/20 text-accent disabled:opacity-30 transition-all"
          title={isPlaying ? "暂停 (Space)" : "播放 (Space)"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleStop}
          disabled={!isPlayerReady}
          className="rounded-lg h-8 w-8"
          title="停止"
        >
          <Square size={13} />
        </Button>

        <div className="w-px h-5 bg-border/20 mx-0.5" />

        {/* ── 循环 / 预备 / 节拍器 ── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleLoop}
          className={`rounded-lg h-8 w-8 transition-colors ${
            isLooping
              ? "text-accent bg-accent/10"
              : "text-muted-foreground"
          }`}
          title="循环播放">
          <Repeat size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleCountIn}
          className={`rounded-lg h-8 w-8 transition-colors ${
            countInEnabled
              ? "text-accent bg-accent/10"
              : "text-muted-foreground"
          }`}
          title="节拍预备（播放前倒数）">
          <Timer size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleMetronome}
          className={`rounded-lg h-8 w-8 transition-colors ${
            metronomeEnabled
              ? "text-accent bg-accent/10"
              : "text-muted-foreground"
          }`}
          title="节拍器">
          <Activity size={13} />
        </Button>

        <div className="w-px h-5 bg-border/20 mx-0.5" />

        {/* ── 时间 + 进度条 ── */}
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0 w-11 text-right select-none">
          {formatTime(currentTime)}
        </span>

        <div className="flex-1 mx-1.5 min-w-[60px]">
          <SliderTrack
            value={progress}
            max={100}
            onChange={handleSeek}
            disabled={!isPlayerReady}
          />
        </div>

        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0 w-11 select-none">
          {formatTime(totalTime)}
        </span>

        <div className="w-px h-5 bg-border/20 mx-0.5" />

        {/* ── 速度 ── */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const idx = SPEED_OPTIONS.indexOf(speed);
              if (idx > 0) handleSpeedChange(SPEED_OPTIONS[idx - 1]);
            }}
            disabled={speed <= SPEED_OPTIONS[0]}
            className="rounded-lg h-7 w-7"
            title="减速">
            <Minus size={11} />
          </Button>
          <span className="text-[10px] font-mono w-9 text-center tabular-nums select-none">
            {speed}x
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const idx = SPEED_OPTIONS.indexOf(speed);
              if (idx < SPEED_OPTIONS.length - 1)
                handleSpeedChange(SPEED_OPTIONS[idx + 1]);
            }}
            disabled={speed >= SPEED_OPTIONS[SPEED_OPTIONS.length - 1]}
            className="rounded-lg h-7 w-7"
            title="加速">
            <Plus size={11} />
          </Button>
        </div>

        <div className="w-px h-5 bg-border/20 mx-0.5 hidden sm:block" />

        {/* ── 主音量 ── */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMute}
            className="rounded-lg h-8 w-8"
            title={isMuted ? "取消静音" : "静音"}
          >
            <VolumeIcon size={14} />
          </Button>
          <div className="w-20 hidden sm:block">
            <SliderTrack
              value={volume}
              max={MAX_MASTER_VOLUME}
              onChange={handleVolumeChange}
            />
          </div>
        </div>

        {/* ── 轨道按钮 ── */}
        <div className="w-px h-5 bg-border/20 mx-0.5" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTrackPanel((v) => !v)}
          className={`rounded-lg h-8 gap-1 text-[10px] uppercase tracking-wider font-mono px-2 ${
            showTrackPanel
              ? "text-foreground bg-accent/10"
              : audioTrackUrl
                ? "text-purple-500"
                : "text-muted-foreground"
          }`}
          title="轨道管理 / 伴奏音轨"
        >
          <ListMusic size={13} />
          <span className="hidden sm:inline">轨道</span>
          {audioTrackUrl && (
            <span className="w-1.5 h-1.5 bg-purple-500 shrink-0" />
          )}
        </Button>
      </div>
      </div>{/* end gp-viewer-panel */}
    </div>,
    document.body,
  );
}
