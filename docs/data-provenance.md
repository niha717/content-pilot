# 原始页面复核

核验日期：2026-10-26（Asia/Shanghai）。B站结构化来源快照见 `../src/main/resources/references/verified-sources.json`；以下通过正常浏览器逐条打开原始页面，核对可见标题和发布日期，不绕过详情 API 的 HTTP 412。

| 原始内容 | 页面发布时间 | 页面结果 |
| --- | --- | --- |
| https://www.bilibili.com/video/BV1gznR6oEg4/ | 2026-10-26 18:59:14 | 可见标题与官方热门接口一致 |
| https://www.bilibili.com/video/BV1Zcnd6rEpn/ | 2026-10-26 18:18:40 | 可见标题与官方热门接口一致 |
| https://www.bilibili.com/video/BV1jKnd6uE5d/ | 2026-10-26 18:05:00 | 可见标题与官方热门接口一致 |
| https://www.bilibili.com/video/BV1JjnR6kEZf/ | 2026-10-26 18:00:00 | 可见标题与官方热门接口一致 |
| https://www.bilibili.com/video/BV12Wnd6dEqp/ | 2026-10-26 17:01:09 | 可见标题与官方热门接口一致 |
| https://www.bilibili.com/video/BV1aFno6wETM/ | 2026-10-26 17:00:00 | 可见标题与官方热门接口一致 |
| https://www.bilibili.com/video/BV1dNn96cEN7/ | 热门接口显示 20:00 | 原页显示“视频不见了”，已剔除 |

以上不是全站发布流的最新六条，而是该次官方热门候选中、本周发布且原始页面可访问的最新六条。未下载或声称观看完整视频，参照内容仅取标题与作者简介节选。

小红书：官方发现页可见推荐笔记，但推荐流不能作为全站最热图文榜。千瓜公开页面 `https://www.qian-gua.com/Home/HotRankView?datecode=20261024&period=1&type=2` 经浏览器确认显示“近12小时 / 全部 / 全部笔记”。前10条有作者、时间、赞评藏转，但标题字段均为“该笔记未设置标题”，未提供正文、原帖链接或图文类型。已保留10条实际榜单线索，核验状态均为 `PENDING_ORIGINAL_AND_TYPE`。

筛选图文的公开链接未返回可核验的榜单；后续重复请求也有返回站点通用页面的情况。保留先前成功读取的原始 HTML 及其采集时间，不把失败请求当作刷新成功。未使用热搜话题、生成文案或未核验标题凑足10篇图文。

## 仓库快照与重新采集

可复查的结构化快照保存在 src/main/resources/references/verified-sources.json。原始网页、临时下载、个人数据库和运行日志不随代码分发。

在项目根目录执行：

```powershell
.\scripts\collect-public-references.ps1 -SnapshotDate 2026-10-26
```

采集脚本依赖当时公开页面的结构；页面变化、访问受限或候选不足时会失败，不产生替代文稿。小红书页面未返回榜单时，仅可使用本地先前保存的核验快照；全新克隆不包含此网页缓存，因而可能无法重新采集。已有结构化快照可独立加载。

采集后的原始页面仍需人工核验。脚本成功不代表完整视频、原帖正文或全站排名已经验证。快照中的时间标记为采集时点，不能作为持续更新承诺。
