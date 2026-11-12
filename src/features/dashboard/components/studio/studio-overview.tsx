// PROTOTYPE (throwaway): the Admin redesign, round 3. Never merge.
//
// The overview as cards on the canvas: what to write next, how the site is
// doing, and what waits for an answer. Replies, "handled" and Friend Link
// reviews are stubs here: rows leave the list, nothing is saved.
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  CornerDownRight,
  FileText,
  Link2,
  MessageSquare,
  Moon,
  Pin,
  Plus,
  Reply,
  Sun,
  Sunrise,
  Sunset,
  X,
} from "lucide-react";
import {
  type PointerEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useCreatePost } from "@/components/admin/studio/studio-shell";
import type {
  DashboardComment,
  DashboardOverview,
} from "@/features/dashboard/dashboard.schema";
import { dashboardOverviewQuery } from "@/features/dashboard/queries";
import { buildWritingCalendar } from "@/features/dashboard/writing-calendar";
import { formatTimeAgo } from "@/lib/utils";
import {
  formatCount,
  formatDay,
  formatMonth,
  formatToday,
  formatWindow,
} from "../format";
import { greeting } from "../greeting";
import { stubDailySeries, TrendChart } from "./trend-chart";
import "./studio-overview.css";

const HOUR_MS = 3_600_000;
const order = (i: number) => ({ "--i": i }) as object;

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - t) ** 4)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}

function Count({ value }: { value: number }) {
  return <>{formatCount(useCountUp(value))}</>;
}

function hueOf(text: string) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function Face({
  name,
  image,
  square,
}: {
  name: string;
  image: string | null;
  square?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`so-face ${square ? "is-square" : ""}`}
      style={{ "--h": hueOf(name) } as object}
      aria-hidden
    >
      {image && !broken ? (
        <img src={image} alt="" onError={() => setBroken(true)} />
      ) : (
        name.trim().slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function Card({
  title,
  count,
  sub,
  link,
  i,
  children,
}: {
  title: string;
  count?: number;
  sub?: string;
  link?: ReactNode;
  i: number;
  children: ReactNode;
}) {
  return (
    <section className="so-card so-rise" style={order(i)}>
      <header className="so-card-head">
        <h2 className="so-card-title">{title}</h2>
        {count ? <span className="so-count">{count}</span> : null}
        {sub ? <span className="so-card-sub">{sub}</span> : null}
        {link}
      </header>
      {children}
    </section>
  );
}

export function StudioOverview() {
  const { data } = useSuspenseQuery({
    ...dashboardOverviewQuery,
    refetchOnMount: "always",
  });
  const { session } = useRouteContext({ from: "/admin" });
  const now = new Date();
  const hour = now.getHours();
  const TimeIcon =
    hour < 5
      ? Moon
      : hour < 9
        ? Sunrise
        : hour < 17
          ? Sun
          : hour < 20
            ? Sunset
            : Moon;

  return (
    <div className="so-scroll">
      <div className="so">
        <header className="so-head so-rise" style={order(0)}>
          <div>
            <p className="so-date">
              <TimeIcon size={14} />
              {formatToday(now)}
            </p>
            <h1 className="so-hello">{greeting(session.user.name, hour)}</h1>
          </div>
          <Notices data={data} />
        </header>

        <div className="so-grid">
          <div className="so-col">
            <Hero data={data} />
            <Pulse data={data} />
            <div className="so-two">
              <Popular popularity={data.popularity} />
              <Writing activity={data.writingActivity} />
            </div>
          </div>
          <div className="so-col">
            <Comments
              comments={data.unrepliedComments.items}
              total={data.unrepliedComments.total}
            />
            <FriendLinks pending={data.pendingFriendLinks} />
            <Recent posts={data.recentPosts} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Notices({ data }: { data: DashboardOverview }) {
  const notices: Array<{
    key: string;
    text: string;
    to?: string;
    href?: string;
  }> = [];
  if (data.update)
    notices.push({
      key: "update",
      text: `新版本 ${data.update.latestVersion} 可用`,
      href: data.update.releaseUrl,
    });
  if (data.adminEmailNeedsSetup)
    notices.push({
      key: "email",
      text: "通知邮箱尚未设置",
      to: "/admin/settings/notifications",
    });
  if (data.popularityAlert)
    notices.push({
      key: "popularity",
      text:
        data.popularityAlert === "failed" ? "热度同步失败" : "热度数据已过期",
      to: "/admin/settings/maintenance",
    });
  if (data.defaultSiteIdentity)
    notices.push({
      key: "identity",
      text: "站点信息仍是默认值",
      to: "/admin/settings/site",
    });
  if (notices.length === 0) return null;
  return (
    <div className="so-notices">
      {notices.map((notice) =>
        notice.href ? (
          <a
            key={notice.key}
            className="so-notice"
            href={notice.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <i />
            {notice.text}
            <ChevronRight size={14} />
          </a>
        ) : (
          <Link key={notice.key} className="so-notice" to={notice.to}>
            <i />
            {notice.text}
            <ChevronRight size={14} />
          </Link>
        ),
      )}
    </div>
  );
}

/* ── Hero: the next thing to write ── */

function Hero({ data }: { data: DashboardOverview }) {
  const create = useCreatePost();
  const draft = data.latestDraft;
  const others = data.stats.draftPosts - (draft ? 1 : 0);

  return (
    <section
      className="so-hero so-rise"
      style={order(1)}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          "--mx",
          `${event.clientX - box.left}px`,
        );
        event.currentTarget.style.setProperty(
          "--my",
          `${event.clientY - box.top}px`,
        );
      }}
    >
      <span className="so-hero-glow" />
      <span className="so-hero-spot" />
      <span className="so-hero-glow is-b" />
      <span className="so-hero-grain" />
      <div className="so-hero-main">
        <p className="so-eyebrow">
          <i />
          {draft ? "继续写作" : "开始写作"}
        </p>
        <h2 className="so-hero-title">
          {draft ? draft.title.trim() || "无标题" : "今天想写点什么？"}
        </h2>
        <p className="so-hero-meta">
          {draft
            ? [
                "草稿",
                `${formatTimeAgo(draft.updatedAt)}编辑`,
                others > 0 ? `另有 ${others} 篇草稿` : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : `已发布 ${formatCount(data.stats.publishedPosts)} 篇文章`}
        </p>
        <div className="so-hero-actions">
          {draft ? (
            <Link
              className="so-btn is-light"
              to="/admin/posts/edit/$id"
              params={{ id: String(draft.id) }}
            >
              继续写
              <ArrowRight size={16} />
            </Link>
          ) : null}
          <button
            type="button"
            className={`so-btn ${draft ? "is-ghost" : "is-light"}`}
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            <Plus size={16} />
            新建文章
          </button>
        </div>
      </div>
      <WeekBars activity={data.writingActivity} />
    </section>
  );
}

function WeekBars({
  activity,
}: {
  activity: DashboardOverview["writingActivity"];
}) {
  const days = useMemo(() => {
    const today = new Date();
    const counts = new Map<string, number>();
    for (const { hour, count } of activity) {
      const key = new Date(hour * HOUR_MS).toDateString();
      counts.set(key, (counts.get(key) ?? 0) + count);
    }
    const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "narrow" });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6 + index,
      );
      return {
        key: date.getTime(),
        name: weekday.format(date),
        count: counts.get(date.toDateString()) ?? 0,
        today: index === 6,
      };
    });
  }, [activity]);
  const max = Math.max(1, ...days.map((day) => day.count));
  const active = days.filter((day) => day.count > 0).length;

  return (
    <div className="so-week" aria-label={`近 7 天有 ${active} 天写作`}>
      <p className="so-week-label">
        近 7 天写作 <b>{active}</b> 天
      </p>
      <div className="so-week-bars" aria-hidden>
        {days.map((day, index) => (
          <span
            key={day.key}
            className="so-week-day"
            data-on={day.count > 0 ? "" : undefined}
            data-today={day.today ? "" : undefined}
          >
            <i
              className="so-week-bar"
              style={{ "--v": day.count / max, "--i": index } as object}
            />
            {day.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Pulse: views of the window, with the site's counts beside ── */

function Pulse({ data }: { data: DashboardOverview }) {
  const { popularity, stats } = data;
  const hasViews =
    popularity.windowStart !== null &&
    popularity.windowEnd !== null &&
    (popularity.state === "ready" || popularity.state === "expired");
  const series = useMemo(
    () =>
      hasViews
        ? stubDailySeries(
            popularity.totalViews,
            popularity.windowStart!,
            popularity.windowEnd!,
          )
        : [],
    [
      hasViews,
      popularity.totalViews,
      popularity.windowStart,
      popularity.windowEnd,
    ],
  );

  return (
    <section className="so-card so-pulse so-rise" style={order(2)}>
      <div className="so-pulse-side">
        <p className="so-kicker">近 30 天访问</p>
        <p className="so-big">
          {hasViews ? <Count value={popularity.totalViews} /> : "—"}
        </p>
        <p className="so-range">
          {hasViews
            ? formatWindow(popularity.windowStart!, popularity.windowEnd!)
            : "尚未接入访问统计"}
        </p>
        <div className="so-minis">
          <Link className="so-mini" to="/admin/posts">
            <FileText size={15} strokeWidth={1.7} />
            文章
            {stats.draftPosts > 0 ? (
              <small>{stats.draftPosts} 篇草稿</small>
            ) : null}
            <b>
              <Count value={stats.publishedPosts} />
            </b>
          </Link>
          <Link className="so-mini" to="/admin/comments">
            <MessageSquare size={15} strokeWidth={1.7} />
            评论
            {stats.recentComments > 0 ? (
              <small>近 7 天 +{stats.recentComments}</small>
            ) : null}
            <b>
              <Count value={stats.comments} />
            </b>
          </Link>
          <Link className="so-mini" to="/admin/friend-links">
            <Link2 size={15} strokeWidth={1.7} />
            友链
            {stats.pendingFriendLinks > 0 ? (
              <small data-alert>{stats.pendingFriendLinks} 个待审核</small>
            ) : null}
            <b>
              <Count value={stats.approvedFriendLinks} />
            </b>
          </Link>
        </div>
      </div>
      <div className="so-pulse-main">
        {hasViews ? (
          <>
            <p className="so-pulse-top">
              <span className="so-legend">
                <i />
                每日访问
              </span>
              <span
                className="so-stub"
                title="快照目前只有总数，按日数据需要新增"
              >
                示意数据
              </span>
            </p>
            <TrendChart series={series} />
          </>
        ) : (
          <p className="so-chart-none">接入 Umami 后，这里显示每日访问趋势</p>
        )}
      </div>
    </section>
  );
}

/* ── Popular Posts ── */

function Popular({
  popularity,
}: {
  popularity: DashboardOverview["popularity"];
}) {
  const posts = popularity.topPosts.slice(0, 5);
  const max = Math.max(1, ...posts.map((post) => post.views));
  return (
    <Card title="热门文章" sub="近 30 天" i={3}>
      {posts.length === 0 ? (
        <p className="so-empty">还没有访问数据</p>
      ) : (
        <ol className="so-rank">
          {posts.map((post, index) => (
            <li key={post.id}>
              <Link
                to="/admin/posts/edit/$id"
                params={{ id: String(post.id) }}
                style={{ "--share": post.views / max, "--i": index } as object}
              >
                <span className="so-rank-no">{index + 1}</span>
                <span className="so-rank-title">{post.title}</span>
                <span className="so-rank-views">{formatCount(post.views)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/* ── Writing record ── */

function Writing({
  activity,
}: {
  activity: DashboardOverview["writingActivity"];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [weeks, setWeeks] = useState(20);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () =>
      setWeeks(
        Math.min(26, Math.max(10, Math.floor((wrap.clientWidth + 3) / 15.5))),
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const half = useMemo(
    () => buildWritingCalendar(activity, new Date()),
    [activity],
  );
  const calendar = useMemo(
    () => buildWritingCalendar(activity, new Date(), weeks),
    [activity, weeks],
  );
  const months = calendar.months.filter(
    (month, index, all) =>
      index === 0 || month.week - (all[index - 1]?.week ?? 0) >= 3,
  );

  const showTip = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-label]",
    );
    const wrap = wrapRef.current;
    if (!cell || !wrap) return setTip(null);
    const box = cell.getBoundingClientRect();
    const frame = wrap.getBoundingClientRect();
    const x = box.left + box.width / 2 - frame.left;
    setTip({
      text: cell.dataset.label ?? "",
      x: Math.min(Math.max(x, 70), frame.width - 70),
      y: box.top - frame.top,
    });
  };

  return (
    <Card title="写作记录" sub="近半年" i={4}>
      <div className="so-heat">
        <div className="so-heat-facts">
          <p className="so-heat-fact">
            <b>
              <Count value={half.activeDays} />
              <small>天</small>
            </b>
            <span>有写作</span>
          </p>
          <p className="so-heat-fact">
            <b>
              <Count value={half.longestStreak} />
              <small>天</small>
            </b>
            <span>最长连续</span>
          </p>
          <p className="so-heat-fact">
            <b>
              <Count value={half.total} />
              <small>次</small>
            </b>
            <span>保存</span>
          </p>
        </div>
        <div
          ref={wrapRef}
          className="so-heat-wrap"
          style={{ "--weeks": calendar.weeks.length } as object}
        >
          <div className="so-heat-months" aria-hidden>
            {months.map((month) => (
              <span
                key={month.week}
                style={{ gridColumnStart: month.week + 1 }}
              >
                {formatMonth(month.date)}
              </span>
            ))}
          </div>
          <div
            className="so-heat-grid"
            onPointerOver={showTip}
            onPointerLeave={() => setTip(null)}
          >
            {calendar.weeks.flat().map((day) => {
              const label = `${formatDay(day.date)}${day.count > 0 ? ` · ${day.count} 次保存` : " · 没有写作"}`;
              return day.future ? (
                <span
                  key={day.date.getTime()}
                  className="so-heat-cell"
                  data-future=""
                />
              ) : (
                <span
                  key={day.date.getTime()}
                  className="so-heat-cell"
                  role="img"
                  aria-label={label}
                  data-label={label}
                  data-level={day.level}
                />
              );
            })}
          </div>
          {tip ? (
            <div className="so-heat-tip" style={{ left: tip.x, top: tip.y }}>
              {tip.text}
            </div>
          ) : null}
        </div>
        <div className="so-heat-foot" aria-hidden>
          少
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="so-heat-cell" data-level={level} />
          ))}
          多
        </div>
      </div>
    </Card>
  );
}

/* ── Rows that leave: a set of ids on their way out, then gone ── */

function useLeaving() {
  const [leaving, setLeaving] = useState<ReadonlySet<number>>(new Set());
  const [gone, setGone] = useState<ReadonlySet<number>>(new Set());
  const dismiss = (id: number) => {
    setLeaving((current) => new Set(current).add(id));
    window.setTimeout(
      () => setGone((current) => new Set(current).add(id)),
      380,
    );
  };
  return { leaving, gone, dismiss };
}

/* ── Unreplied Comments ── */

function Comments({
  comments,
  total,
}: {
  comments: Array<DashboardComment>;
  total: number;
}) {
  const { leaving, gone, dismiss } = useLeaving();
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const shown = comments.filter((comment) => !gone.has(comment.id));
  const left = total - gone.size;

  return (
    <Card
      title="待回复评论"
      count={left}
      i={3}
      link={
        left > 0 ? (
          <Link className="so-card-link" to="/admin/comments">
            全部
            <ChevronRight size={14} />
          </Link>
        ) : undefined
      }
    >
      {shown.length === 0 ? (
        <p className="so-empty">
          <CheckCheck size={20} />
          {left > 0 ? `还有 ${left} 条，在评论页里处理` : "都回复完了"}
        </p>
      ) : (
        <ul className="so-list">
          {shown.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              leaving={leaving.has(comment.id)}
              replying={replyingId === comment.id}
              onReply={() =>
                setReplyingId(replyingId === comment.id ? null : comment.id)
              }
              onDone={(message) => {
                setReplyingId(null);
                dismiss(comment.id);
                toast.success(message, { description: "原型：没有真正保存" });
              }}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function CommentRow({
  comment,
  leaving,
  replying,
  onReply,
  onDone,
}: {
  comment: DashboardComment;
  leaving: boolean;
  replying: boolean;
  onReply: () => void;
  onDone: (message: string) => void;
}) {
  const name = comment.userName || "匿名访客";
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (replying) boxRef.current?.focus({ preventScroll: true });
  }, [replying]);

  return (
    <li className="so-item" data-leaving={leaving ? "" : undefined}>
      <div>
        <div className="so-cmt">
          <Face name={name} image={comment.userImage} />
          <div className="so-cmt-body">
            <p className="so-cmt-by">
              <b>{name}</b>
              <time>{formatTimeAgo(comment.createdAt)}</time>
            </p>
            <p className="so-cmt-text">{comment.snippet}</p>
            <p className="so-cmt-src">
              <CornerDownRight size={13} />
              <span>{comment.postTitle ?? comment.momentTitle}</span>
            </p>
          </div>
          <div className="so-acts">
            <button type="button" className="so-act" onClick={onReply}>
              <Reply size={14} />
              回复
            </button>
            <button
              type="button"
              className="so-act is-icon"
              title="标为已处理"
              aria-label="标为已处理"
              onClick={() => onDone("已标为已处理")}
            >
              <Check size={15} />
            </button>
          </div>
        </div>
        <div className="so-reply" data-open={replying ? "" : undefined}>
          <div>
            <div className="so-reply-box">
              <textarea
                ref={boxRef}
                value={text}
                tabIndex={replying ? 0 : -1}
                placeholder={`回复 ${name}…`}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") onReply();
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey) &&
                    text.trim()
                  )
                    onDone("回复已发送");
                }}
              />
              <div className="so-reply-foot">
                <span>Ctrl + Enter 发送</span>
                <button
                  type="button"
                  className="so-act"
                  tabIndex={replying ? 0 : -1}
                  onClick={onReply}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="so-send"
                  tabIndex={replying ? 0 : -1}
                  disabled={!text.trim()}
                  onClick={() => onDone("回复已发送")}
                >
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ── Friend Links waiting for review ── */

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function FriendLinks({
  pending,
}: {
  pending: DashboardOverview["pendingFriendLinks"];
}) {
  const { leaving, gone, dismiss } = useLeaving();
  const shown = pending.items.filter((item) => !gone.has(item.id));
  const left = pending.items.length + pending.remainingCount - gone.size;
  if (pending.items.length === 0) return null;

  return (
    <Card
      title="友链申请"
      count={left}
      i={4}
      link={
        <Link className="so-card-link" to="/admin/friend-links">
          全部
          <ChevronRight size={14} />
        </Link>
      }
    >
      {shown.length === 0 ? (
        <p className="so-empty">
          <CheckCheck size={20} />
          {left > 0 ? `还有 ${left} 个，在友链页里审核` : "都审核完了"}
        </p>
      ) : (
        <ul className="so-list">
          {shown.slice(0, 3).map((item) => (
            <li
              key={item.id}
              className="so-item"
              data-leaving={leaving.has(item.id) ? "" : undefined}
            >
              <div>
                <div className="so-link">
                  <Face name={item.siteName} image={item.logoUrl} square />
                  <p className="so-link-copy">
                    <b>{item.siteName}</b>
                    <span>{hostOf(item.siteUrl)}</span>
                  </p>
                  <button
                    type="button"
                    className="so-act is-icon"
                    title="拒绝"
                    aria-label={`拒绝 ${item.siteName}`}
                    onClick={() => {
                      dismiss(item.id);
                      toast("已拒绝", { description: "原型：没有真正保存" });
                    }}
                  >
                    <X size={15} />
                  </button>
                  <button
                    type="button"
                    className="so-approve"
                    onClick={() => {
                      dismiss(item.id);
                      toast.success("已通过", {
                        description: "原型：没有真正保存",
                      });
                    }}
                  >
                    <Check size={14} />
                    通过
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ── Posts last edited ── */

function Recent({ posts }: { posts: DashboardOverview["recentPosts"] }) {
  return (
    <Card
      title="最近编辑"
      i={5}
      link={
        <Link className="so-card-link" to="/admin/posts">
          全部文章
          <ChevronRight size={14} />
        </Link>
      }
    >
      {posts.length === 0 ? (
        <p className="so-empty">还没有文章</p>
      ) : (
        <ul className="so-recent">
          {posts.slice(0, 5).map((post) => {
            const state =
              post.status === "draft"
                ? "draft"
                : post.hasUnpublishedChanges
                  ? "changed"
                  : "published";
            return (
              <li key={post.id}>
                <Link
                  to="/admin/posts/edit/$id"
                  params={{ id: String(post.id) }}
                >
                  <i className="so-state" data-state={state} />
                  <span className="so-recent-title">
                    {post.title.trim() || "无标题"}
                  </span>
                  {state === "draft" ? (
                    <span className="so-recent-tag">草稿</span>
                  ) : state === "changed" ? (
                    <span className="so-recent-tag">有修改未发布</span>
                  ) : null}
                  {post.pinnedAt ? <Pin size={13} /> : null}
                  <time>{formatTimeAgo(post.updatedAt)}</time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
