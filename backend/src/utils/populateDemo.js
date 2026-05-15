/**
 * Demo Data Population Script
 * Fills the database with realistic complaint data for all charts and reports.
 * Run: node src/utils/populateDemo.js
 */
require('dotenv').config();
const { pool, testConnection } = require('../config/db');

const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (d) => new Date(Date.now() - d * 86400000);

const COMPLAINTS_DATA = [
  { title: 'Double charged on monthly subscription', category: 'Billing Issues',      priority: 'High',     status: 'Resolved' },
  { title: 'Internet outage affecting entire office', category: 'Service Disruption', priority: 'Critical', status: 'Resolved' },
  { title: 'Received damaged product in shipment',   category: 'Product Defects',     priority: 'Medium',   status: 'Closed' },
  { title: 'Cannot login to customer portal',        category: 'Technical Problems',  priority: 'High',     status: 'Resolved' },
  { title: 'Order delayed by 2 weeks',               category: 'Delivery Delays',     priority: 'Medium',   status: 'Closed' },
  { title: 'Unauthorized transaction on account',    category: 'Account Issues',      priority: 'Critical', status: 'Resolved' },
  { title: 'Support agent was rude during call',     category: 'Customer Service',    priority: 'Low',      status: 'Closed' },
  { title: 'Refund not processed after 30 days',     category: 'Refund Requests',     priority: 'High',     status: 'Escalated' },
  { title: 'App crashes on payment screen',          category: 'Technical Problems',  priority: 'High',     status: 'In Progress' },
  { title: 'Wrong item delivered to address',        category: 'Delivery Delays',     priority: 'Medium',   status: 'Assigned' },
  { title: 'Overcharged on last 3 invoices',         category: 'Billing Issues',      priority: 'High',     status: 'In Progress' },
  { title: 'Service down during business hours',     category: 'Service Disruption',  priority: 'Critical', status: 'Escalated' },
  { title: 'Product missing accessories in box',     category: 'Product Defects',     priority: 'Low',      status: 'Assigned' },
  { title: 'Password reset email not received',      category: 'Account Issues',      priority: 'Medium',   status: 'Resolved' },
  { title: 'Slow response time on support tickets',  category: 'Customer Service',    priority: 'Low',      status: 'Closed' },
  { title: 'Unable to update billing address',       category: 'Account Issues',      priority: 'Medium',   status: 'Open' },
  { title: 'Product warranty claim rejected',        category: 'Product Defects',     priority: 'High',     status: 'Open' },
  { title: 'Payment gateway timeout error',          category: 'Technical Problems',  priority: 'High',     status: 'Resolved' },
  { title: 'Subscription auto-renewed without notice', category: 'Billing Issues',   priority: 'Medium',   status: 'In Progress' },
  { title: 'Delivery tracking not updating',         category: 'Delivery Delays',     priority: 'Low',      status: 'Open' },
  { title: 'Account locked after password reset',    category: 'Account Issues',      priority: 'High',     status: 'Resolved' },
  { title: 'Incorrect charges on annual plan',       category: 'Billing Issues',      priority: 'Medium',   status: 'Assigned' },
  { title: 'Mobile app not compatible with iOS 17',  category: 'Technical Problems',  priority: 'Medium',   status: 'Open' },
  { title: 'Partial delivery received',              category: 'Delivery Delays',     priority: 'Medium',   status: 'In Progress' },
  { title: 'Full refund requested for faulty unit',  category: 'Refund Requests',     priority: 'High',     status: 'Open' },
]

const DESCRIPTIONS = {
  'Billing Issues':      'I have been incorrectly charged on my account. Despite multiple follow-ups with your team, the issue has not been resolved. I am requesting an immediate review of my billing history and a refund for the erroneous charges. This has been ongoing for the past few weeks and is causing financial inconvenience.',
  'Service Disruption':  'We are experiencing a complete service outage at our location. This is severely impacting our business operations and productivity. Multiple users are affected and we have already tried standard troubleshooting steps without success. We need immediate escalation and resolution.',
  'Product Defects':     'The product I received has visible defects and does not match the description on your website. The quality is well below the expected standard and I am unable to use it. I have attached photos for your reference. I am requesting either a replacement or a full refund.',
  'Technical Problems':  'I am encountering a critical technical issue that prevents me from using the service. I have already tried clearing cache, reinstalling the application, and using different browsers. The error persists across all attempts. Please escalate this to your technical team for investigation.',
  'Delivery Delays':     'My order has been delayed significantly beyond the estimated delivery date. I have not received any updates or communication regarding this delay. This is unacceptable given that I paid for express delivery. I need an immediate update on the status of my shipment.',
  'Account Issues':      'I am unable to access my account despite entering the correct credentials. I have attempted the password reset process multiple times without success. This is preventing me from managing my subscription and accessing important documents. Please assist urgently.',
  'Customer Service':    'During my recent interaction with your support team, I experienced extremely poor customer service. The agent was unhelpful, dismissive, and failed to resolve my issue. This experience has significantly reduced my confidence in your company. I expect better service standards.',
  'Refund Requests':     'I submitted a refund request over 30 days ago and have not received any response or processing confirmation. The product was returned as per your return policy. I am requesting an immediate update on my refund status and timeline for processing.',
}

const STATUS_HISTORY = {
  'Open':        ['Open'],
  'Assigned':    ['Open', 'Assigned'],
  'In Progress': ['Open', 'Assigned', 'In Progress'],
  'Escalated':   ['Open', 'Assigned', 'In Progress', 'Escalated'],
  'Resolved':    ['Open', 'Assigned', 'In Progress', 'Resolved'],
  'Closed':      ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'],
}

const AGENT_COMMENTS = [
  'Investigating the issue. Will update within 24 hours.',
  'Reached out to the billing team for clarification.',
  'Issue has been escalated to senior support.',
  'Customer contacted. Awaiting confirmation of resolution.',
  'Technical team is working on a fix.',
  'Replacement order has been initiated.',
  'Refund has been processed. Should reflect within 3-5 business days.',
  'Issue resolved after applying latest patch.',
  'Escalating to supervisor for further review.',
  'Working with the logistics team to locate the shipment.',
]

const populate = async () => {
  await testConnection();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Get required IDs
    const [catRows]      = await conn.query('SELECT id, name FROM categories');
    const [customerRows] = await conn.query("SELECT u.id FROM users u JOIN roles r ON u.role_id=r.id WHERE r.name='Customer'");
    const [agentRows]    = await conn.query("SELECT u.id FROM users u JOIN roles r ON u.role_id=r.id WHERE r.name='Agent'");
    const [adminRows]    = await conn.query("SELECT u.id FROM users u JOIN roles r ON u.role_id=r.id WHERE r.name='Admin'");
    const [slaRows]      = await conn.query('SELECT priority, resolution_time_hours FROM sla_rules');

    const catMap = Object.fromEntries(catRows.map(c => [c.name, c.id]));
    const slaMap = Object.fromEntries(slaRows.map(s => [s.priority, s.resolution_time_hours]));
    const customers = customerRows.map(r => r.id);
    const agents    = agentRows.map(r => r.id);
    const adminId   = adminRows[0]?.id;

    console.log(`\n🌱 Populating demo data...\n`);
    let created = 0;

    for (let i = 0; i < COMPLAINTS_DATA.length; i++) {
      const c = COMPLAINTS_DATA[i];
      const categoryId = catMap[c.category];
      if (!categoryId) { console.log(`  ⚠️  Skipping: category "${c.category}" not found`); continue; }

      const customerId = randomFrom(customers);
      const agentId    = randomFrom(agents);
      const createdDaysAgo = randomBetween(2, 170) // spread over ~6 months
      const createdAt  = daysAgo(createdDaysAgo)
      const slaHours   = slaMap[c.priority] || 48
      const slaDueAt   = new Date(createdAt.getTime() + slaHours * 3600000)
      const isBreached = slaDueAt < new Date() && !['Resolved','Closed'].includes(c.status)

      // Set resolved/closed timestamps
      const resolvedAt = ['Resolved','Closed'].includes(c.status)
        ? new Date(createdAt.getTime() + randomBetween(2, slaHours - 1) * 3600000) : null
      const closedAt   = c.status === 'Closed'
        ? new Date(resolvedAt.getTime() + randomBetween(12, 48) * 3600000) : null

      const assignedTo = ['Assigned','In Progress','Escalated','Resolved','Closed'].includes(c.status) ? agentId : null

      const year = createdAt.getFullYear()
      const [countRows] = await conn.query('SELECT COUNT(*) AS cnt FROM complaints WHERE YEAR(created_at) = ?', [year])
      const seq = String(countRows[0].cnt + 1).padStart(4, '0')
      const complaintNumber = `CMP-${year}-${seq}`

      const desc = DESCRIPTIONS[c.category] || 'Please resolve this issue as soon as possible.'

      const [result] = await conn.query(
        `INSERT INTO complaints
          (complaint_number, customer_id, category_id, title, description, priority, status,
           assigned_to, sla_breach, sla_due_at, resolved_at, closed_at, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [complaintNumber, customerId, categoryId, c.title, desc, c.priority, c.status,
         assignedTo, isBreached, slaDueAt, resolvedAt, closedAt, createdAt, createdAt]
      )

      const complaintId = result.insertId

      // Insert history entries
      const statuses = STATUS_HISTORY[c.status] || ['Open']
      let prevStatus = null
      for (let s = 0; s < statuses.length; s++) {
        const histTime = new Date(createdAt.getTime() + s * randomBetween(2, 8) * 3600000)
        const updatedBy = s === 0 ? customerId : (s === statuses.length - 1 ? adminId : agentId)
        const comment = s === 0 ? 'Complaint submitted by customer' : randomFrom(AGENT_COMMENTS)
        await conn.query(
          `INSERT INTO complaint_history (complaint_id, updated_by, old_status, new_status, comment, created_at)
           VALUES (?,?,?,?,?,?)`,
          [complaintId, updatedBy, prevStatus, statuses[s], comment, histTime]
        )
        prevStatus = statuses[s]
      }

      // Add feedback for resolved/closed
      if (['Resolved','Closed'].includes(c.status) && Math.random() > 0.3) {
        const rating = randomBetween(3, 5)
        const feedbackComments = [
          'Issue was resolved quickly. Very satisfied!',
          'Good support, could have been faster.',
          'Thank you for the prompt resolution.',
          'Acceptable service. Room for improvement.',
          'Excellent support team, very professional.',
        ]
        await conn.query(
          `INSERT IGNORE INTO feedback (complaint_id, customer_id, rating, comments, created_at)
           VALUES (?,?,?,?,?)`,
          [complaintId, customerId, rating, randomFrom(feedbackComments), closedAt || resolvedAt]
        )
      }

      // Notifications
      await conn.query(
        `INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [customerId, `Complaint ${complaintNumber} Registered`,
         `Your complaint "${c.title}" has been received.`,
         'complaint_created', 'complaint', complaintId, createdAt]
      )
      if (assignedTo) {
        await conn.query(
          `INSERT INTO notifications (user_id, title, message, type, related_type, related_id, created_at)
           VALUES (?,?,?,?,?,?,?)`,
          [assignedTo, `Complaint Assigned: ${complaintNumber}`,
           `You have been assigned complaint "${c.title}"`,
           'complaint_assigned', 'complaint', complaintId, createdAt]
        )
      }

      created++
      console.log(`  ✅ ${complaintNumber} — ${c.title} [${c.status}]`)
    }

    await conn.commit();
    console.log(`\n🎉 Done! Created ${created} complaints with history, feedback & notifications.\n`)
    console.log('📊 Refresh your dashboard — charts should now show real data!\n')

  } catch (err) {
    await conn.rollback();
    console.error('❌ Failed:', err.message);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

populate();
