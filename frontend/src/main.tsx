import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  ChevronRight,
  FileText,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";
import { api } from "./api";
import type { Content, Draft, MediaType, Source } from "./types";
import "./style.css";

const names: Record<MediaType, string> = { ARTICLE: "图文", VIDEO: "视频", AUDIO: "音频" };
const status: Record<string, string> = {
  DRAFT: "待分析",
  QUEUED: "排队中",
  RUNNING: "分析中",
  COMPLETED: "分析完成",
  FAILED: "分析失败",
  ARCHIVED: "历史样本",
  NEEDS_SOURCE: "待补全文与类型",
};
const pct = (n: number | null) => (n === null ? "未公开" : (n * 100).toFixed(1) + "%");
const num = (n: number | null) =>
  n === null ? "未公开" : n >= 10000 ? (n / 10000).toFixed(1) + "万" : n.toLocaleString();
const Icon = ({ type }: { type: MediaType }) =>
  type === "VIDEO" ? (
    <Video size={18} />
  ) : type === "AUDIO" ? (
    <AudioLines size={18} />
  ) : (
    <FileText size={18} />
  );
const initial: Draft = {
  title: "",
  mediaType: "ARTICLE",
  category: "旅行",
  audience: "",
  tags: "",
  body: "",
  historical: false,
  impressions: 0,
  clicks: 0,
  engagements: 0,
  completions: 0,
};

function App() {
  const [items, setItems] = useState<Content[]>([]),
    [page, setPage] = useState("overview"),
    [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState(false),
    [historical, setHistorical] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(false),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setItems(await api.list());
      setOnline(true);
    } catch (e) {
      setOnline(false);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => clearInterval(timer);
  }, []);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function newContent(history = false) {
    setHistorical(history);
    setModal(true);
  }
  const current = items.find((c) => c.id === selected);
  const drafts = items.filter((c) => !c.historical),
    history = items.filter((c) => c.historical),
    reports = drafts.filter((c) => c.report);
  const list = (page === "library" ? history : page === "strategy" ? reports : drafts).filter(
    (c) =>
      (filter === "ALL" ||
        (c.source?.verification !== "PENDING_ORIGINAL_AND_TYPE" && c.mediaType === filter)) &&
      [c.title, c.tags, c.category].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const completed = reports.length,
    waiting = drafts.filter((c) => ["DRAFT", "QUEUED", "RUNNING"].includes(c.status)).length;
  function exportReport(c: Content) {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "content-pilot-" + c.id + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={() => {
            setPage("overview");
            setSelected(null);
          }}
        >
          <span className="brand-icon">
            <Layers3 />
          </span>
          <span>
            Content Pilot<small>AI 内容策略平台</small>
          </span>
        </a>
        <div className="workspace">
          C
          <span>
            内容运营工作空间<small>LOCAL WORKSPACE</small>
          </span>
          <ChevronRight size={14} />
        </div>
        <div className="nav-label">工作台</div>
        <nav>
          {(
            [
              ["overview", "内容总览", LayoutDashboard],
              ["library", "高热稿件库", BookOpen],
              ["strategy", "推流策略", TrendingUp],
            ] as const
          ).map(([key, label, Symbol]) => (
            <button
              key={String(key)}
              className={page === key ? "active" : ""}
              onClick={() => {
                setPage(String(key));
                setSelected(null);
                setQuery("");
              }}
            >
              <Symbol size={18} />
              {String(label)}
              {key === "library" && <b>{history.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="lab">
            <FlaskConical size={20} />
            <strong>从经验走向证据</strong>
            <p>
              让每一次内容投放，
              <br />
              都有可追溯的判断依据。
            </p>
          </div>
          <div className="account">
            <span>运</span>
            <div>
              内容运营团队<small>{online ? "本地服务已连接" : "等待后端连接"}</small>
            </div>
            <i className={online ? "dot" : "dot offline"} />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            工作空间 <ChevronRight size={14} />{" "}
            {page === "library" ? "高热稿件库" : page === "strategy" ? "推流策略" : "内容总览"}
            {current && (
              <>
                {" "}
                <ChevronRight size={14} /> 分析报告
              </>
            )}
          </span>
          <span className="top-status">
            <i className={online ? "dot" : "dot offline"} />
            {online ? "系统已连接" : "服务未连接"}
            <span className="avatar">CP</span>
          </span>
        </header>
        <div className="main-inner">
          {error && (
            <div className="alert" role="alert">
              {error}
              <button aria-label="关闭提示" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {current ? (
            <>
              <button className="back" onClick={() => setSelected(null)}>
                ← 返回内容列表
              </button>
              <div className="page-title">
                <div>
                  <div className="eyebrow">CONTENT INTELLIGENCE</div>
                  <h1>{current.title}</h1>
                  <p>
                    {current.source?.verification === "PENDING_ORIGINAL_AND_TYPE"
                      ? "类型待核验"
                      : names[current.mediaType]}{" "}
                    · {current.category} · {status[current.status]}
                    {current.demo ? " · 演示样本" : ""}
                  </p>
                </div>
                <div className="actions">
                  {current.report && (
                    <button className="secondary" onClick={() => exportReport(current)}>
                      <ArrowDownToLine size={16} />
                      导出报告
                    </button>
                  )}
                  {!current.historical && (
                    <button
                      className="primary"
                      disabled={busy || ["QUEUED", "RUNNING"].includes(current.status)}
                      onClick={() => void action(() => api.analyze(current.id))}
                    >
                      <Sparkles size={16} />
                      {current.report ? "重新分析" : "开始分析"}
                    </button>
                  )}
                </div>
              </div>
              {current.source && <SourcePanel source={current.source} />}
              {current.fileName && (
                <div className="asset">
                  <Icon type={current.mediaType} />
                  <a href={`/api/contents/${current.id}/file`}>{current.fileName}</a>
                  <span>已保存原始素材</span>
                </div>
              )}
              {!current.report ? (
                <div className="panel empty">
                  <Activity size={34} />
                  <h2>{status[current.status]}</h2>
                  <p>
                    {current.error ||
                      (["QUEUED", "RUNNING"].includes(current.status)
                        ? "正在检索历史稿件并生成策略，完成后会自动刷新。"
                        : current.source?.coverage === "METADATA_ONLY"
                          ? "公开页面没有提供原文与原帖链接，该记录不参与语义检索。"
                          : current.historical
                            ? "以下为来源公开简介节选，不是完整转写。"
                            : "正文与转写内容已保存。点击开始分析，生成对比报告。")}
                  </p>
                  <p>{current.body}</p>
                  {!current.historical && !["QUEUED", "RUNNING"].includes(current.status) && (
                    <BodyEditor
                      key={current.id}
                      content={current}
                      busy={busy}
                      save={(body) => action(() => api.updateBody(current.id, body))}
                    />
                  )}
                  {current.historical && !current.source && (
                    <p>
                      曝光 {num(current.impressions)} · 点击率{" "}
                      {pct(current.clicks / Math.max(1, current.impressions))}
                    </p>
                  )}
                </div>
              ) : (
                <ReportView
                  content={current}
                  busy={busy}
                  onFeedback={(data) => action(() => api.feedback(current.id, data))}
                  onArchive={() => action(() => api.archive(current.id))}
                />
              )}
            </>
          ) : (
            <>
              <div className="page-title">
                <div>
                  <div className="eyebrow">CONTENT INTELLIGENCE WORKSPACE</div>
                  <h1>
                    {page === "library"
                      ? "让好内容，成为下一次的参考。"
                      : page === "strategy"
                        ? "用反馈，决定下一步。"
                        : "每一份内容，都值得被看见。"}
                  </h1>
                  <p>
                    {page === "library"
                      ? "沉淀高热度内容与真实表现，为新稿件提供可追溯的比较依据。"
                      : page === "strategy"
                        ? "从冷启动到渐进扩量，用可解释的指标连接内容与分发。"
                        : "从内容理解到推流决策，让历史经验为下一篇好内容指路。"}
                  </p>
                </div>
                <button className="primary" onClick={() => newContent(page === "library")}>
                  <Plus size={18} />
                  {page === "library" ? "导入历史稿件" : "投放新内容"}
                </button>
              </div>
              {page === "overview" && (
                <>
                  <section className="hero">
                    <div>
                      <span className="hero-kicker">
                        <Sparkles size={14} /> 内容 × 数据 × 智能策略
                      </span>
                      <h2>
                        好的内容，需要
                        <br />
                        更聪明的出发方式。
                      </h2>
                      <p>
                        比对高热稿件，找到内容优势，
                        <br />
                        用小流量验证，探索更合适的受众。
                      </p>
                      <button onClick={() => newContent()}>
                        开始一次内容分析 <ArrowRight size={16} />
                      </button>
                    </div>
                    <div className="orbital" aria-hidden="true">
                      <div className="orbit o1" />
                      <div className="orbit o2" />
                      <div className="orbit o3" />
                      <div className="orb-center">
                        <Layers3 size={42} />
                        <span>
                          CONTENT
                          <br />
                          PILOT
                        </span>
                      </div>
                      <span className="orbit-tag tag-a">
                        <FileText size={17} />
                        内容理解
                      </span>
                      <span className="orbit-tag tag-b">
                        <Activity size={17} />
                        历史洞察
                      </span>
                      <span className="orbit-tag tag-c">
                        <TrendingUp size={17} />
                        推流策略
                      </span>
                      <i className="orb-dot d1" />
                      <i className="orb-dot d2" />
                    </div>
                    <span className="hero-index">01 / INTELLIGENCE</span>
                  </section>
                  <section className="stats">
                    {(
                      [
                        [FileText, "待分析 / 处理中", waiting, "新内容的下一步"],
                        [
                          BookOpen,
                          "可比对历史资料",
                          history.filter((c) => c.status !== "NEEDS_SOURCE").length,
                          "另有 " +
                            history.filter((c) => c.status === "NEEDS_SOURCE").length +
                            " 条待核验线索",
                        ],
                        [Sparkles, "已生成分析", completed, "可追溯的内容洞察"],
                        [
                          TrendingUp,
                          "建议扩量",
                          reports.filter((c) => c.report?.decision === "EXPAND").length,
                          "基于实际反馈判断",
                        ],
                      ] as const
                    ).map(([Symbol, label, value, hint]) => (
                      <div className="stat" key={String(label)}>
                        <div>
                          <span>{String(label)}</span>
                          <Symbol size={18} />
                        </div>
                        <strong>{String(value).padStart(2, "0")}</strong>
                        <small>{String(hint)}</small>
                      </div>
                    ))}
                  </section>
                </>
              )}
              {page === "library" && (
                <div className="notice">
                  <FlaskConical size={19} />
                  <span>
                    真实来源核验：6 条 B 站本周视频（公开简介节选）＋10
                    条小红书榜单线索（正文与图文类型待核验，不参与检索）。公开播放/点赞不能换算为曝光、CTR
                    或完播率。
                  </span>
                </div>
              )}
              <section className="panel list-panel">
                <div className="section-heading">
                  <h2>
                    {page === "library" ? "历史稿件" : "内容工作流"} <span>{list.length}</span>
                  </h2>
                  <div className="search">
                    <Search size={16} />
                    <input
                      aria-label="搜索稿件"
                      placeholder="搜索标题、标签或分类"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="filters">
                  {[
                    ["ALL", "全部内容"],
                    ["ARTICLE", "图文"],
                    ["VIDEO", "视频"],
                    ["AUDIO", "音频"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      className={filter === key ? "selected" : ""}
                      onClick={() => setFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                  <small>
                    {page === "library"
                      ? "参考样本 · 可追溯指标"
                      : "内容提交 → 历史比对 → 策略建议"}
                  </small>
                </div>
                {loading ? (
                  <div className="empty">
                    <Loader2 className="spin" />
                    <p>正在连接本地服务…</p>
                  </div>
                ) : list.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon">
                      <Upload size={26} />
                    </div>
                    <h3>
                      {query
                        ? "没有匹配的稿件"
                        : page === "strategy"
                          ? "还没有策略报告"
                          : "从第一份内容开始"}
                    </h3>
                    <p>
                      {query
                        ? "尝试其他关键词。"
                        : "提交图文正文或音视频转写，获得历史对比与试投建议。"}
                    </p>
                    {!query && (
                      <button className="secondary" onClick={() => newContent(page === "library")}>
                        <Plus size={16} />
                        添加内容
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>内容</th>
                          <th>类型 / 分类</th>
                          <th>{page === "library" ? "公开表现 / 状态" : "分析状态"}</th>
                          <th>{page === "library" ? "数据来源" : "参考评分"}</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((c) => (
                          <tr key={c.id} onClick={() => setSelected(c.id)}>
                            <td>
                              <div className={"thumb " + c.mediaType.toLowerCase()}>
                                <Icon type={c.mediaType} />
                              </div>
                              <div>
                                <strong>{c.title}</strong>
                                <small>{c.tags || "未设置标签"}</small>
                              </div>
                            </td>
                            <td>
                              {c.source?.verification === "PENDING_ORIGINAL_AND_TYPE"
                                ? "类型待核验"
                                : names[c.mediaType]}
                              <small>{c.category}</small>
                            </td>
                            <td>
                              {c.historical ? (
                                <>
                                  {c.source ? (
                                    <>
                                      {c.source.metrics.views !== null
                                        ? "播放 " + num(c.source.metrics.views)
                                        : "点赞 " + num(c.source.metrics.likes)}
                                      <small>
                                        {c.source.coverage === "METADATA_ONLY"
                                          ? "待核验 · 不参与检索"
                                          : "官方公开数据 · 简介节选"}
                                      </small>
                                    </>
                                  ) : (
                                    <>
                                      {num(c.impressions)}
                                      <small>
                                        CTR {pct(c.clicks / Math.max(1, c.impressions))}
                                      </small>
                                    </>
                                  )}
                                </>
                              ) : (
                                <span className={"badge " + c.status.toLowerCase()}>
                                  {["QUEUED", "RUNNING"].includes(c.status) && (
                                    <Loader2 size={12} className="spin" />
                                  )}
                                  {status[c.status]}
                                </span>
                              )}
                            </td>
                            <td>
                              {c.historical ? (
                                <span className="badge">
                                  {c.source
                                    ? c.source.platform === "BILIBILI"
                                      ? "B站官方"
                                      : "千瓜公开榜"
                                    : c.demo
                                      ? "演示数据"
                                      : "用户导入"}
                                </span>
                              ) : c.report ? (
                                <>
                                  <b>{c.report.score}</b>
                                  <small>{c.report.mode === "AI" ? "AI 辅助" : "规则分析"}</small>
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              <button className="row-link" aria-label={"查看 " + c.title}>
                                查看 <ArrowRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
              <div className="footer-note">
                <Zap size={14} />{" "}
                推流建议用于辅助运营决策，评分不是爆款概率，系统不会自动购买流量或向外部平台发布。
              </div>
            </>
          )}
        </div>
      </main>
      {modal && (
        <CreateModal
          historical={historical}
          close={() => setModal(false)}
          submit={async (d, f) => {
            setError("");
            const c = await api.create(d, f);
            setModal(false);
            setPage(d.historical ? "library" : "overview");
            setSelected(c.id);
            await refresh();
            if (!d.historical) await action(() => api.analyze(c.id));
          }}
        />
      )}
    </div>
  );
}

function SourcePanel({ source: s }: { source: Source }) {
  return (
    <section className="panel source-panel">
      <div className="section-heading">
        <h2>来源与核验依据</h2>
        <span className="badge">
          {s.coverage === "METADATA_ONLY" ? "仅榜单线索 · 不参与检索" : "公开简介 · 有限内容比对"}
        </span>
      </div>
      <p>{s.rankingScope}</p>
      <div className="source-meta">
        <span>作者：{s.author}</span>
        <span>
          发布日期：
          {s.publishedAt.includes("T")
            ? new Date(s.publishedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })
            : s.publishedAt}
        </span>
        <span>
          采集：{new Date(s.fetchedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
        </span>
      </div>
      <div className="source-metrics">
        {[
          ["播放", s.metrics.views],
          ["点赞", s.metrics.likes],
          ["评论", s.metrics.comments],
          ["收藏", s.metrics.favorites],
          ["分享", s.metrics.shares],
        ].map(([label, value]) => (
          <span key={String(label)}>
            {label}
            <b>{num(value as number | null)}</b>
          </span>
        ))}
      </div>
      <p className="source-warning">{s.limitation}</p>
      <div className="actions">
        {s.originalUrl && (
          <a href={s.originalUrl} target="_blank" rel="noreferrer">
            原始内容 ↗
          </a>
        )}
        <a href={s.rankingUrl} target="_blank" rel="noreferrer">
          公开榜单 ↗
        </a>
      </div>
    </section>
  );
}
function BodyEditor({
  content,
  busy,
  save,
}: {
  content: Content;
  busy: boolean;
  save: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState(content.body || "");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(body);
      }}
    >
      <label>
        补充或修订正文 / 转写
        <textarea
          required
          maxLength={100000}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <button className="secondary" disabled={busy}>
        保存文本
      </button>
    </form>
  );
}
function ReportView({
  content: c,
  busy,
  onFeedback,
  onArchive,
}: {
  content: Content;
  busy: boolean;
  onFeedback: (data: object) => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const r = c.report!;
  const [metrics, setMetrics] = useState({
    impressions: c.impressions,
    clicks: c.clicks,
    engagements: c.engagements,
    completions: c.completions,
  });
  return (
    <>
      <div className="report-grid">
        <section className="panel score-panel">
          <span className="eyebrow">内容参考评分</span>
          <div className="score">
            {r.score}
            <small>/ 100</small>
          </div>
          <span className="badge completed">
            {r.mode === "AI" ? "AI 辅助分析" : "规则分析模式"}
          </span>
          <p>置信程度：{r.confidence}</p>
          <small>用于排序参考，不是预测成功率。</small>
        </section>
        <section className="panel insight">
          <h2>
            <Sparkles size={20} />
            内容洞察
          </h2>
          <p>{r.summary}</p>
          {r.evidence.map((e, i) => (
            <p className="evidence" key={i}>
              <Check size={15} />
              {e}
            </p>
          ))}
          <small>
            检索方式：{r.retrievalMode === "EMBEDDING" ? "模型向量相似度" : "中文双字片段相似度"} ·{" "}
            {new Date(r.generatedAt).toLocaleString("zh-CN")}
          </small>
        </section>
      </div>
      <section className="panel report-section">
        <h2>
          01 <span>历史高热稿件对比</span>
        </h2>
        {r.matches.length === 0 ? (
          <p>暂无足够相关的高热样本，请先扩充同类历史稿件。</p>
        ) : (
          <div className="match-grid">
            {r.matches.map((m) => (
              <article className="match" key={m.id}>
                <div>
                  <span className="badge">{names[m.mediaType]}</span>
                  {m.source && (
                    <small>{m.source.platform === "BILIBILI" ? "B站公开简介" : "公开资料"}</small>
                  )}
                </div>
                <h3>{m.title}</h3>
                <div className="similarity">
                  <span>内容相似度</span>
                  <b>{pct(m.similarity)}</b>
                </div>
                <div className="bar">
                  <i style={{ width: pct(m.similarity) }} />
                </div>
                <div className="match-metrics">
                  <span>
                    {m.source ? "播放" : "曝光"}
                    <b>{num(m.source ? m.source.metrics.views : m.impressions)}</b>
                  </span>
                  <span>
                    点击率<b>{pct(m.ctr)}</b>
                  </span>
                  <span>
                    互动率<b>{pct(m.engagementRate)}</b>
                  </span>
                </div>
                {m.source && (
                  <p>
                    <a
                      href={m.source.originalUrl || m.source.rankingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      核验原始来源 ↗
                    </a>
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <div className="report-grid equal">
        <section className="panel report-section">
          <h2>
            02 <span>内容优化建议</span>
          </h2>
          {r.improvements.map((v, i) => (
            <div className="numbered" key={i}>
              <b>{i + 1}</b>
              <p>{v}</p>
            </div>
          ))}
          {r.aiAdvice && (
            <div className="ai-advice">
              <strong>{r.mode === "AI" ? "AI 补充建议" : "服务提示"}</strong>
              <p>{r.aiAdvice}</p>
            </div>
          )}
        </section>
        <section className="panel report-section">
          <h2>
            03 <span>建议触达人群</span>
          </h2>
          {r.audiences.map((v, i) => (
            <div className="audience" key={i}>
              <span>0{i + 1}</span>
              <div>
                <strong>{v}</strong>
                <small>{i === 2 ? "探索潜在兴趣边界" : "先验证匹配度，再扩大覆盖"}</small>
              </div>
            </div>
          ))}
          <div className="notice">人群为运营假设，需要通过平台实际投放验证。</div>
        </section>
      </div>
      <section className="panel report-section">
        <h2>
          04 <span>分阶段推流计划</span>
        </h2>
        <div className="stages">
          {r.stages.map((s, i) => (
            <article key={s.name}>
              <span className="stage-no">阶段 0{i + 1}</span>
              <h3>{s.name}</h3>
              <strong>
                {num(s.budget)}
                <small>建议曝光</small>
              </strong>
              <p>{s.rule}</p>
            </article>
          ))}
        </div>
        <div className="thresholds">
          <span>验证阈值</span>
          <b>点击率 ≥ {pct(r.targetCtr)}</b>
          <b>互动 / 曝光 ≥ {pct(r.targetEngagement)}</b>
          <b>完成 / 点击 ≥ {pct(r.targetCompletion)}</b>
        </div>
      </section>
      {!c.historical && (
        <section className="panel report-section">
          <h2>
            05 <span>回填试投数据</span>
          </h2>
          <p>输入本轮累计去重人数，互动与完成人数不得超过点击人数。</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onFeedback(metrics);
            }}
          >
            <div className="metric-inputs">
              {[
                ["impressions", "曝光人数"],
                ["clicks", "点击人数"],
                ["engagements", "互动人数"],
                ["completions", "完成人数"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    required
                    min={key === "impressions" ? 1 : 0}
                    step="1"
                    value={metrics[key as keyof typeof metrics]}
                    onChange={(e) => setMetrics({ ...metrics, [key]: Number(e.target.value) })}
                  />
                </label>
              ))}
            </div>
            <button className="primary" disabled={busy}>
              更新推流判断 <ArrowRight size={16} />
            </button>
          </form>
          <div className={"decision " + r.decision.toLowerCase()}>
            <strong>
              {
                {
                  PENDING: "等待验证",
                  HOLD: "继续观察",
                  EXPAND: "建议逐步扩量",
                  PAUSE: "建议暂停扩量",
                }[r.decision]
              }
            </strong>
            <p>{r.decisionReason}</p>
          </div>
          {c.impressions >= 1000 && (
            <button className="secondary" disabled={busy} onClick={() => void onArchive()}>
              将已验证内容纳入历史稿库
            </button>
          )}
        </section>
      )}
    </>
  );
}

function CreateModal({
  historical,
  close,
  submit,
}: {
  historical: boolean;
  close: () => void;
  submit: (d: Draft, f: File | null) => Promise<void>;
}) {
  const [d, setD] = useState<Draft>({ ...initial, historical }),
    [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function field(key: keyof Draft, value: string | number) {
    setD({ ...d, [key]: value });
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">NEW CONTENT</div>
            <h2 id="modal-title">{historical ? "导入历史稿件" : "投放新内容"}</h2>
          </div>
          <button className="icon-button" aria-label="关闭窗口" disabled={busy} onClick={close}>
            <X />
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await submit(d, file);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="type-picker">
            {(Object.keys(names) as MediaType[]).map((type) => (
              <button
                type="button"
                key={type}
                className={d.mediaType === type ? "selected" : ""}
                onClick={() => {
                  field("mediaType", type);
                  setFile(null);
                }}
              >
                <Icon type={type} />
                {names[type]}
              </button>
            ))}
          </div>
          <label>
            内容标题
            <input
              autoFocus
              required
              maxLength={200}
              placeholder="给内容一个清晰的标题"
              value={d.title}
              onChange={(e) => field("title", e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              内容分类
              <select value={d.category} onChange={(e) => field("category", e.target.value)}>
                {["旅行", "科技", "美食", "职场", "生活", "知识", "其他"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              目标人群
              <input
                maxLength={1000}
                placeholder="例如：热爱户外的上班族"
                value={d.audience}
                onChange={(e) => field("audience", e.target.value)}
              />
            </label>
          </div>
          <label>
            内容标签
            <input
              maxLength={1000}
              placeholder="用空格分隔关键词"
              value={d.tags}
              onChange={(e) => field("tags", e.target.value)}
            />
          </label>
          <label>
            {d.mediaType === "ARTICLE" ? "正文 / 图片内容说明" : "音视频转写文本"}
            <textarea
              required={historical || !file}
              rows={6}
              maxLength={100000}
              placeholder={
                d.mediaType === "ARTICLE"
                  ? "粘贴正文或图片说明；留空时使用已配置的视觉模型解析图片。"
                  : "粘贴字幕/转写；留空时使用已配置的转写服务，视频需要 FFmpeg。"
              }
              value={d.body}
              onChange={(e) => field("body", e.target.value)}
            />
          </label>
          <label className="upload-zone">
            <Upload size={22} />
            <strong>{file ? file.name : "选择原始素材（可选）"}</strong>
            <span>最大 100 MB · 自动转写音轨须小于 24 MB</span>
            <input
              key={d.mediaType}
              type="file"
              accept={
                d.mediaType === "ARTICLE"
                  ? ".jpg,.jpeg,.png,.webp,.txt"
                  : d.mediaType === "VIDEO"
                    ? ".mp4,.webm"
                    : ".mp3,.wav,.m4a,.ogg,.webm"
              }
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                if (f && f.size > 100 * 1024 * 1024) {
                  setError("附件不能超过 100MB");
                  e.target.value = "";
                  return;
                }
                setFile(f);
              }}
            />
          </label>
          {historical && (
            <div className="metric-inputs">
              {[
                ["impressions", "曝光人数"],
                ["clicks", "点击人数"],
                ["engagements", "互动人数"],
                ["completions", "完成人数"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={Number(d[key as keyof Draft])}
                    onChange={(e) => field(key as keyof Draft, Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
          )}
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <div className="modal-footer">
            <small>请提交真实内容；历史记录不会自动生成。</small>
            <button className="primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {busy ? "正在提交…" : historical ? "保存到稿件库" : "提交并开始分析"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
