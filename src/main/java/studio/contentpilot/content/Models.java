package studio.contentpilot.content;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class Models {

  private Models() {}

  public record Draft(
    @NotBlank @Size(max = 200) String title,
    @NotBlank String mediaType,
    @NotBlank @Size(max = 100) String category,
    @Size(max = 1000) String audience,
    @Size(max = 1000) String tags,
    @Size(max = 100000) String body,
    boolean historical,
    @Min(0) long impressions,
    @Min(0) long clicks,
    @Min(0) long engagements,
    @Min(0) long completions
  ) {}

  public record Feedback(
    @Min(1) long impressions,
    @Min(0) long clicks,
    @Min(0) long engagements,
    @Min(0) long completions
  ) {}

  public record ContentDTO(
    String id,
    String title,
    String mediaType,
    String category,
    String audience,
    String tags,
    String body,
    boolean historical,
    boolean demo,
    long impressions,
    long clicks,
    long engagements,
    long completions,
    String status,
    String fileName,
    String mimeType,
    String error,
    Report report,
    Instant createdAt,
    Source source
  ) {}

  public record PublicMetrics(
    Long views,
    Long likes,
    Long comments,
    Long favorites,
    Long shares,
    Long coins,
    Long danmaku
  ) {}

  public record Source(
    String platform,
    String sourceId,
    String author,
    String originalUrl,
    String rankingUrl,
    String rankingScope,
    Integer rank,
    String publishedAt,
    String fetchedAt,
    String coverage,
    String verification,
    PublicMetrics metrics,
    String limitation
  ) {}

  public record Match(
    String id,
    String title,
    String mediaType,
    double similarity,
    double heat,
    Long impressions,
    Double ctr,
    Double engagementRate,
    Double completionRate,
    boolean demo,
    Source source
  ) {}

  public record Stage(String name, int budget, String rule) {}

  public record Report(
    String mode,
    String retrievalMode,
    String summary,
    int score,
    String confidence,
    List<Match> matches,
    List<String> evidence,
    List<String> improvements,
    List<String> audiences,
    List<Stage> stages,
    double targetCtr,
    double targetEngagement,
    double targetCompletion,
    String decision,
    String decisionReason,
    String aiAdvice,
    String generatedAt
  ) {}
}
