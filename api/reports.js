// api/reports.js — Unified server-side financial & operational reports summary (SQL-computed)
'use strict';
const { query } = require('../lib/db');
const { ensureMultiTenantSchema } = require('../lib/db-init');
const { withHandler } = require('../lib/http');
const { assertBranchAccess } = require('../lib/authorize');
const { HttpError } = require('../lib/errors');

module.exports = withHandler(async function handler(req, res) {
  await ensureMultiTenantSchema();

  const session = req.session;
  const orgId = session.orgId;

  if (!orgId) {
    throw new HttpError(409, 'NEEDS_LIBRARY', 'No active library session.');
  }

  const { branchId, from, to } = req.query || {};

  // Check branch access if branchId specified
  if (branchId) {
    assertBranchAccess(session, branchId);
  }

  // 1. Total Revenue in period
  const revParams = [orgId];
  let revWhere = "organization_id = $1 AND status = 'recorded' AND voided_at IS NULL";
  if (branchId) {
    revParams.push(branchId);
    revWhere += ` AND branch_id = $${revParams.length}`;
  }
  if (from) {
    revParams.push(from);
    revWhere += ` AND date >= $${revParams.length}`;
  }
  if (to) {
    revParams.push(to);
    revWhere += ` AND date <= $${revParams.length}`;
  }

  const revRes = await query(`SELECT COALESCE(SUM(amount), 0) AS total_revenue, COUNT(*) AS count FROM payments WHERE ${revWhere}`, revParams);
  const totalRevenue = parseFloat(revRes.rows[0].total_revenue);
  const transactionCount = parseInt(revRes.rows[0].count, 10);

  // 2. Revenue grouped by Payment Method
  const revMethodRes = await query(`
    SELECT mode, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
    FROM payments
    WHERE ${revWhere}
    GROUP BY mode
    ORDER BY amount DESC
  `, revParams);

  // 3. Daily Revenue Trend
  const revDailyRes = await query(`
    SELECT date, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
    FROM payments
    WHERE ${revWhere}
    GROUP BY date
    ORDER BY date ASC
  `, revParams);

  // 4. Total Expenses in period
  const expParams = [orgId];
  let expWhere = "organization_id = $1 AND (status = 'active' OR status IS NULL) AND voided_at IS NULL";
  if (branchId) {
    expParams.push(branchId);
    expWhere += ` AND branch_id = $${expParams.length}`;
  }
  if (from) {
    expParams.push(from);
    expWhere += ` AND date >= $${expParams.length}`;
  }
  if (to) {
    expParams.push(to);
    expWhere += ` AND date <= $${expParams.length}`;
  }

  const expRes = await query(`SELECT COALESCE(SUM(amount), 0) AS total_expenses, COUNT(*) AS count FROM expenses WHERE ${expWhere}`, expParams);
  const totalExpenses = parseFloat(expRes.rows[0].total_expenses);
  const expenseCount = parseInt(expRes.rows[0].count, 10);

  // 5. Expenses grouped by Category
  const expCategoryRes = await query(`
    SELECT category, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
    FROM expenses
    WHERE ${expWhere}
    GROUP BY category
    ORDER BY amount DESC
  `, expParams);

  // 6. Net Profit
  const netProfit = totalRevenue - totalExpenses;

  // 7. Active Memberships & Dues Summary
  const memParams = [orgId];
  let memWhere = "m.organization_id = $1 AND m.status = 'active'";
  if (branchId) {
    memParams.push(branchId);
    memWhere += ` AND m.branch_id = $${memParams.length}`;
  }

  const duesRes = await query(`
    SELECT 
      m.id,
      m.student_id,
      m.branch_id,
      m.price,
      m.discount,
      m.final_amount,
      m.payment_status,
      m.start_date,
      m.end_date,
      COALESCE(SUM(p.amount), 0) AS total_paid
    FROM memberships m
    LEFT JOIN payments p ON p.membership_id = m.id AND p.status = 'recorded' AND p.voided_at IS NULL
    WHERE ${memWhere}
    GROUP BY m.id, m.student_id, m.branch_id, m.price, m.discount, m.final_amount, m.payment_status, m.start_date, m.end_date
  `, memParams);

  let totalOutstandingDues = 0;
  const aging = {
    current: 0,   // 0-7 days
    moderate: 0,  // 8-30 days
    severe: 0,    // 30+ days
  };

  const todayDate = new Date();
  for (const row of duesRes.rows) {
    const finalAmount = parseFloat(row.final_amount ?? (Number(row.price) - (Number(row.discount) || 0)));
    const totalPaid = parseFloat(row.total_paid);
    const pending = Math.max(0, finalAmount - totalPaid);

    if (pending > 0) {
      totalOutstandingDues += pending;
      const start = new Date(row.start_date);
      const daysDue = Math.max(0, Math.ceil((todayDate - start) / (1000 * 60 * 60 * 24)));
      if (daysDue <= 7) aging.current += pending;
      else if (daysDue <= 30) aging.moderate += pending;
      else aging.severe += pending;
    }
  }

  res.status(200).json({
    ok: true,
    branchId: branchId || null,
    period: { from: from || null, to: to || null },
    totalRevenue,
    transactionCount,
    totalExpenses,
    expenseCount,
    netProfit,
    totalOutstandingDues,
    aging,
    revenueByMethod: revMethodRes.rows.map(r => ({ method: r.mode, amount: parseFloat(r.amount), count: parseInt(r.count, 10) })),
    dailyRevenue: revDailyRes.rows.map(r => ({ date: r.date, amount: parseFloat(r.amount), count: parseInt(r.count, 10) })),
    expensesByCategory: expCategoryRes.rows.map(r => ({ category: r.category, amount: parseFloat(r.amount), count: parseInt(r.count, 10) }))
  });
}, { methods: ['GET'], auth: true });
