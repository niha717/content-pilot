package studio.contentpilot.content;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import studio.contentpilot.content.Models.*;

@RestController
@RequestMapping("/api")
public class ContentController {

  private final ContentService service;

  public ContentController(ContentService service) {
    this.service = service;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "UP", "service", "Content Pilot");
  }

  @GetMapping("/contents")
  public List<ContentDTO> list() {
    return service.list();
  }

  @GetMapping("/contents/{id}")
  public ContentDTO get(@PathVariable String id) {
    return service.dto(service.find(id));
  }

  @PostMapping(value = "/contents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ContentDTO create(
    @Valid @RequestPart("metadata") Draft draft,
    @RequestPart(value = "file", required = false) MultipartFile file
  ) throws java.io.IOException {
    return service.create(draft, file);
  }

  @PostMapping("/contents/{id}/analyze")
  public ContentDTO analyze(@PathVariable String id) {
    return service.enqueue(id);
  }

  @PostMapping("/contents/{id}/feedback")
  public ContentDTO feedback(@PathVariable String id, @Valid @RequestBody Feedback feedback) {
    return service.feedback(id, feedback);
  }

  @PostMapping("/contents/{id}/archive")
  public ContentDTO archive(@PathVariable String id) {
    return service.promote(id);
  }

  @PatchMapping("/contents/{id}/body")
  public ContentDTO updateBody(@PathVariable String id, @RequestBody Map<String, String> body) {
    return service.updateBody(id, body.get("body"));
  }

  @GetMapping("/contents/{id}/file")
  public ResponseEntity<FileSystemResource> file(@PathVariable String id) {
    var c = service.find(id);
    return ResponseEntity.ok()
      .contentType(
        MediaType.parseMediaType(c.mimeType == null ? "application/octet-stream" : c.mimeType)
      )
      .header("X-Content-Type-Options", "nosniff")
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"asset\"")
      .body(new FileSystemResource(service.file(c)));
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> business(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of("message", e.getReason() == null ? "请求失败" : e.getReason())
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
    return ResponseEntity.badRequest().body(
      Map.of("message", "请检查必填字段、文本长度和非负指标")
    );
  }
}
