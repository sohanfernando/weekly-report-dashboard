package com.sisenco.weeklyreport.repository;

import com.sisenco.weeklyreport.domain.ReportVersion;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportVersionRepository extends JpaRepository<ReportVersion, Long> {

    List<ReportVersion> findByReportIdOrderByVersionNoAsc(Long reportId);

    Optional<ReportVersion> findByReportIdAndVersionNo(Long reportId, int versionNo);

    /** The one version the owner may currently edit, if the report is editable. */
    Optional<ReportVersion> findByReportIdAndEditableTrue(Long reportId);
}
