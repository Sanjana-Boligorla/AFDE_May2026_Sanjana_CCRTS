const { pool } = require('../config/db');

// GET /api/dashboard/stats
const getStats = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    // Overall complaint counts
    const [totals] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'Open') AS open,
        SUM(status = 'Assigned') AS assigned,
        SUM(status = 'In Progress') AS in_progress,
        SUM(status = 'Escalated') AS escalated,
        SUM(status = 'Resolved') AS resolved,
        SUM(status = 'Closed') AS closed,
        SUM(status = 'Pending Customer Response') AS pending,
        SUM(sla_breach = 1) AS sla_breaches
      FROM complaints
      ${role === 'Agent' ? 'WHERE assigned_to = ?' : ''}
    `, role === 'Agent' ? [userId] : []);

    // Average resolution time (hours)
    const [avgRes] = await pool.query(`
      SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)), 1) AS avg_resolution_hours
      FROM complaints WHERE resolved_at IS NOT NULL
      ${role === 'Agent' ? 'AND assigned_to = ?' : ''}
    `, role === 'Agent' ? [userId] : []);

    // Monthly trend (last 6 months)
    const [monthlyTrend] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%b %Y') AS month,
        DATE_FORMAT(created_at, '%Y-%m') AS month_key,
        COUNT(*) AS total,
        SUM(status IN ('Resolved','Closed')) AS resolved
      FROM complaints
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month_key, month
      ORDER BY month_key ASC
    `);

    // By category
    const [byCategory] = await pool.query(`
      SELECT cat.name AS category, COUNT(c.id) AS count
      FROM complaints c
      JOIN categories cat ON c.category_id = cat.id
      GROUP BY cat.id, cat.name
      ORDER BY count DESC
      LIMIT 8
    `);

    // By priority
    const [byPriority] = await pool.query(`
      SELECT priority, COUNT(*) AS count
      FROM complaints
      GROUP BY priority
      ORDER BY FIELD(priority, 'Critical','High','Medium','Low')
    `);

    // By status
    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM complaints
      GROUP BY status
    `);

    // Agent performance (Admin/Supervisor only)
    let agentPerformance = [];
    if (['Admin', 'Supervisor'].includes(role)) {
      const [agents] = await pool.query(`
        SELECT
          u.name,
          COUNT(c.id) AS total_assigned,
          SUM(c.status IN ('Resolved','Closed')) AS resolved,
          SUM(c.status NOT IN ('Resolved','Closed') AND c.sla_breach = 1) AS sla_breaches,
          ROUND(AVG(TIMESTAMPDIFF(HOUR, c.created_at, c.resolved_at)), 1) AS avg_resolution_hours
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN complaints c ON c.assigned_to = u.id
        WHERE r.name = 'Agent' AND u.is_active = TRUE
        GROUP BY u.id, u.name
        ORDER BY resolved DESC
      `);
      agentPerformance = agents;
    }

    // Recent complaints
    const [recent] = await pool.query(`
      SELECT c.id, c.complaint_number, c.title, c.status, c.priority, c.created_at,
             u.name AS customer_name, cat.name AS category
      FROM complaints c
      JOIN users u ON c.customer_id = u.id
      JOIN categories cat ON c.category_id = cat.id
      ${role === 'Agent' ? 'WHERE c.assigned_to = ?' : ''}
      ORDER BY c.created_at DESC LIMIT 5
    `, role === 'Agent' ? [userId] : []);

    // SLA compliance %
    const slaCompliance = totals[0].total > 0
      ? Math.round(((totals[0].total - totals[0].sla_breaches) / totals[0].total) * 100)
      : 100;

    res.json({
      success: true,
      data: {
        totals: totals[0],
        avgResolutionHours: avgRes[0].avg_resolution_hours || 0,
        slaCompliance,
        monthlyTrend,
        byCategory,
        byPriority,
        byStatus,
        agentPerformance,
        recentComplaints: recent,
      },
    });
  } catch (err) { next(err); }
};

// GET /api/dashboard/sla-breaches
const getSLABreaches = async (req, res, next) => {
  try {
    // Auto-mark SLA breaches for overdue complaints
    await pool.query(`
      UPDATE complaints
      SET sla_breach = TRUE
      WHERE sla_due_at < NOW()
        AND sla_breach = FALSE
        AND status NOT IN ('Resolved','Closed')
    `);

    const [breaches] = await pool.query(`
      SELECT c.id, c.complaint_number, c.title, c.priority, c.status,
             c.sla_due_at, c.created_at,
             u.name AS customer_name,
             ag.name AS agent_name,
             TIMESTAMPDIFF(HOUR, c.sla_due_at, NOW()) AS hours_overdue
      FROM complaints c
      JOIN users u ON c.customer_id = u.id
      LEFT JOIN users ag ON c.assigned_to = ag.id
      WHERE c.sla_breach = TRUE AND c.status NOT IN ('Resolved','Closed')
      ORDER BY hours_overdue DESC
    `);

    res.json({ success: true, data: { breaches } });
  } catch (err) { next(err); }
};

module.exports = { getStats, getSLABreaches };
