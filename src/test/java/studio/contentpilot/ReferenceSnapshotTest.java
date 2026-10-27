package studio.contentpilot;

import static org.assertj.core.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import studio.contentpilot.analysis.StrategyEngine;
import studio.contentpilot.content.ContentEntity;
import studio.contentpilot.content.ReferenceData.Reference;

class ReferenceSnapshotTest {

  @Test
  @DisplayName("真实快照包含6条本周视频与10条明确排除的待核验线索，无生成正文")
  void snapshot() throws Exception {
    var mapper = new ObjectMapper();
    try (var input = getClass().getResourceAsStream("/references/verified-sources.json")) {
      var rows = mapper.readValue(input, Reference[].class);
      assertThat(rows).hasSize(16);
      assertThat(Arrays.stream(rows).map(Reference::id).distinct().count()).isEqualTo(16);
      int eligible = 0;
      for (var row : rows) {
        var c = new ContentEntity();
        c.body = row.body();
        c.provenance = mapper.writeValueAsString(row.source());
        if (StrategyEngine.eligible(c)) {
          eligible++;
          assertThat(row.source().originalUrl()).startsWith("https://www.bilibili.com/video/");
          assertThat(row.source().sourceId()).isNotEqualTo("BV1dNn96cEN7");
        } else {
          assertThat(row.source().platform()).isEqualTo("XIAOHONGSHU");
          assertThat(row.body()).isEmpty();
          assertThat(row.source().originalUrl()).isNull();
          assertThat(row.source().metrics().views()).isNull();
        }
      }
      assertThat(eligible).isEqualTo(6);
    }
  }
}
