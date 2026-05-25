/**
 * Analytics Controller — Phase 2
 * Serves data from ETL-populated analytics tables.
 */
const { pool } = require('../config/db');

// ─────────────────────────────────────────────────────────
// Helper: run a query and return rows
// ─────────────────────────────────────────────────────────
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// ─────────────────────────────────────────────────────────
// GET /api/analytics/summary
// Monthly summary — totals, SLA compliance, avg resolution
// ─────────────────────────────────────────────────────────
exports.getMonthlySummary = async (req, res) => {
  try {
    const rows = await query(
      `SELECT report_month, total_complaints, resolved_count, closed_count,
              open_count, escalated_count, sla_breach_count, sla_compliance_rate,
              avg_resolution_hours, avg_satisfaction,
              critical_count, high_count, medium_count, low_count
       FROM monthly_summary_analytics
       ORDER BY report_month ASC`
    );

    // Overall totals across all months
    const totals = rows.reduce(
      (acc, r) => {
        acc.total_complaints  += r.total_complaints;
        acc.resolved_count    += r.resolved_count + r.closed_count;
        acc.sla_breach_count  += r.sla_breach_count;
        acc.escalated_count   += r.escalated_count;
        return acc;
      },
      { total_complaints: 0, resolved_count: 0, sla_breach_count: 0, escalated_count: 0 }
    );

    const totalSlaCompliance = rows.length
      ? Math.round(
          rows.reduce((s, r) => s + parseFloat(r.sla_compliance_rate || 0), 0) / rows.length
        )
      : 0;

    const avgResolution = rows.length
      ? (
          rows.reduce((s, r) => s + parseFloat(r.avg_resolution_hours || 0), 0) / rows.length
        ).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        monthly: rows,
        totals: {
          ...totals,
          avg_sla_compliance: totalSlaCompliance,
          avg_resolution_hours: avgResolution,
        },
      },
    });
  } catch (err) {
    console.error('getMonthlySummary error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/analytics/sla
// SLA breach details — list of breached complaints
// Query params: priority, month, page, limit
// ─────────────────────────────────────────────────────────
exports.getSLAReport = async (req, res) => {
  try {
    const { priority, month, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    if (priority) { where.push('priority = ?'); params.push(priority); }
    if (month)    { where.push('report_month = ?'); params.push(month); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Breach summary stats
    const stats = await query(
      `SELECT
         COUNT(*) AS total_complaints,
         SUM(sla_breached) AS total_breaches,
         ROUND(AVG(CASE WHEN sla_breached=1 THEN breach_hours END), 1) AS avg_breach_hours,
         ROUND(AVG(resolution_hours), 1) AS avg_resolution_hours,
         ROUND((1 - SUM(sla_breached)/COUNT(*)) * 100, 1) AS compliance_rate
       FROM sla_analytics ${whereClause}`,
      params
    );

    // Breach counts by priority
    const byPriority = await query(
      `SELECT priority,
              COUNT(*) AS total,
              SUM(sla_breached) AS breaches,
              ROUND(AVG(resolution_hours),1) AS avg_resolution_hours
       FROM sla_analytics ${whereClause}
       GROUP BY priority
       ORDER BY FIELD(priority,'Critical','High','Medium','Low')`,
      params
    );

    // Breached complaints detail (paginated)
    const breachWhere = where.length
      ? `WHERE sla_breached=1 AND ${where.join(' AND ')}`
      : 'WHERE sla_breached=1';

    const [breachedRows] = await pool.execute(
      `SELECT complaint_number, category, priority, status, assigned_agent,
              created_at, sla_due_at, resolved_at, resolution_hours,
              breach_hours, satisfaction_rating
       FROM sla_analytics
       ${breachWhere}
       ORDER BY breach_hours DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}`,
      params
    );

    const [countRow] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM sla_analytics ${breachWhere}`,
      params
    );

    res.json({
      success: true,
      data: {
        stats: stats[0],
        byPriority,
        breachedComplaints: breachedRows,
        pagination: {
          total: countRow[0].cnt,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(countRow[0].cnt / parseInt(limit)),
        },
      },
    });
  } catch (err) {
    console.error('getSLAReport error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/analytics/categories
// Category breakdown — totals, resolution rate, avg time
// Query params: month
// ─────────────────────────────────────────────────────────
exports.getCategoryAnalysis = async (req, res) => {
  try {
    const { month } = req.query;
    const where  = month ? 'WHERE report_month = ?' : '';
    const params = month ? [month] : [];

    // Aggregated across all months (or filtered month)
    const byCategory = await query(
      `SELECT category,
              SUM(total_complaints)   AS total_complaints,
              SUM(resolved_count)     AS resolved_count,
              SUM(open_count)         AS open_count,
              SUM(escalated_count)    AS escalated_count,
              SUM(sla_breach_count)   AS sla_breach_count,
              ROUND(AVG(avg_resolution_hours), 1) AS avg_resolution_hours,
              ROUND(AVG(avg_satisfaction), 2)     AS avg_satisfaction
       FROM category_analytics ${where}
       GROUP BY category
       ORDER BY total_complaints DESC`,
      params
    );

    // Monthly trend per category (for chart)
    const trend = await query(
      `SELECT report_month, category, total_complaints, resolved_count, sla_breach_count
       FROM category_analytics
       ORDER BY report_month ASC, total_complaints DESC`
    );

    res.json({
      success: true,
      data: { byCategory, trend },
    });
  } catch (err) {
    console.error('getCategoryAnalysis error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/analytics/agents
// Agent performance — resolution rate, SLA compliance, avg time
// Query params: month
// ─────────────────────────────────────────────────────────
exports.getAgentPerformance = async (req, res) => {
  try {
    const { month } = req.query;
    const where  = month ? 'WHERE report_month = ?' : '';
    const params = month ? [month] : [];

    // Overall per-agent summary
    const agents = await query(
      `SELECT agent_name,
              SUM(total_assigned)        AS total_assigned,
              SUM(total_resolved)        AS total_resolved,
              SUM(total_escalated)       AS total_escalated,
              SUM(sla_met_count)         AS sla_met_count,
              SUM(sla_breached_count)    AS sla_breached_count,
              ROUND(AVG(avg_resolution_hours), 1) AS avg_resolution_hours,
              ROUND(AVG(avg_satisfaction), 2)     AS avg_satisfaction,
              ROUND(SUM(total_resolved)/SUM(total_assigned)*100, 1) AS resolution_rate,
              ROUND(SUM(sla_met_count)/SUM(total_assigned)*100, 1)  AS sla_compliance_rate
       FROM agent_performance_analytics ${where}
       GROUP BY agent_name
       ORDER BY resolution_rate DESC`,
      params
    );

    // Monthly trend per agent
    const trend = await query(
      `SELECT report_month, agent_name, total_assigned, total_resolved,
              resolution_rate, sla_compliance_rate
       FROM agent_performance_analytics
       ORDER BY report_month ASC`
    );

    res.json({
      success: true,
      data: { agents, trend },
    });
  } catch (err) {
    console.error('getAgentPerformance error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/analytics/resolution-trends
// Resolution time trends over months + priority breakdown
// ─────────────────────────────────────────────────────────
exports.getResolutionTrends = async (req, res) => {
  try {
    // Monthly avg resolution hours
    const monthly = await query(
      `SELECT report_month,
              ROUND(avg_resolution_hours, 1) AS avg_resolution_hours,
              ROUND(avg_satisfaction, 2)     AS avg_satisfaction,
              sla_compliance_rate,
              total_complaints,
              resolved_count + closed_count  AS total_resolved
       FROM monthly_summary_analytics
       ORDER BY report_month ASC`
    );

    // Resolution time by priority (from sla_analytics)
    const byPriority = await query(
      `SELECT priority,
              COUNT(*) AS total,
              ROUND(AVG(resolution_hours), 1)      AS avg_resolution_hours,
              ROUND(MIN(resolution_hours), 1)      AS min_resolution_hours,
              ROUND(MAX(resolution_hours), 1)      AS max_resolution_hours,
              SUM(sla_breached)                    AS breach_count,
              ROUND(AVG(satisfaction_rating), 2)   AS avg_satisfaction
       FROM sla_analytics
       WHERE resolution_hours IS NOT NULL
       GROUP BY priority
       ORDER BY FIELD(priority,'Critical','High','Medium','Low')`
    );

    // Resolution time by category
    const byCategory = await query(
      `SELECT category,
              ROUND(AVG(avg_resolution_hours), 1) AS avg_resolution_hours,
              SUM(total_complaints)               AS total_complaints,
              ROUND(AVG(avg_satisfaction), 2)     AS avg_satisfaction
       FROM category_analytics
       GROUP BY category
       ORDER BY avg_resolution_hours ASC`
    );

    // Last ETL run info
    const etlRuns = await query(
      `SELECT id, run_at, records_loaded, status, duration_seconds
       FROM etl_runs ORDER BY run_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      data: { monthly, byPriority, byCategory, etlRuns },
    });
  } catch (err) {
    console.error('getResolutionTrends error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
