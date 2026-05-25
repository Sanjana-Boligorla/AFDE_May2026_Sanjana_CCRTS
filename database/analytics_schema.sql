-- ============================================================
-- Phase 2: Analytics Tables (ETL output destination)
-- Run this AFTER schema.sql to add analytics tables
-- ============================================================

USE complaint_tracker;

-- -------------------------------------------------------
-- 1. ETL run log — tracks each pipeline execution
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS etl_runs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  run_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_file     VARCHAR(255),
  records_extracted INT        DEFAULT 0,
  records_transformed INT      DEFAULT 0,
  records_loaded  INT          DEFAULT 0,
  status          ENUM('success','failed','partial') DEFAULT 'success',
  error_message   TEXT,
  duration_seconds DECIMAL(8,3)
);

-- -------------------------------------------------------
-- 2. SLA analytics — per-complaint SLA tracking
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sla_analytics (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  etl_run_id          INT,
  complaint_number    VARCHAR(30)  NOT NULL,
  category            VARCHAR(100),
  priority            ENUM('Low','Medium','High','Critical'),
  status              VARCHAR(50),
  assigned_agent      VARCHAR(100),
  created_at          DATETIME,
  sla_due_at          DATETIME,
  resolved_at         DATETIME,
  resolution_hours    DECIMAL(10,2),
  sla_breached        TINYINT(1)   DEFAULT 0,
  sla_hours_limit     INT,
  breach_hours        DECIMAL(10,2),     -- how many hours over SLA (NULL if not breached)
  satisfaction_rating TINYINT,
  loaded_at           DATETIME     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (etl_run_id) REFERENCES etl_runs(id) ON DELETE SET NULL,
  INDEX idx_sla_priority    (priority),
  INDEX idx_sla_category    (category),
  INDEX idx_sla_breached    (sla_breached),
  INDEX idx_sla_agent       (assigned_agent),
  INDEX idx_sla_created     (created_at)
);

-- -------------------------------------------------------
-- 3. Category analytics — aggregated per category per month
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_analytics (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  etl_run_id              INT,
  report_month            VARCHAR(7),    -- e.g. '2025-01'
  category                VARCHAR(100)  NOT NULL,
  total_complaints        INT           DEFAULT 0,
  resolved_count          INT           DEFAULT 0,
  open_count              INT           DEFAULT 0,
  escalated_count         INT           DEFAULT 0,
  sla_breach_count        INT           DEFAULT 0,
  avg_resolution_hours    DECIMAL(10,2),
  avg_satisfaction        DECIMAL(3,2),
  loaded_at               DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (etl_run_id) REFERENCES etl_runs(id) ON DELETE SET NULL,
  INDEX idx_cat_month     (report_month),
  INDEX idx_cat_category  (category)
);

-- -------------------------------------------------------
-- 4. Agent performance analytics — aggregated per agent per month
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_performance_analytics (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  etl_run_id              INT,
  report_month            VARCHAR(7),
  agent_name              VARCHAR(100)  NOT NULL,
  total_assigned          INT           DEFAULT 0,
  total_resolved          INT           DEFAULT 0,
  total_escalated         INT           DEFAULT 0,
  sla_met_count           INT           DEFAULT 0,
  sla_breached_count      INT           DEFAULT 0,
  avg_resolution_hours    DECIMAL(10,2),
  avg_satisfaction        DECIMAL(3,2),
  resolution_rate         DECIMAL(5,2), -- percentage
  sla_compliance_rate     DECIMAL(5,2), -- percentage
  loaded_at               DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (etl_run_id) REFERENCES etl_runs(id) ON DELETE SET NULL,
  INDEX idx_agent_month   (report_month),
  INDEX idx_agent_name    (agent_name)
);

-- -------------------------------------------------------
-- 5. Monthly summary analytics — high-level dashboard totals
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_summary_analytics (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  etl_run_id              INT,
  report_month            VARCHAR(7)    NOT NULL,
  total_complaints        INT           DEFAULT 0,
  resolved_count          INT           DEFAULT 0,
  closed_count            INT           DEFAULT 0,
  open_count              INT           DEFAULT 0,
  escalated_count         INT           DEFAULT 0,
  sla_breach_count        INT           DEFAULT 0,
  sla_compliance_rate     DECIMAL(5,2),
  avg_resolution_hours    DECIMAL(10,2),
  avg_satisfaction        DECIMAL(3,2),
  critical_count          INT           DEFAULT 0,
  high_count              INT           DEFAULT 0,
  medium_count            INT           DEFAULT 0,
  low_count               INT           DEFAULT 0,
  loaded_at               DATETIME      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (etl_run_id) REFERENCES etl_runs(id) ON DELETE SET NULL,
  UNIQUE KEY uq_month     (report_month)
);

