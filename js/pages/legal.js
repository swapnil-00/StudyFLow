// js/pages/legal.js — Public policy pages: Terms, Privacy, Refund & Cancellation, Contact
// Required by payment providers before a live account is activated. Contact details come from
// the server (CONTACT_EMAIL, CONTACT_WHATSAPP, CONTACT_ADDRESS, BUSINESS_NAME, BUSINESS_OWNER).

const LEGAL_EFFECTIVE_DATE = '6 October 2026';

async function legalContact() {
  try {
    const res = await fetch('/api/auth?action=client_config');
    const json = await res.json();
    return json?.contact || {};
  } catch (_) { return {}; }
}

function legalShell(title, subtitle, bodyHtml) {
  const page = document.createElement('div');
  page.className = 'auth-page-container';
  page.innerHTML = `
    <div class="auth-card" style="max-width:820px;text-align:left;">
      <div class="auth-header" style="text-align:left;">
        <div class="auth-logo">SF</div>
        <h1 class="auth-title">${title}</h1>
        <p class="auth-subtitle">${subtitle}</p>
      </div>
      <div class="sf-legal" style="font-size:14px;line-height:1.7;color:var(--color-text-primary);">
        ${bodyHtml}
      </div>
      <div class="auth-footer" style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:24px;">
        <a href="#/landing" class="auth-switch-link">Home</a>
        <a href="#/terms" class="auth-switch-link">Terms</a>
        <a href="#/privacy" class="auth-switch-link">Privacy</a>
        <a href="#/refund" class="auth-switch-link">Refunds & Cancellation</a>
        <a href="#/contact" class="auth-switch-link">Contact</a>
      </div>
    </div>
  `;
  return page;
}

function mount(container, page) {
  if (container && container.appendChild) { container.innerHTML = ''; container.appendChild(page); }
  return page;
}

const esc = (s) => (typeof window !== 'undefined' && window.escapeHtml ? window.escapeHtml(s) : String(s == null ? '' : s));
const h2 = (t) => `<h2 style="font-size:16px;font-weight:700;margin:22px 0 8px;">${t}</h2>`;
const p = (t) => `<p style="margin:0 0 10px;">${t}</p>`;
const ul = (items) => `<ul style="margin:0 0 10px 18px;padding:0;">${items.map(i => `<li style="margin:4px 0;">${i}</li>`).join('')}</ul>`;

function fillContact(page, c) {
  const name = c.businessName || 'StudyFlow';
  const owner = c.owner || '';
  page.querySelectorAll('[data-legal="business"]').forEach(el => { el.textContent = owner ? `${name} (operated by ${owner}, India)` : `${name} (India)`; });
  page.querySelectorAll('[data-legal="email"]').forEach(el => { el.textContent = c.email || ''; el.setAttribute('href', `mailto:${c.email || ''}`); });
  page.querySelectorAll('[data-legal="whatsapp"]').forEach(el => {
    const digits = String(c.whatsapp || '').replace(/\D/g, '');
    if (digits) { el.textContent = `+${digits}`; el.setAttribute('href', `https://wa.me/${digits}`); el.parentElement.style.display = ''; }
    else el.parentElement.style.display = 'none';
  });
  page.querySelectorAll('[data-legal="address"]').forEach(el => {
    if (c.address) { el.textContent = c.address; el.parentElement.style.display = ''; } else el.parentElement.style.display = 'none';
  });
}

export function renderTermsPage(container) {
  const body = `
    ${p(`These terms govern the use of StudyFlow ("the Service"), a web application for managing study libraries and reading rooms, provided by <strong data-legal="business">StudyFlow (India)</strong>. By creating an account or using the Service you agree to them. Effective date: ${LEGAL_EFFECTIVE_DATE}.`)}
    ${h2('1. The Service')}
    ${p('StudyFlow lets a library manage seats, students, memberships, payments, expenses, staff and WhatsApp reminders. Reminders are sent from the library\'s own WhatsApp account by the library\'s staff; StudyFlow prepares the message and opens WhatsApp. StudyFlow is not a party to the arrangement between a library and its students.')}
    ${h2('2. Accounts')}
    ${ul([
      'You sign in with a Google account. You are responsible for keeping that account secure and for everyone you invite as staff.',
      'One Google account may own one library. The library owner is responsible for the data entered by the library and its staff, including students\' names and phone numbers, and for having the students\' consent to store them and to message them.',
      'You must be at least 18 years old and able to enter into a contract under Indian law.',
    ])}
    ${h2('3. Plans, prices and payment')}
    ${ul([
      'The <strong>Free plan</strong> is free of charge and limited to a small number of seats shown in the app.',
      'Paid plans (<strong>Basic</strong> and <strong>Custom</strong>) are <strong>one-time</strong> purchases that raise the seat limit of one library. Prices are shown in Indian Rupees inside the app before you pay and may change for future purchases; a price change never affects a plan you have already bought.',
      'Optional add-ons (such as automatic WhatsApp notifications, when offered) are prepaid for a fixed period shown at purchase and stop automatically when the period ends unless renewed. There are no automatic recurring charges.',
      'Payments are processed by Cashfree Payments India Pvt. Ltd. StudyFlow never receives or stores your card, UPI or bank details.',
      'Applicable taxes, if any, are shown at checkout. You are responsible for any taxes due in your jurisdiction.',
      'Refunds and cancellations are described in the <a href="#/refund">Refund & Cancellation Policy</a>.',
    ])}
    ${h2('4. Acceptable use')}
    ${ul([
      'Use the Service only to manage your own library and only in compliance with Indian law and the terms of the services you use through it (including WhatsApp\'s terms).',
      'Do not send unsolicited or bulk marketing messages to people who have not asked to hear from you, and honour every request to stop.',
      'Do not try to access other libraries\' data, interfere with the Service, or circumvent seat limits, prices or payment checks.',
    ])}
    ${h2('5. Your data')}
    ${p('The data you enter belongs to you. You can export it or ask us to delete it at any time (see the <a href="#/privacy">Privacy Policy</a>). We keep daily backups and take reasonable security measures, but you remain responsible for keeping your own records of payments and memberships.')}
    ${h2('6. Availability and changes')}
    ${p('We aim to keep the Service available at all times but do not guarantee uninterrupted operation. We may change or improve features; we will not remove a feature you have paid for during the period you paid for. We may suspend an account that is used in breach of these terms or that has an unpaid balance, after trying to contact the owner.')}
    ${h2('7. Liability')}
    ${p('The Service is provided "as is". To the extent permitted by law, our total liability for any claim relating to the Service is limited to the amount you paid us in the 12 months before the claim. We are not liable for indirect losses, lost profits, or for messages, payments or data entered by a library or its students.')}
    ${h2('8. Termination')}
    ${p('You can stop using the Service at any time. We can end the agreement for a serious breach of these terms. After termination your data stays available for export for 30 days and is then deleted.')}
    ${h2('9. Governing law')}
    ${p('These terms are governed by the laws of India, and the courts of India have jurisdiction over any dispute.')}
    ${h2('10. Contact')}
    ${p('Questions about these terms: <a data-legal="email" href="#"></a>.')}
  `;
  const page = legalShell('Terms of Service', `Last updated ${LEGAL_EFFECTIVE_DATE}`, body);
  legalContact().then(c => fillContact(page, c));
  return mount(container, page);
}

export function renderPrivacyPage(container) {
  const body = `
    ${p(`This policy explains what data StudyFlow, provided by <strong data-legal="business">StudyFlow (India)</strong>, collects and how it is used. Effective date: ${LEGAL_EFFECTIVE_DATE}.`)}
    ${h2('1. Data we collect')}
    ${ul([
      '<strong>Account data:</strong> your name and email from Google sign-in, and a mobile number if you provide one for payment receipts.',
      '<strong>Library data:</strong> everything your library enters: branch and seat layout, students (name, phone, optional email, address, ID-proof reference, notes), memberships, payments, expenses, staff and WhatsApp message logs.',
      '<strong>Payment data:</strong> order number, amount, status and the payment reference returned by Cashfree. Card, UPI and bank details are entered on Cashfree\'s pages and never reach us.',
      '<strong>Technical data:</strong> IP address, browser type, and server logs kept for security and troubleshooting.',
    ])}
    ${h2('2. How we use it')}
    ${ul([
      'To run the Service for your library: showing your data to you and your staff, preparing WhatsApp messages, generating invoices and receipts.',
      'To process payments, apply plans and send receipts.',
      'To send you security emails (for example a sign-in code) and service notices. We do not send marketing email.',
      'To keep the Service secure, prevent abuse and fix problems.',
    ])}
    ${h2('3. Students\' data')}
    ${p('For the data a library enters about its students, the library is the data controller and StudyFlow is a processor acting on its instructions. A student who wants to see, correct or delete their data should contact their library; we help the library do so.')}
    ${h2('4. Who we share data with')}
    ${ul([
      '<strong>Cloudflare</strong> (hosting and network security) and <strong>Neon</strong> (database hosting, servers in the United States).',
      '<strong>Google</strong> for sign-in (Firebase Authentication).',
      '<strong>Cashfree Payments</strong> for payments.',
      '<strong>Brevo</strong> for transactional email.',
      'Authorities when required by law. We do not sell data and do not share it with advertisers.',
    ])}
    ${h2('5. Cookies')}
    ${p('We use one session cookie to keep you signed in. It is HttpOnly and sent only to StudyFlow. We do not use advertising or tracking cookies.')}
    ${h2('6. Security')}
    ${p('All traffic is encrypted (HTTPS). Access to data is limited to the library that owns it and to the operator for support and maintenance. Passwords are never stored in plain text; most accounts use Google sign-in and have no password at all.')}
    ${h2('7. Retention and deletion')}
    ${p('Data is kept while your account is active and for 30 days after termination so it can be exported, then deleted. Payment records are kept as long as required by Indian tax law. You can ask us to delete your account and library data at any time.')}
    ${h2('8. Your rights')}
    ${p('You can ask what data we hold about you, correct it, export it or have it deleted by emailing <a data-legal="email" href="#"></a>. We respond within 7 working days.')}
    ${h2('9. Changes')}
    ${p('If this policy changes materially, we will show a notice in the app. The date at the top tells you when it was last updated.')}
  `;
  const page = legalShell('Privacy Policy', `Last updated ${LEGAL_EFFECTIVE_DATE}`, body);
  legalContact().then(c => fillContact(page, c));
  return mount(container, page);
}

export function renderRefundPage(container) {
  const body = `
    ${p(`This policy applies to purchases made inside StudyFlow from <strong data-legal="business">StudyFlow (India)</strong>. Effective date: ${LEGAL_EFFECTIVE_DATE}.`)}
    ${h2('1. Free plan')}
    ${p('The Free plan has no charge, so nothing to refund or cancel. You can stop using it at any time.')}
    ${h2('2. Paid plans (Basic and Custom)')}
    ${ul([
      'Paid plans are one-time purchases. There are no recurring charges to cancel.',
      '<strong>7-day money-back guarantee:</strong> if you are not satisfied with your first paid plan, email us within 7 days of the payment and we refund it in full. After 7 days a plan purchase is non-refundable.',
      'A purchase that was fully discounted with a coupon has no amount to refund.',
    ])}
    ${h2('3. Prepaid add-ons')}
    ${p('An add-on (such as automatic WhatsApp notifications, when offered) is prepaid for the period chosen at purchase and ends automatically; there is no renewal unless you buy again. If the add-on did not work during a paid period because of a fault on our side, we refund the unused part pro rata. Otherwise prepaid periods are non-refundable once started. You can switch the add-on off at any time; the remaining period stays available to switch back on.')}
    ${h2('4. Duplicate or failed payments')}
    ${p('If you were charged twice, or charged for a payment that shows as failed, tell us within 7 days and we refund the extra amount in full.')}
    ${h2('5. How refunds are paid')}
    ${p('Refunds go back to the original payment method through Cashfree and usually appear within 5–7 working days, depending on your bank. Email <a data-legal="email" href="#"></a> with the order number from your Billing page.')}
    ${h2('6. Cancelling your account')}
    ${p('Email us to close your account. Your data stays available for export for 30 days and is then deleted. Closing the account does not create a refund beyond the cases above.')}
  `;
  const page = legalShell('Refund & Cancellation Policy', `Last updated ${LEGAL_EFFECTIVE_DATE}`, body);
  legalContact().then(c => fillContact(page, c));
  return mount(container, page);
}

export function renderContactPage(container) {
  const body = `
    ${p('StudyFlow is a web application for managing study libraries and reading rooms: seat map, students, memberships, payments, expenses, staff and WhatsApp reminders.')}
    ${h2('Business')}
    ${p('<strong data-legal="business">StudyFlow (India)</strong>')}
    ${h2('Reach us')}
    ${ul([
      'Email: <a data-legal="email" href="#"></a> (replies within 1 working day)',
      '<span>WhatsApp: <a data-legal="whatsapp" href="#" target="_blank" rel="noopener"></a></span>',
      '<span>Address: <span data-legal="address"></span></span>',
    ])}
    ${h2('Support hours')}
    ${p('Monday to Saturday, 10:00 to 19:00 IST. For a product demo, write to us with your library\'s name and city.')}
    ${h2('Policies')}
    ${p('<a href="#/terms">Terms of Service</a> · <a href="#/privacy">Privacy Policy</a> · <a href="#/refund">Refund & Cancellation Policy</a>')}
  `;
  const page = legalShell('Contact Us', 'How to reach StudyFlow', body);
  legalContact().then(c => fillContact(page, c));
  return mount(container, page);
}
