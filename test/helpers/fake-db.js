// test/helpers/fake-db.js — Drive the real API handlers against a scripted in-memory DB.
//
// fakeDb(answers): every SQL statement is logged; the first [regex, reply] whose regex
// matches the SQL answers it (reply may be a function of (sql, params)). Anything else
// returns { rows: [], rowCount: 0 }. Handlers run inside runWithDb so lib/db's query()
// and withTransaction() route here instead of Postgres.
'use strict';
const { runWithDb } = require('../../lib/db');

function fakeDb(answers = []) {
  const log = [];
  const run = async (sql, params) => {
    log.push({ sql, params });
    for (const [re, reply] of answers) {
      if (re.test(sql)) {
        const r = typeof reply === 'function' ? reply(sql, params) : reply;
        return { rows: [], rowCount: 0, ...(r || {}) };
      }
    }
    return { rows: [], rowCount: 0 };
  };
  const ctx = {
    query: run,
    withTransaction: async (cb) => cb({ query: run }),
    cleanup: async () => {},
  };
  return { log, ctx, answers, sqlMatching: (re) => log.filter(e => re.test(e.sql)) };
}

/** Call a withHandler()-wrapped api/*.js handler the way worker/index.js does. */
function call(handler, db, { method = 'POST', body = null, headers = {}, url = '/api/test', query = {}, rawBody } = {}) {
  const req = {
    method,
    url,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body || {},
    rawBody: rawBody !== undefined ? rawBody : (body ? JSON.stringify(body) : ''),
    query,
  };
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    headersSent: false,
    setHeader(k, v) { res.headers[k.toLowerCase()] = v; return res; },
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; res.headersSent = true; return res; },
    end() { res.headersSent = true; return res; },
  };
  return runWithDb(db.ctx, () => handler(req, res)).then(() => res);
}

/** A row shaped like lib/session.js's hot-path SELECT (sessions ⋈ users ⋈ org_members ⋈ organizations). */
function sessionRow(overrides = {}) {
  const future = new Date(Date.now() + 3600 * 1000);
  return {
    id: 'SES-1', user_id: 'USR-1', organization_id: 'ORG-1',
    expires_at: future, absolute_expires_at: future, last_seen_at: new Date(),
    u_id: 'USR-1', name: 'Owner One', email: 'owner@example.com', phone: '9876543210', avatar_color: '#6172f3',
    user_status: 'active', token_version: 1, phone_e164: null, has_password: false, has_google: true,
    role: 'owner', mem_org_id: 'ORG-1',
    org_name: 'Test Library', slug: 'test-library', plan: 'free', seat_limit: 5,
    onboarding_completed: true, subscription_status: 'active', is_demo: false,
    whatsapp_mode: 'manual', whatsapp_auto_status: 'not_subscribed', whatsapp_auto_until: null,
    branch_ids: null,
    ...overrides,
  };
}

/** Standard answers most authenticated calls need: a valid session and permissive rate limits. */
function baseAnswers(session = sessionRow()) {
  return [
    [/FROM sessions s/, { rows: [session], rowCount: 1 }],
    [/INSERT INTO rate_limits/, { rows: [{ hits: 1, reset_at: new Date(Date.now() + 60000) }], rowCount: 1 }],
  ];
}

const COOKIE = { cookie: 'sf_session=test-token' };

module.exports = { fakeDb, call, sessionRow, baseAnswers, COOKIE };
