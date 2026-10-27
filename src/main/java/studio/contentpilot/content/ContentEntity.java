package studio.contentpilot.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import java.time.Instant;
import java.util.UUID;

@Entity
public class ContentEntity {

  @Id
  public String id = UUID.randomUUID().toString();

  public String title;
  public String mediaType;
  public String category;

  @Column(length = 1000)
  public String audience;

  @Column(length = 1000)
  public String tags;

  @Column(length = 100000)
  public String body;

  public boolean historical;
  public boolean demo;
  public long impressions;
  public long clicks;
  public long engagements;
  public long completions;
  public String status = "DRAFT";
  public String fileName;
  public String storedFile;
  public String mimeType;

  @Column(length = 1000)
  public String error;

  @Lob
  public String report;

  @Lob
  public String provenance;

  public Instant createdAt = Instant.now();
}
