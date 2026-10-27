package studio.contentpilot.content;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContentRepository extends JpaRepository<ContentEntity, String> {
  List<ContentEntity> findAllByOrderByCreatedAtDesc();
  List<ContentEntity> findByHistoricalTrue();
  List<ContentEntity> findByStatusOrderByCreatedAtAsc(String status);
}
