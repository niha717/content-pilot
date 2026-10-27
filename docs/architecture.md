# 架构与接口

## 模块

| 路径 | 职责 |
| --- | --- |
| src/main/java/studio/contentpilot/content | 内容 API、业务校验、JPA 持久化、来源初始化 |
| src/main/java/studio/contentpilot/analysis | 素材解析、异步处理、相似度检索与策略计算 |
| frontend/src | 内容工作台、报告展示、来源面板与接口类型 |
| src/main/resources/references | 带来源和采集时间的公开快照 |
| scripts | 本地构建、启动、采集与接口验证 |

## 任务与恢复

提交分析后，任务状态写入数据库。工作线程每 1.5 秒轮询一次，依次执行正文提取、历史检索和报告生成。启动时将 RUNNING 状态恢复为 QUEUED；失败保留错误信息并允许重新提交。

该机制针对单实例设计，没有跨实例抢占锁或消息确认机制。生产扩展应引入任务幂等键、原子状态迁移和独立队列。

## 检索与决策

候选先经过来源完整性和历史指标资格过滤，再按文本或向量相似度排序，类别和媒介提供小幅修正。最多返回五条匹配。公开来源缺少真实曝光分母时不计算 CTR，也不作为真实效果基准。

Spring AI 模型由可选依赖提供，未配置或调用失败时回退到规则流程。语言模型只提供内容差异和优化说明，不改变规则引擎预算与反馈门槛。参考资料作为不可信数据传入模型。

## 接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | /api/health | 服务状态 |
| GET | /api/contents | 内容列表 |
| GET | /api/contents/{id} | 内容详情与报告 |
| POST | /api/contents | 新建内容，multipart metadata + 可选 file |
| PATCH | /api/contents/{id}/body | 更新正文 |
| POST | /api/contents/{id}/analyze | 提交异步分析 |
| POST | /api/contents/{id}/feedback | 回填实际指标 |
| POST | /api/contents/{id}/archive | 将符合条件的内容纳入历史 |
| GET | /api/contents/{id}/file | 下载原始附件 |

metadata 为 application/json，字段定义见 Models.Draft。报告由前端导出 JSON。错误返回 HTTP 状态码与 message 字段。

## 验证范围

StrategyEngineTest 覆盖空参照、排除自身及低曝光历史、演示来源置信度、反馈门槛、非法计数、空向量、公开指标缺失和待核验来源排除；ReferenceSnapshotTest 验证 6 条可检索来源与 10 条待核验线索。

尚未验证真实模型凭据下的推理与转写、生产并发和长期运行稳定性。没有登录与租户隔离，默认仅监听本机，不应直接作为公网服务部署。
