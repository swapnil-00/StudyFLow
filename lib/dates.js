// lib/dates.js — Unified Indian Standard Time (IST) Date Utilities
'use strict';

function getTodayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function addDaysIST(dateStr, days) {
  if (!dateStr) dateStr = getTodayIST();
  const cleanStr = String(dateStr).split('T')[0];
  const [y, m, d] = cleanStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
}

function daysBetweenIST(dateStr1, dateStr2) {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = new Date(String(dateStr1).split('T')[0] + 'T00:00:00Z');
  const d2 = new Date(String(dateStr2).split('T')[0] + 'T00:00:00Z');
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

module.exports = {
  getTodayIST,
  addDaysIST,
  daysBetweenIST
};
