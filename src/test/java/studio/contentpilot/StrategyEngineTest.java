package studio.contentpilot;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import studio.contentpilot.analysis.StrategyEngine;
import studio.contentpilot.content.ContentEntity;
import studio.contentpilot.content.ContentService;
import studio.contentpilot.content.Models.Feedback;
import studio.contentpilot.content.Models.PublicMetrics;
import studio.contentpilot.content.Models.Source;

class StrategyEngineTest {

  ContentEntity content(String title) {
    var c = new ContentEntity();
    c.title = title;
    c.body = "杭州周末徒步路线装备指南";
    c.category = "旅行";
    c.mediaType = "ARTICLE";
    return c;
  }

  @Test
  @DisplayName("无历史样本时保守处理，不虚构高置信度")
  void noEvidence() {
    var r = new StrategyEngine().analyze(content("徒步"), List.of(), Map.of());
    assertThat(r.matches()).isEmpty();
    assertThat(r.score()).isEqualTo(30);
    assertThat(r.confidence()).startsWith("低");
  }

  @Test
  @DisplayName("自身和低曝光样本不会进入高热参考")
  void excludesSelfAndSmallSample() {
    var c = content("徒步");
    c.impressions = 10000;
    c.clicks = 1000;
    var h = content("徒步");
    h.impressions = 999;
    h.clicks = 800;
    assertThat(new StrategyEngine().analyze(c, List.of(c, h), Map.of()).matches()).isEmpty();
  }

  @Test
  @DisplayName("相似稿件检索依据内容，演示样本降低置信程度")
  void matches() {
    var c = content("徒步攻略");
    var h = content("徒步攻略");
    h.impressions = 10000;
    h.clicks = 1200;
    h.engagements = 300;
    h.completions = 700;
    h.demo = true;
    var r = new StrategyEngine().analyze(c, List.of(h), Map.of());
    assertThat(r.matches()).hasSize(1);
    assertThat(r.matches().getFirst().similarity()).isCloseTo(1, within(.0001));
    assertThat(r.confidence()).startsWith("低");
  }

  @Test
  @DisplayName("小样本不放量，达标才放量，完成率差则暂停")
  void gates() {
    var engine = new StrategyEngine();
    var r = engine.analyze(content("徒步"), List.of(), Map.of());
    assertThat(engine.feedback(r, new Feedback(500, 100, 50, 80)).decision()).isEqualTo("HOLD");
    assertThat(engine.feedback(r, new Feedback(2000, 200, 60, 120)).decision()).isEqualTo("EXPAND");
    assertThat(engine.feedback(r, new Feedback(2000, 200, 60, 0)).decision()).isEqualTo("PAUSE");
  }

  @Test
  @DisplayName("拒绝不可能的指标")
  void invalidMetrics() {
    assertThatThrownBy(() -> ContentService.validateMetrics(100, 101, 0, 0)).hasMessageContaining(
      "指标"
    );
    assertThatThrownBy(() -> ContentService.validateMetrics(100, 50, 51, 0)).hasMessageContaining(
      "指标"
    );
    assertThatThrownBy(() -> ContentService.validateMetrics(100, 50, 0, 51)).hasMessageContaining(
      "指标"
    );
  }

  @Test
  @DisplayName("空向量相似度为零而非 NaN")
  void emptyVector() {
    assertThat(StrategyEngine.cosine(Map.of(), Map.of())).isZero();
  }

  @Test
  @DisplayName("公开播放量不会被当作曝光或生成虚假CTR")
  void publicCountersAreNotExposure() throws Exception {
    var h = content("徒步攻略");
    h.provenance = new ObjectMapper().writeValueAsString(
      new Source(
        "BILIBILI",
        "BV-test",
        "作者",
        "https://www.bilibili.com/",
        "https://www.bilibili.com/v/popular/all",
        "测试来源",
        1,
        "2026-10-26",
        "2026-10-26T12:00:00+08:00",
        "TITLE_DESCRIPTION_EXCERPT",
        "VERIFIED_PUBLIC_METADATA",
        new PublicMetrics(200000L, 20000L, null, null, null, null, null),
        "仅简介"
      )
    );
    var r = new StrategyEngine().analyze(content("徒步攻略"), List.of(h), Map.of());
    assertThat(r.matches()).hasSize(1);
    assertThat(r.matches().getFirst().ctr()).isNull();
    assertThat(r.matches().getFirst().impressions()).isNull();
    assertThat(r.targetCtr()).isCloseTo(.032, within(.00001));
  }

  @Test
  @DisplayName("正文与类型未核验的小红书榜单线索不参与检索")
  void pendingNotesAreExcluded() throws Exception {
    var h = content("徒步攻略");
    h.impressions = 999999;
    h.provenance = new ObjectMapper().writeValueAsString(
      new Source(
        "XIAOHONGSHU",
        null,
        "作者",
        null,
        "https://www.qian-gua.com/",
        "公开榜",
        1,
        "10-26",
        "2026-10-26T12:00:00+08:00",
        "METADATA_ONLY",
        "PENDING_ORIGINAL_AND_TYPE",
        new PublicMetrics(null, 80000L, null, null, null, null, null),
        "原文未公开"
      )
    );
    assertThat(
      new StrategyEngine().analyze(content("徒步攻略"), List.of(h), Map.of()).matches()
    ).isEmpty();
  }
}
