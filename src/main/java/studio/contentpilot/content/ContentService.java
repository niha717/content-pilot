package studio.contentpilot.content;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import studio.contentpilot.analysis.StrategyEngine;
import studio.contentpilot.content.Models.*;

@Service
public class ContentService {

  private final ContentRepository repository;
  private final Path uploadDir;
  private final ObjectMapper json = new ObjectMapper();

  public ContentService(
    ContentRepository repository,
    @Value("${pilot.upload-dir}") String uploadDir
  ) {
    this.repository = repository;
    this.uploadDir = Path.of(uploadDir).toAbsolutePath().normalize();
  }

  public ContentEntity find(String id) {
    return repository
      .findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "稿件不存在"));
  }

  public Report report(ContentEntity c) {
    if (c.report == null) return null;
    try {
      return json.readValue(c.report, Report.class);
    } catch (Exception e) {
      throw new IllegalStateException("分析报告读取失败", e);
    }
  }

  public void saveReport(ContentEntity c, Report report) {
    try {
      c.report = json.writeValueAsString(report);
      repository.save(c);
    } catch (Exception e) {
      throw new IllegalStateException("分析报告保存失败", e);
    }
  }

  public static Source source(ContentEntity c) {
    if (c.provenance == null) return null;
    try {
      return new ObjectMapper().readValue(c.provenance, Source.class);
    } catch (Exception e) {
      throw new IllegalStateException("来源记录读取失败", e);
    }
  }

  public ContentDTO dto(ContentEntity c) {
    return new ContentDTO(
      c.id,
      c.title,
      c.mediaType,
      c.category,
      c.audience,
      c.tags,
      c.body,
      c.historical,
      c.demo,
      c.impressions,
      c.clicks,
      c.engagements,
      c.completions,
      c.status,
      c.fileName,
      c.mimeType,
      c.error,
      report(c),
      c.createdAt,
      source(c)
    );
  }

  public List<ContentDTO> list() {
    return repository.findAllByOrderByCreatedAtDesc().stream().map(this::dto).toList();
  }

  public ContentDTO create(Draft d, MultipartFile file) throws java.io.IOException {
    if (!Set.of("ARTICLE", "VIDEO", "AUDIO").contains(d.mediaType())) bad("不支持的内容类型");
    validateMetrics(d.impressions(), d.clicks(), d.engagements(), d.completions());
    if (d.historical() && (d.body() == null || d.body().isBlank())) bad(
      "历史稿件需要正文或转写文本"
    );
    var c = new ContentEntity();
    c.title = d.title().trim();
    c.mediaType = d.mediaType();
    c.category = d.category();
    c.audience = d.audience();
    c.tags = d.tags();
    c.body = d.body();
    c.historical = d.historical();
    c.impressions = d.impressions();
    c.clicks = d.clicks();
    c.engagements = d.engagements();
    c.completions = d.completions();
    c.status = c.historical ? "ARCHIVED" : "DRAFT";
    if (file != null && !file.isEmpty()) {
      String mime = file.getContentType();
      boolean allowed =
        mime != null &&
        switch (c.mediaType) {
          case "ARTICLE" -> Set.of("image/png", "image/jpeg", "image/webp", "text/plain").contains(
            mime
          );
          case "VIDEO" -> Set.of("video/mp4", "video/webm").contains(mime);
          default -> Set.of(
            "audio/mpeg",
            "audio/wav",
            "audio/x-wav",
            "audio/mp4",
            "audio/webm",
            "audio/ogg"
          ).contains(mime);
        };
      if (!allowed) bad(
        "文件格式与所选类型不匹配；图文支持 PNG/JPEG/WebP/TXT，视频支持 MP4/WebM，音频支持 MP3/WAV/M4A/OGG/WebM"
      );
      Files.createDirectories(uploadDir);
      c.storedFile = c.id;
      c.fileName = file.getOriginalFilename();
      c.mimeType = mime;
      file.transferTo(uploadDir.resolve(c.id));
      if ("text/plain".equals(mime) && (c.body == null || c.body.isBlank())) {
        if (file.getSize() > 300000) {
          Files.deleteIfExists(uploadDir.resolve(c.id));
          bad("文本附件不能超过 300KB");
        }
        c.body = Files.readString(uploadDir.resolve(c.id));
      }
    }
    repository.save(c);
    return dto(c);
  }

  public synchronized ContentDTO enqueue(String id) {
    var c = find(id);
    if (c.historical) bad("历史样本无需提交分析");
    if (Set.of("QUEUED", "RUNNING").contains(c.status)) return dto(c);
    if ((c.body == null || c.body.isBlank()) && c.storedFile == null) bad(
      "请提供正文、转写文本或素材文件"
    );
    c.status = "QUEUED";
    c.error = null;
    c.report = null;
    repository.save(c);
    return dto(c);
  }

  public synchronized ContentDTO feedback(String id, Feedback f) {
    validateMetrics(f.impressions(), f.clicks(), f.engagements(), f.completions());
    var c = find(id);
    var r = report(c);
    if (r == null || !"COMPLETED".equals(c.status)) bad("请先完成分析");
    c.impressions = f.impressions();
    c.clicks = f.clicks();
    c.engagements = f.engagements();
    c.completions = f.completions();
    saveReport(c, new StrategyEngine().feedback(r, f));
    return dto(c);
  }

  public ContentDTO promote(String id) {
    var c = find(id);
    if (!"COMPLETED".equals(c.status) || c.impressions < 1000) bad(
      "完成分析并积累至少 1,000 次曝光后，才可转为历史样本"
    );
    c.historical = true;
    c.status = "ARCHIVED";
    repository.save(c);
    return dto(c);
  }

  public ContentDTO updateBody(String id, String body) {
    var c = find(id);
    if (c.historical || Set.of("RUNNING", "QUEUED").contains(c.status)) bad(
      "历史样本或正在分析的内容不能修改"
    );
    if (body == null || body.isBlank() || body.length() > 100000) bad("正文须为 1 至 100,000 字");
    c.body = body;
    c.status = "DRAFT";
    c.report = null;
    c.error = null;
    repository.save(c);
    return dto(c);
  }

  public Path file(ContentEntity c) {
    if (c.storedFile == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "没有附件");
    return uploadDir.resolve(c.storedFile);
  }

  public static void validateMetrics(
    long impressions,
    long clicks,
    long engagements,
    long completions
  ) {
    if (
      impressions < 0 ||
      clicks < 0 ||
      engagements < 0 ||
      completions < 0 ||
      clicks > impressions ||
      engagements > clicks ||
      completions > clicks
    ) bad("指标需非负，点击人数不能超过曝光人数，互动和完成人数不能超过点击人数（均使用去重人数）");
  }

  public static void bad(String message) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
