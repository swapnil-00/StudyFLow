// test/invoice-pdf.test.js — The PDF the owner downloads/shares (js/services/invoice-generator.js buildPdf)
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { jsPDF } = require('jspdf');
const qrcode = require('qrcode-generator');

// The service is browser-oriented; give it the globals it touches at load time.
global.window = global.window || {};
const { invoiceGenerator } = require('../js/services/invoice-generator.js');

const doc = {
  id: 'DOC-1', documentType: 'invoice', documentNumber: 'INV-2026-000012', status: 'PAID', date: '2026-10-06',
  studentName: 'Priya Patel', studentPhone: '9876543210', studentId: 'STU-1',
  branchName: 'Sharma Library', branchAddress: 'FC Road, Pune', branchPhone: '9123456789',
  planName: 'Monthly Membership', seatNumber: 'A2', roomName: 'Main Hall', startDate: '2026-10-06', endDate: '2026-11-05',
  baseAmount: 500, discount: 0, finalAmount: 500, paidAmount: 500, pendingAmount: 0, paymentMethod: 'UPI', paymentRef: 'UTR123', paymentDate: '2026-10-06',
  verificationCode: '9V0S-ZP0V-RDY0', verifyUrl: 'https://studyflow.example/#/verify?n=INV-2026-000012&c=9V0S-ZP0V-RDY0', issuedAt: '2026-10-06T04:00:00.000Z',
};

describe('Invoice PDF', () => {
  test('builds a small text PDF whose metadata carries number, validity, amount and verification code', () => {
    const pdf = invoiceGenerator.buildPdf(doc, { jsPDF, qrcode });
    const out = pdf.output();
    assert.ok(out.startsWith('%PDF'));
    assert.ok(out.length < 200 * 1024, `PDF is ${out.length} bytes; expected a small text PDF`);
    const props = pdf.getDocumentProperty ? null : null; // jsPDF has no getter; check the raw Info dictionary
    void props;
    assert.match(out, /\/Title \(INV-2026-000012 · Sharma Library · 2026-10-06 to 2026-11-05 · Rs\. 500 · Verify 9V0S-ZP0V-RDY0\)/);
    assert.match(out, /\/Subject \(Tax invoice INV-2026-000012 for Priya Patel; valid 2026-10-06 to 2026-11-05; amount Rs\. 500; status PAID; verification code 9V0S-ZP0V-RDY0\)/);
    assert.match(out, /\/Keywords \(INV-2026-000012, 9V0S-ZP0V-RDY0, 2026-10-06, 2026-11-05, StudyFlow\)/);
    assert.match(out, /\/Author \(Sharma Library via StudyFlow\)/);
    assert.equal(out.includes('₹'), false, 'rupee glyph is not in the core fonts; amounts use Rs.');
  });

  test('a receipt and a document without a code still render', () => {
    const receipt = invoiceGenerator.buildPdf({ ...doc, documentType: 'receipt', documentNumber: 'REC-2026-000007', status: 'SUCCESS', amount: 500, verificationCode: null, verifyUrl: null }, { jsPDF, qrcode });
    assert.match(receipt.output(), /\/Title \(REC-2026-000007/);
    const pending = invoiceGenerator.buildPdf({ ...doc, status: 'PENDING', paidAmount: 0, pendingAmount: 500, discount: 50 }, { jsPDF, qrcode });
    assert.ok(pending.output().length > 1000);
  });

  test('file name is safe for every OS', () => {
    assert.equal(invoiceGenerator.pdfFileName({ documentNumber: 'INV-2026-000012' }), 'INV-2026-000012.pdf');
    assert.equal(invoiceGenerator.pdfFileName({ documentNumber: 'bad/name:1' }), 'bad_name_1.pdf');
  });
});
