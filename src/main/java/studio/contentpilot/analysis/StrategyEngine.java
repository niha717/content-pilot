package studio.contentpilot.analysis;

import java.time.Instant;
import java.util.*;
import studio.contentpilot.content.ContentEntity;
import studio.contentpilot.content.ContentService;
import studio.contentpilot.content.Models.*;

/** Transparent baseline; score is a ranking aid, never a probability of virality. */
public class StrategyEngine {

  public static double rate(long count, long total) {
    return total == 0 ? 0 : (double) count / total;
  }

  public static Map<String, Double> tokens(String text) {
    Map<String, Double> result = new HashMap<>();
    String normalized = Objects.toString(text, "")
      .toLowerCase(Locale.ROOT)
      .replaceAll("[^\\p{L}\\p{N}]", "");
    for (int i = 0; i + 1 < normalized.length(); i++) result.merge(
      normalized.substring(i, i + 2),
      1d,
      Double::sum
    );
    return result;
  }

  public static double cosine(Map<String, Double> a, Map<String, Double> b) {
    double dot = 0,
      aa = 0,
      bb = 0;
    for (var e : a.entrySet()) {
      dot += e.getValue() * b.getOrDefault(e.getKey(), 0d);
      aa += e.getValue() * e.getValue();
    }
    for (double n : b.values()) bb += n * n;
    return aa == 0 || bb == 0 ? 0 : dot / Math.sqrt(aa * bb);
  }

  public static String text(ContentEntity c) {
    return c.title + " " + Objects.toString(c.tags, "") + " " + Objects.toString(c.body, "");
  }

  public Report analyze(
    ContentEntity draft,
    List<ContentEntity> history,
    Map<String, Double> semantic
  ) {
    var query = tokens(text(draft));
    List<Match> matches = history
      .stream()
      .filter(h -> !h.id.equals(draft.id) && eligible(h))
      .map(h -> {
        double similarity = semantic.containsKey(h.id)
          ? Math.max(0, semantic.get(h.id))
          : cosine(query, tokens(text(h)));
        similarity = Math.min(
          1,
          similarity * .8 +
            (Objects.equals(h.category, draft.category) ? .15 : 0) +
            (h.mediaType.equals(draft.mediaType) ? .05 : 0)
        );
        var source = ContentService.source(h);
        double heat =
          source == null
            ? Math.min(
                100,
                rate(h.clicks, h.impressions) * 400 +
                  rate(h.engagements, h.impressions) * 600 +
                  rate(h.completions, h.clicks) * 30
              )
            : 50;
        // Public plays are NOT exposure counts; do not manufacture CTR or completion rates.
        return new Match(
          h.id,
          h.title,
          h.mediaType,
          similarity,
          heat,
          source == null ? h.impressions : null,
          source == null ? rate(h.clicks, h.impressions) : null,
          source == null ? rate(h.engagements, h.impressions) : null,
          source == null ? rate(h.completions, h.clicks) : null,
          h.demo,
          source
        );
      })
      .filter(m -> m.similarity() >= .22 && m.heat() >= 35)
      .sorted(
        Comparator.comparingDouble(
          (Match m) -> m.similarity() * .75 + (m.heat() / 100) * .25
        ).reversed()
      )
      .limit(5)
      .toList();
    double ctr = matches
      .stream()
      .filter(m -> m.ctr() != null)
      .mapToDouble(Match::ctr)
      .average()
      .orElse(.04);
    double er = matches
      .stream()
      .filter(m -> m.engagementRate() != null)
      .mapToDouble(Match::engagementRate)
      .average()
      .orElse(.01);
    double completion = matches
      .stream()
      .filter(m -> m.completionRate() != null && m.mediaType().equals(draft.mediaType))
      .mapToDouble(Match::completionRate)
      .average()
      .orElse(.35);
    int score = matches.isEmpty()
      ? 30
      : (int) Math.round(
          matches
            .stream()
            .mapToDouble(m -> m.similarity() * 60 + m.heat() * .4)
            .average()
            .orElse(30)
        );
    List<String> evidence = new ArrayList<>();
    evidence.add(
      "检索到 " + matches.size() + " 篇相关高热度稿件；相似度是内容关联度，不代表因果或爆款概率。"
    );
    if (matches.stream().anyMatch(Match::demo)) evidence.add(
      "参考资料包含演示数据，必须替换为平台真实历史数据后校准。"
    );
    if (matches.isEmpty()) evidence.add(
      "缺少足够相关样本，使用保守默认阈值，不建议直接大规模投放。"
    );
    evidence.add(
      "公开样本依据来源榜单入选，缺失曝光、点击及完成数据不补零。标题/简介仅支持有限内容比对，不代表已观看完整视频。"
    );
    if (matches.stream().noneMatch(m -> m.ctr() != null)) evidence.add(
      "无可核验历史 CTR/完播率，试投阈值使用明确的默认值：CTR 3.2%、互动/曝光 0.8%、完成/点击 28%；不是从公开播放量推算。"
    );
    long pending = history
      .stream()
      .filter(h -> !eligible(h))
      .count();
    if (pending > 0) evidence.add(pending + " 条资料因正文、类型或指标不足未参与检索。");
    List<String> improvements = new ArrayList<>();
    if (draft.title.length() > 30) improvements.add("标题超过 30 字，建议压缩并将核心收益前置。");
    if (Objects.toString(draft.body, "").length() < 120) improvements.add(
      "补充具体内容、案例或完整转写，当前信息较少。"
    );
    improvements.add(
      draft.mediaType.equals("ARTICLE")
        ? "首屏交代读者收益，用小标题与配图提高可读性。"
        : "前 5 秒明确主题和收益，压缩重复信息，并检查字幕/音质。"
    );
    improvements.add("制作两个标题版本，在相近时段和同类人群中分流测试；不要同时改变多个变量。");
    String audience = Objects.toString(draft.audience, "");
    var stages = List.of(
      new Stage("冷启动探索", 500, "同类兴趣人群；不以小样本结果直接放量"),
      new Stage("定向验证", 2000, "累计至少 1,000 曝光，点击、互动和完成指标均达到报告阈值"),
      new Stage("渐进扩量", 10000, "仅在人工复核通过后执行；保留 10% 探索流量，每轮重新评估")
    );
    return new Report(
      "RULES",
      semantic.isEmpty() ? "LEXICAL" : "EMBEDDING",
      "基于历史高热度稿件的内容关联与表现，建议先小流量验证，再按实际反馈调整。",
      score,
      matches.size() < 3 || matches.stream().anyMatch(m -> m.demo() || m.source() != null)
        ? "低（样本或公开内容不完整）"
        : "中（尚未经过线上校准）",
      matches,
      evidence,
      improvements,
      List.of(
        audience.isBlank() ? draft.category + "兴趣人群" : audience,
        "相关内容近期互动用户",
        "10% 相邻兴趣探索人群"
      ),
      stages,
      ctr * .8,
      er * .8,
      completion * .8,
      "PENDING",
      "尚无试投反馈",
      null,
      Instant.now().toString()
    );
  }

  public static boolean eligible(ContentEntity h) {
    var s = ContentService.source(h);
    return s == null
      ? h.impressions >= 1000
      : "VERIFIED_PUBLIC_METADATA".equals(s.verification()) &&
          !"METADATA_ONLY".equals(s.coverage()) &&
          h.body != null &&
          !h.body.isBlank();
  }

  public Report feedback(Report r, Feedback f) {
    String decision, reason;
    if (f.impressions() < 1000) {
      decision = "HOLD";
      reason = "曝光不足 1,000，继续收集样本，暂不放量。";
    } else if (
      rate(f.clicks(), f.impressions()) >= r.targetCtr() &&
      rate(f.engagements(), f.impressions()) >= r.targetEngagement() &&
      rate(f.completions(), f.clicks()) >= r.targetCompletion()
    ) {
      decision = "EXPAND";
      reason = "三项指标均达阈值，建议人工复核后进入下一档；本系统不会自动向外部平台投放。";
    } else {
      decision = "PAUSE";
      reason = "至少一项指标未达阈值，暂停扩量并优化内容。";
    }
    return new Report(
      r.mode(),
      r.retrievalMode(),
      r.summary(),
      r.score(),
      r.confidence(),
      r.matches(),
      r.evidence(),
      r.improvements(),
      r.audiences(),
      r.stages(),
      r.targetCtr(),
      r.targetEngagement(),
      r.targetCompletion(),
      decision,
      reason,
      r.aiAdvice(),
      r.generatedAt()
    );
  }
}
