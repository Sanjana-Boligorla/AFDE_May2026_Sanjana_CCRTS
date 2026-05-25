"""
ETL Pipeline - Customer Complaint & Resolution Tracking System
Phase 2

Stages:
  1. EXTRACT  — Read CSV dataset into a Pandas DataFrame
  2. TRANSFORM — Clean fields, compute SLA metrics, derive aggregations
  3. LOAD      — Insert processed records into MySQL analytics tables

Usage:
  cd etl
  pip install -r requirements.txt
  python etl_pipeline.py                        # uses datasets/complaints_dataset.csv
  python etl_pipeline.py --file path/to/file.csv
"""

import os
import sys
import time
import argparse
import logging
from datetime import datetime, timedelta

import pandas as pd
import mysql.connector
from dotenv import dotenv_values

# ─────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("ETL")

# ─────────────────────────────────────────────────────────
# DB connection  (reads backend/.env)
# ─────────────────────────────────────────────────────────
def get_db_connection():
    env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
    cfg = dotenv_values(env_path)
    return mysql.connector.connect(
        host     = cfg.get("DB_HOST", "localhost"),
        port     = int(cfg.get("DB_PORT", 3306)),
        user     = cfg.get("DB_USER", "root"),
        password = cfg.get("DB_PASSWORD", ""),
        database = cfg.get("DB_NAME", "complaint_tracker"),
    )

# ─────────────────────────────────────────────────────────
# SLA hours mapping
# ─────────────────────────────────────────────────────────
SLA_HOURS = {"Low": 72, "Medium": 48, "High": 24, "Critical": 8}

# ══════════════════════════════════════════════════════════
# STAGE 1 — EXTRACT
# ══════════════════════════════════════════════════════════
def extract(file_path: str) -> pd.DataFrame:
    log.info(f"[EXTRACT] Reading: {file_path}")
    df = pd.read_csv(file_path)
    original_count = len(df)
    log.info(f"[EXTRACT] Loaded {original_count} rows, {len(df.columns)} columns")
    log.info(f"[EXTRACT] Columns: {list(df.columns)}")
    return df, original_count


# ══════════════════════════════════════════════════════════
# STAGE 2 — TRANSFORM
# ══════════════════════════════════════════════════════════
def transform(df: pd.DataFrame):
    log.info("[TRANSFORM] Starting transformations...")
    df = df.copy()

    # ── 2.1 Standardise column names ──────────────────────
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # ── 2.2 Drop fully-empty rows ─────────────────────────
    before = len(df)
    df.dropna(how="all", inplace=True)
    log.info(f"[TRANSFORM] Dropped {before - len(df)} fully-empty rows")

    # ── 2.3 Parse dates ───────────────────────────────────
    for col in ["created_at", "sla_due_at", "resolved_at", "closed_at"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce")

    # ── 2.4 Standardise priority & status casing ──────────
    df["priority"] = df["priority"].str.strip().str.title()
    df["status"]   = df["status"].str.strip().str.title()
    df["category"] = df["category"].str.strip()

    # ── 2.5 Fill SLA hours from lookup ───────────────────
    df["sla_hours_limit"] = df["priority"].map(SLA_HOURS).fillna(48).astype(int)

    # ── 2.6 Recompute sla_breached flag ───────────────────
    now = pd.Timestamp.now()
    resolved_statuses = ["Resolved", "Closed"]

    def compute_breached(row):
        if pd.isna(row.get("sla_due_at")):
            return 0
        if row["status"] in resolved_statuses:
            if pd.notna(row.get("resolved_at")):
                return int(row["resolved_at"] > row["sla_due_at"])
            return 0
        return int(now > row["sla_due_at"])

    df["sla_breached"] = df.apply(compute_breached, axis=1)

    # ── 2.7 Compute resolution_hours (if missing) ─────────
    if "resolution_hours" in df.columns:
        mask = df["resolution_hours"].isna() & df["resolved_at"].notna() & df["created_at"].notna()
        df.loc[mask, "resolution_hours"] = (
            (df.loc[mask, "resolved_at"] - df.loc[mask, "created_at"])
            .dt.total_seconds() / 3600
        ).round(2)
    else:
        df["resolution_hours"] = None
        mask = df["resolved_at"].notna() & df["created_at"].notna()
        df.loc[mask, "resolution_hours"] = (
            (df.loc[mask, "resolved_at"] - df.loc[mask, "created_at"])
            .dt.total_seconds() / 3600
        ).round(2)

    df["resolution_hours"] = pd.to_numeric(df["resolution_hours"], errors="coerce")

    # ── 2.8 Breach hours (hours over SLA, if breached) ────
    def breach_hours(row):
        if not row["sla_breached"]:
            return None
        if row["status"] in resolved_statuses and pd.notna(row.get("resolved_at")):
            delta = (row["resolved_at"] - row["sla_due_at"]).total_seconds() / 3600
        else:
            delta = (now - row["sla_due_at"]).total_seconds() / 3600
        return round(max(delta, 0), 2)

    df["breach_hours"] = df.apply(breach_hours, axis=1)

    # ── 2.9 Satisfaction rating: coerce to int or None ────
    if "satisfaction_rating" not in df.columns:
        df["satisfaction_rating"] = None
    df["satisfaction_rating"] = pd.to_numeric(df["satisfaction_rating"], errors="coerce")

    # ── 2.10 Derive report_month ──────────────────────────
    df["report_month"] = df["created_at"].dt.strftime("%Y-%m")

    # ── 2.11 Assigned_agent: empty string → None ─────────
    if "assigned_agent" not in df.columns:
        df["assigned_agent"] = None
    df["assigned_agent"] = df["assigned_agent"].replace("", None)

    transformed_count = len(df)
    log.info(f"[TRANSFORM] Complete — {transformed_count} rows ready to load")
    log.info(f"[TRANSFORM] SLA breaches: {df['sla_breached'].sum()} / {len(df)}")
    log.info(f"[TRANSFORM] Avg resolution hours: {df['resolution_hours'].mean():.1f}h")

    return df, transformed_count


# ══════════════════════════════════════════════════════════
# STAGE 3 — LOAD
# ══════════════════════════════════════════════════════════
def load(df: pd.DataFrame, extracted: int, transformed: int, source_file: str):
    log.info("[LOAD] Connecting to MySQL...")
    conn   = get_db_connection()
    cursor = conn.cursor()
    loaded = 0
    start  = time.time()

    try:
        # ── 3.0 Log ETL run ───────────────────────────────
        cursor.execute(
            """INSERT INTO etl_runs
               (source_file, records_extracted, records_transformed, records_loaded, status)
               VALUES (%s, %s, %s, %s, 'partial')""",
            (os.path.basename(source_file), extracted, transformed, 0),
        )
        etl_run_id = cursor.lastrowid
        conn.commit()
        log.info(f"[LOAD] ETL run ID: {etl_run_id}")

        # ── 3.1 Truncate analytics tables for fresh load ──
        for tbl in [
            "sla_analytics",
            "category_analytics",
            "agent_performance_analytics",
            "monthly_summary_analytics",
        ]:
            cursor.execute(f"DELETE FROM {tbl}")
        conn.commit()
        log.info("[LOAD] Cleared existing analytics data")

        # ── 3.2 Load sla_analytics ───────────────────────
        log.info("[LOAD] Loading sla_analytics...")
        sla_rows = 0
        for _, row in df.iterrows():
            def v(col):
                val = row.get(col)
                if pd.isna(val) if not isinstance(val, str) else (val is None or val == ""):
                    return None
                if isinstance(val, pd.Timestamp):
                    return val.to_pydatetime()
                return val

            cursor.execute(
                """INSERT INTO sla_analytics
                   (etl_run_id, complaint_number, category, priority, status,
                    assigned_agent, created_at, sla_due_at, resolved_at,
                    resolution_hours, sla_breached, sla_hours_limit, breach_hours,
                    satisfaction_rating)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    etl_run_id,
                    v("complaint_number"), v("category"), v("priority"), v("status"),
                    v("assigned_agent"),
                    v("created_at"), v("sla_due_at"), v("resolved_at"),
                    v("resolution_hours"), int(row["sla_breached"]),
                    int(row["sla_hours_limit"]),
                    v("breach_hours"), v("satisfaction_rating"),
                ),
            )
            sla_rows += 1

        conn.commit()
        log.info(f"[LOAD] sla_analytics: {sla_rows} rows")

        # ── 3.3 Category analytics (monthly aggregation) ──
        log.info("[LOAD] Loading category_analytics...")
        cat_agg = (
            df.groupby(["report_month", "category"])
            .agg(
                total_complaints    = ("complaint_number", "count"),
                resolved_count      = ("status", lambda x: (x.isin(["Resolved","Closed"])).sum()),
                open_count          = ("status", lambda x: (x == "Open").sum()),
                escalated_count     = ("status", lambda x: (x == "Escalated").sum()),
                sla_breach_count    = ("sla_breached", "sum"),
                avg_resolution_hours= ("resolution_hours", "mean"),
                avg_satisfaction    = ("satisfaction_rating", "mean"),
            )
            .reset_index()
        )

        cat_rows = 0
        for _, row in cat_agg.iterrows():
            cursor.execute(
                """INSERT INTO category_analytics
                   (etl_run_id, report_month, category, total_complaints, resolved_count,
                    open_count, escalated_count, sla_breach_count,
                    avg_resolution_hours, avg_satisfaction)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    etl_run_id,
                    row["report_month"], row["category"],
                    int(row["total_complaints"]), int(row["resolved_count"]),
                    int(row["open_count"]), int(row["escalated_count"]),
                    int(row["sla_breach_count"]),
                    round(row["avg_resolution_hours"], 2) if pd.notna(row["avg_resolution_hours"]) else None,
                    round(row["avg_satisfaction"], 2) if pd.notna(row["avg_satisfaction"]) else None,
                ),
            )
            cat_rows += 1

        conn.commit()
        log.info(f"[LOAD] category_analytics: {cat_rows} rows")

        # ── 3.4 Agent performance analytics ───────────────
        log.info("[LOAD] Loading agent_performance_analytics...")
        agent_df = df[df["assigned_agent"].notna()].copy()

        agent_agg = (
            agent_df.groupby(["report_month", "assigned_agent"])
            .agg(
                total_assigned   = ("complaint_number", "count"),
                total_resolved   = ("status", lambda x: (x.isin(["Resolved","Closed"])).sum()),
                total_escalated  = ("status", lambda x: (x == "Escalated").sum()),
                sla_met_count    = ("sla_breached", lambda x: (x == 0).sum()),
                sla_breached_count = ("sla_breached", "sum"),
                avg_resolution_hours = ("resolution_hours", "mean"),
                avg_satisfaction = ("satisfaction_rating", "mean"),
            )
            .reset_index()
        )

        agent_rows = 0
        for _, row in agent_agg.iterrows():
            total = row["total_assigned"]
            res_rate = round(row["total_resolved"] / total * 100, 2) if total > 0 else 0
            sla_rate = round(row["sla_met_count"] / total * 100, 2) if total > 0 else 0

            cursor.execute(
                """INSERT INTO agent_performance_analytics
                   (etl_run_id, report_month, agent_name, total_assigned, total_resolved,
                    total_escalated, sla_met_count, sla_breached_count,
                    avg_resolution_hours, avg_satisfaction, resolution_rate, sla_compliance_rate)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (
                    etl_run_id,
                    row["report_month"], row["assigned_agent"],
                    int(total), int(row["total_resolved"]),
                    int(row["total_escalated"]), int(row["sla_met_count"]),
                    int(row["sla_breached_count"]),
                    round(row["avg_resolution_hours"], 2) if pd.notna(row["avg_resolution_hours"]) else None,
                    round(row["avg_satisfaction"], 2) if pd.notna(row["avg_satisfaction"]) else None,
                    res_rate, sla_rate,
                ),
            )
            agent_rows += 1

        conn.commit()
        log.info(f"[LOAD] agent_performance_analytics: {agent_rows} rows")

        # ── 3.5 Monthly summary analytics ─────────────────
        log.info("[LOAD] Loading monthly_summary_analytics...")
        monthly_agg = (
            df.groupby("report_month")
            .agg(
                total_complaints    = ("complaint_number", "count"),
                resolved_count      = ("status", lambda x: (x == "Resolved").sum()),
                closed_count        = ("status", lambda x: (x == "Closed").sum()),
                open_count          = ("status", lambda x: (x == "Open").sum()),
                escalated_count     = ("status", lambda x: (x == "Escalated").sum()),
                sla_breach_count    = ("sla_breached", "sum"),
                avg_resolution_hours= ("resolution_hours", "mean"),
                avg_satisfaction    = ("satisfaction_rating", "mean"),
                critical_count      = ("priority", lambda x: (x == "Critical").sum()),
                high_count          = ("priority", lambda x: (x == "High").sum()),
                medium_count        = ("priority", lambda x: (x == "Medium").sum()),
                low_count           = ("priority", lambda x: (x == "Low").sum()),
            )
            .reset_index()
        )

        monthly_rows = 0
        for _, row in monthly_agg.iterrows():
            total = row["total_complaints"]
            breaches = row["sla_breach_count"]
            sla_compliance = round((total - breaches) / total * 100, 2) if total > 0 else 100

            cursor.execute(
                """INSERT INTO monthly_summary_analytics
                   (etl_run_id, report_month, total_complaints, resolved_count, closed_count,
                    open_count, escalated_count, sla_breach_count, sla_compliance_rate,
                    avg_resolution_hours, avg_satisfaction,
                    critical_count, high_count, medium_count, low_count)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                   ON DUPLICATE KEY UPDATE
                     total_complaints    = VALUES(total_complaints),
                     resolved_count      = VALUES(resolved_count),
                     closed_count        = VALUES(closed_count),
                     open_count          = VALUES(open_count),
                     escalated_count     = VALUES(escalated_count),
                     sla_breach_count    = VALUES(sla_breach_count),
                     sla_compliance_rate = VALUES(sla_compliance_rate),
                     avg_resolution_hours= VALUES(avg_resolution_hours),
                     avg_satisfaction    = VALUES(avg_satisfaction),
                     critical_count      = VALUES(critical_count),
                     high_count          = VALUES(high_count),
                     medium_count        = VALUES(medium_count),
                     low_count           = VALUES(low_count)""",
                (
                    etl_run_id,
                    row["report_month"],
                    int(total),
                    int(row["resolved_count"]), int(row["closed_count"]),
                    int(row["open_count"]), int(row["escalated_count"]),
                    int(breaches), sla_compliance,
                    round(row["avg_resolution_hours"], 2) if pd.notna(row["avg_resolution_hours"]) else None,
                    round(row["avg_satisfaction"], 2) if pd.notna(row["avg_satisfaction"]) else None,
                    int(row["critical_count"]), int(row["high_count"]),
                    int(row["medium_count"]), int(row["low_count"]),
                ),
            )
            monthly_rows += 1

        conn.commit()
        log.info(f"[LOAD] monthly_summary_analytics: {monthly_rows} rows")

        # ── 3.6 Update ETL run record ──────────────────────
        loaded = sla_rows
        duration = round(time.time() - start, 3)
        cursor.execute(
            """UPDATE etl_runs SET records_loaded=%s, status='success', duration_seconds=%s
               WHERE id=%s""",
            (loaded, duration, etl_run_id),
        )
        conn.commit()

        log.info(f"[LOAD] Done in {duration}s — {loaded} detail rows + aggregations loaded")

    except Exception as e:
        conn.rollback()
        log.error(f"[LOAD] Error: {e}")
        try:
            cursor.execute(
                "UPDATE etl_runs SET status='failed', error_message=%s WHERE id=%s",
                (str(e), etl_run_id),
            )
            conn.commit()
        except Exception:
            pass
        raise
    finally:
        cursor.close()
        conn.close()

    return loaded


# ══════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="Complaint ETL Pipeline")
    parser.add_argument(
        "--file", "-f",
        default=os.path.join(os.path.dirname(__file__), "..", "datasets", "complaints_dataset.csv"),
        help="Path to the CSV input file",
    )
    args = parser.parse_args()

    file_path = os.path.abspath(args.file)
    if not os.path.exists(file_path):
        log.error(f"File not found: {file_path}")
        sys.exit(1)

    log.info("=" * 60)
    log.info("  COMPLAINT TRACKER — ETL PIPELINE")
    log.info("=" * 60)

    total_start = time.time()

    # Stage 1 — Extract
    df, extracted = extract(file_path)

    # Stage 2 — Transform
    df, transformed = transform(df)

    # Stage 3 — Load
    loaded = load(df, extracted, transformed, file_path)

    total_time = round(time.time() - total_start, 2)
    log.info("=" * 60)
    log.info(f"  ETL COMPLETE in {total_time}s")
    log.info(f"  Extracted:   {extracted} records")
    log.info(f"  Transformed: {transformed} records")
    log.info(f"  Loaded:      {loaded} detail records + aggregations")
    log.info("=" * 60)


if __name__ == "__main__":
    main()
