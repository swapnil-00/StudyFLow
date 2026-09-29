// test/store-index.test.js — Store lookup indexes must behave exactly like the linear scans they replace
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadStore() {
  const sandbox = { window: {}, console, Intl, Date, Math, JSON, Map, Set, Array, Object, String, Number };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8'), sandbox);
  const store = sandbox.window.store;
  store._db = {
    branches: [], floors: [], rooms: [], students: [], membershipPlans: [], documents: [],
    seats: [{ id: 'S1', roomId: 'R1' }, { id: 'S2', roomId: 'R1' }],
    memberships: [{ id: 'M1', studentId: 'U1', status: 'active', endDate: '2999-01-01' }],
    seatAssignments: [{ id: 'A1', seatId: 'S1', studentId: 'U1', membershipId: 'M1', status: 'active', endDate: '2999-01-01' }],
    payments: [{ id: 'P1', membershipId: 'M1', amount: 100, status: 'recorded' }],
  };
  return store;
}

describe('Store lookup indexes', () => {
  test('finds records by id and foreign key', () => {
    const store = loadStore();
    assert.equal(store.getSeat('S2').id, 'S2');
    assert.equal(store.getMembership('M1').id, 'M1');
    assert.equal(store.getActiveAssignment('S1').id, 'A1');
    assert.equal(store.getStudentAssignment('U1').id, 'A1');
    assert.equal(store.getPayments('M1').length, 1);
    assert.equal(store.getSeat('missing'), undefined);
    assert.equal(store.getSeat(undefined), undefined);
  });

  test('sees pushed records without an explicit invalidation', () => {
    const store = loadStore();
    store.getPayments('M1');
    store._db.payments.push({ id: 'P2', membershipId: 'M1', amount: 50, status: 'recorded' });
    assert.equal(store.getPaidAmount('M1'), 150);
  });

  test('sees in-place replacements (arr[i] = {...})', () => {
    const store = loadStore();
    assert.equal(store.getMembership('M1').status, 'active');
    store._db.memberships[0] = { ...store._db.memberships[0], status: 'renewed' };
    assert.equal(store.getMembership('M1').status, 'renewed');
  });

  test('sees array reassignment by filter', () => {
    const store = loadStore();
    assert.ok(store.getActiveAssignment('S1'));
    store._db.seatAssignments = store._db.seatAssignments.filter(a => a.seatId !== 'S1');
    assert.equal(store.getActiveAssignment('S1'), undefined);
  });

  test('sees in-place status changes and key changes', () => {
    const store = loadStore();
    store.getActiveAssignment('S1');
    store._db.seatAssignments[0].status = 'released';
    assert.equal(store.getActiveAssignment('S1'), undefined);

    const seat = store.getSeat('S2');
    seat.id = 'S2-NEW';
    assert.equal(store.getSeat('S2'), undefined);
    assert.equal(store.getSeat('S2-NEW').id, 'S2-NEW');
  });

  test('voided and refunded payments are excluded', () => {
    const store = loadStore();
    store._db.payments.push({ id: 'P3', membershipId: 'M1', amount: 999, status: 'voided' });
    store._db.payments.push({ id: 'P4', membershipId: 'M1', amount: 999, status: 'refunded' });
    assert.equal(store.getPaidAmount('M1'), 100);
  });

  test('membership ending today is still active (IST date comparison)', () => {
    const store = loadStore();
    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    store._db.memberships[0].endDate = todayIST;
    assert.equal(store.getActiveMembership('U1')?.id, 'M1');
  });
});
