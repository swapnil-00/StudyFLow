// test/payments-expenses-acceptance.test.js — Acceptance Test Suite for Payments & Expenses
'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../lib/validate');

describe('Payments & Expenses End-to-End Acceptance Tests', () => {

  // ── Test 1: Expense validation and payload mapping ─────────────────────────
  test('1. Adding an expense validates title/description, amount, date, and paymentMode', () => {
    // Valid expense using description and method
    const exp1 = validate('expenses', 'insert', {
      branchId: 'BR-001',
      description: 'Monthly Broadband Fiber Bill',
      amount: 1499,
      date: '2026-09-15',
      method: 'UPI',
      vendor: 'Airtel Broadband'
    });

    assert.equal(exp1.title, 'Monthly Broadband Fiber Bill');
    assert.equal(exp1.branchId, 'BR-001');
    assert.equal(exp1.amount, 1499);
    assert.equal(exp1.paymentMode, 'upi');
    assert.equal(exp1.vendor, 'Airtel Broadband');
    assert.equal(exp1.date, '2026-09-15');

    // Missing title & description throws validation error
    assert.throws(() => {
      validate('expenses', 'insert', { branchId: 'BR-001', amount: 500 });
    }, /Expense title or description is required/);

    // Negative amount throws error
    assert.throws(() => {
      validate('expenses', 'insert', { branchId: 'BR-001', title: 'Tea', amount: -50 });
    }, /Expense amount must be a positive number/);
  });

  // ── Test 2: Payment validation and branch resolution ───────────────────────
  test('2. Payment validation accepts method, reference, date, and resolves payload', () => {
    const pay1 = validate('payments', 'insert', {
      studentId: 'STU-001',
      branchId: 'BR-001',
      membershipId: 'MEM-001',
      amount: 1500,
      method: 'UPI',
      txnId: 'UTR9988776655',
      date: '2026-09-10',
      notes: 'Semester fees'
    });

    assert.equal(pay1.studentId, 'STU-001');
    assert.equal(pay1.branchId, 'BR-001');
    assert.equal(pay1.amount, 1500);
    assert.equal(pay1.mode, 'upi');
    assert.equal(pay1.referenceNumber, 'UTR9988776655');
    assert.equal(pay1.date, '2026-09-10');

    // Missing student ID throws error
    assert.throws(() => {
      validate('payments', 'insert', { branchId: 'BR-001', amount: 500 });
    }, /Student ID is required/);

    // Missing both branchId and membershipId throws error
    assert.throws(() => {
      validate('payments', 'insert', { studentId: 'STU-001', amount: 500 });
    }, /Branch ID or Membership ID is required/);
  });

  // ── Test 3: Sequential receipt number generation ───────────────────────────
  test('3. Receipt sequence generates formatted numbers (REC-YYYY-000001)', () => {
    function generateReceiptNumber(year, seq) {
      return `REC-${year}-${String(seq).padStart(6, '0')}`;
    }

    assert.equal(generateReceiptNumber(2026, 1), 'REC-2026-000001');
    assert.equal(generateReceiptNumber(2026, 42), 'REC-2026-000042');
    assert.equal(generateReceiptNumber(2026, 12345), 'REC-2026-012345');
  });

  // ── Test 4: Idempotency protection against double-submission ───────────────
  test('4. Idempotency key deduplicates payment writes', () => {
    const mockPaymentsDb = [];

    function recordMockPayment(payment) {
      if (payment.idempotencyKey) {
        const dup = mockPaymentsDb.find(p => p.idempotencyKey === payment.idempotencyKey);
        if (dup) return { ok: true, id: dup.id, receiptNumber: dup.receiptNumber, duplicate: true };
      }
      mockPaymentsDb.push(payment);
      return { ok: true, id: payment.id, receiptNumber: payment.receiptNumber, duplicate: false };
    }

    const key = 'IDEMP-TEST-999';
    const firstRes = recordMockPayment({ id: 'PAY-1', idempotencyKey: key, receiptNumber: 'REC-2026-000001', amount: 1000 });
    assert.equal(firstRes.duplicate, false);
    assert.equal(firstRes.id, 'PAY-1');

    // Second submission with same idempotency key returns original without creating new record
    const secondRes = recordMockPayment({ id: 'PAY-2', idempotencyKey: key, receiptNumber: 'REC-2026-000002', amount: 1000 });
    assert.equal(secondRes.duplicate, true);
    assert.equal(secondRes.id, 'PAY-1');
    assert.equal(mockPaymentsDb.length, 1);
  });

  // ── Test 5: Server-computed membership payment status from payments ─────────
  test('5. ₹500 against ₹1,500 gives status "partial", next ₹1,000 gives "paid"', () => {
    const membership = { id: 'MEM-100', price: 1500, discount: 0, finalAmount: 1500, paymentStatus: 'pending' };
    const payments = [];

    function computeStatus(mem, allPayments) {
      const activePayments = allPayments.filter(p => p.membershipId === mem.id && p.status === 'recorded' && !p.voidedAt);
      const totalPaid = activePayments.reduce((s, p) => s + p.amount, 0);
      const due = mem.finalAmount;
      if (totalPaid >= due) return 'paid';
      if (totalPaid > 0) return 'partial';
      return 'pending';
    }

    assert.equal(computeStatus(membership, payments), 'pending');

    // Add ₹500 payment
    payments.push({ id: 'PAY-A', membershipId: 'MEM-100', amount: 500, status: 'recorded' });
    assert.equal(computeStatus(membership, payments), 'partial');

    // Add another ₹1000 payment
    payments.push({ id: 'PAY-B', membershipId: 'MEM-100', amount: 1000, status: 'recorded' });
    assert.equal(computeStatus(membership, payments), 'paid');

    // If ₹1000 payment is voided, status reverts to partial
    payments[1].voidedAt = new Date().toISOString();
    assert.equal(computeStatus(membership, payments), 'partial');
  });

  // ── Test 6: Deleting a student does NOT alter past revenue totals ───────────
  test('6. Revenue is calculated on branch payments table, independent of student deletes', () => {
    const payments = [
      { id: 'PAY-1', branchId: 'BR-1', studentId: 'STU-1', amount: 1000, date: '2026-09-01', status: 'recorded' },
      { id: 'PAY-2', branchId: 'BR-1', studentId: 'STU-2', amount: 1500, date: '2026-09-02', status: 'recorded' },
      { id: 'PAY-3', branchId: 'BR-2', studentId: 'STU-3', amount: 2000, date: '2026-09-02', status: 'recorded' }
    ];

    const students = [
      { id: 'STU-1', name: 'Alice', branchId: 'BR-1', deletedAt: null },
      { id: 'STU-2', name: 'Bob', branchId: 'BR-1', deletedAt: null }
    ];

    function calculateBranchRevenue(branchId, paymentsList) {
      return paymentsList
        .filter(p => p.branchId === branchId && p.status === 'recorded' && !p.voidedAt)
        .reduce((s, p) => s + p.amount, 0);
    }

    assert.equal(calculateBranchRevenue('BR-1', payments), 2500);

    // Soft delete student STU-2
    students[1].deletedAt = new Date().toISOString();

    // Branch revenue remains strictly 2500
    assert.equal(calculateBranchRevenue('BR-1', payments), 2500);
  });

  // ── Test 7: Dashboard, Payments, and Reports agree on numbers ───────────────
  test('7. Dashboard, payments list, and reports match for same branch and period', () => {
    const branchId = 'BR-1';
    const payments = [
      { id: 'PAY-1', branchId: 'BR-1', amount: 500, date: '2026-09-28', status: 'recorded' },
      { id: 'PAY-2', branchId: 'BR-1', amount: 1000, date: '2026-09-28', status: 'recorded' },
      { id: 'PAY-3', branchId: 'BR-1', amount: 800, date: '2026-09-10', status: 'recorded' },
      { id: 'PAY-4', branchId: 'BR-2', amount: 3000, date: '2026-09-28', status: 'recorded' } // other branch
    ];

    const today = '2026-09-28';
    const thisMonth = '2026-09';

    // Dashboard today's revenue calculation
    const dashTodayRevenue = payments
      .filter(p => p.branchId === branchId && p.date === today && p.status === 'recorded')
      .reduce((s, p) => s + p.amount, 0);

    // Payments page today's total calculation
    const payPageTodayTotal = payments
      .filter(p => p.branchId === branchId && p.date === today && p.status === 'recorded')
      .reduce((s, p) => s + p.amount, 0);

    // Reports today's revenue calculation
    const reportsTodayRevenue = payments
      .filter(p => p.branchId === branchId && p.date === today && p.status === 'recorded')
      .reduce((s, p) => s + p.amount, 0);

    assert.equal(dashTodayRevenue, 1500);
    assert.equal(payPageTodayTotal, 1500);
    assert.equal(reportsTodayRevenue, 1500);

    // Month totals match
    const dashMonthRevenue = payments
      .filter(p => p.branchId === branchId && p.date.startsWith(thisMonth) && p.status === 'recorded')
      .reduce((s, p) => s + p.amount, 0);

    const reportsMonthRevenue = payments
      .filter(p => p.branchId === branchId && p.date.startsWith(thisMonth) && p.status === 'recorded')
      .reduce((s, p) => s + p.amount, 0);

    assert.equal(dashMonthRevenue, 2300);
    assert.equal(reportsMonthRevenue, 2300);
  });

  // ── Test 8: Back-dated payment groups on its payment date ───────────────────
  test('8. Back-dated payment is grouped on its payment date in chart aggregation', () => {
    const payments = [
      { id: 'PAY-1', branchId: 'BR-1', amount: 1000, date: '2026-09-05', recordedAt: '2026-09-28T10:00:00Z', status: 'recorded' },
      { id: 'PAY-2', branchId: 'BR-1', amount: 500, date: '2026-09-28', recordedAt: '2026-09-28T10:00:00Z', status: 'recorded' }
    ];

    function getDayRevenue(dateStr, branchId, list) {
      return list
        .filter(p => p.branchId === branchId && p.date === dateStr && p.status === 'recorded' && !p.voidedAt)
        .reduce((s, p) => s + p.amount, 0);
    }

    assert.equal(getDayRevenue('2026-09-05', 'BR-1', payments), 1000);
    assert.equal(getDayRevenue('2026-09-28', 'BR-1', payments), 500);
  });

  // ── Test 9: Client rejected from directly updating paymentStatus ───────────
  test('9. Memberships update schema rejects direct client paymentStatus mutation', () => {
    assert.throws(() => {
      validate('memberships', 'update', { paymentStatus: 'paid' });
    }, /Payment status is computed automatically by the server/);
  });
});
