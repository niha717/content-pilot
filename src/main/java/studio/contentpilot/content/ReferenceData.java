package studio.contentpilot.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import studio.contentpilot.content.Models.Source;

/** Loads only captured source records. Unverified metadata is never eligible for semantic retrieval. */
@Component
public class ReferenceData implements CommandLineRunner {

  private final ContentRepository repository;
  private final boolean enabled;

  public record Reference(
    String id,
    String title,
    String mediaType,
    String category,
    String body,
    Source source
  ) {}

  public ReferenceData(
    ContentRepository repository,
    @Value("${pilot.load-references}") boolean enabled
  ) {
    this.repository = repository;
    this.enabled = enabled;
  }

  @Transactional
  public void run(String... args) throws Exception {
    if (!enabled) return;
    var mapper = new ObjectMapper();
    var resource = new ClassPathResource("references/verified-sources.json");
    try (var stream = resource.getInputStream()) {
      var rows = mapper.readValue(stream, Reference[].class);
      // Explicitly requested removal of generated history. Keep user-authored drafts.
      repository
        .findByHistoricalTrue()
        .stream()
        .filter(c -> c.demo)
        .forEach(repository::delete);
      for (var c : repository.findAll()) {
        if (c.report != null && c.report.contains("\"demo\":true")) {
          c.report = null;
          c.status = "DRAFT";
          repository.save(c);
        }
      }
      for (var row : rows) {
        var c = repository.findById(row.id()).orElseGet(ContentEntity::new);
        c.id = row.id();
        c.title = row.title();
        c.mediaType = row.mediaType();
        c.category = row.category();
        c.body = row.body();
        c.tags = "";
        c.audience = "";
        c.historical = true;
        c.demo = false;
        c.status = "METADATA_ONLY".equals(row.source().coverage()) ? "NEEDS_SOURCE" : "ARCHIVED";
        c.provenance = mapper.writeValueAsString(row.source());
        repository.save(c);
      }
    }
  }
}
