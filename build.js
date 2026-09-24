const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const pagesDir = path.join(rootDir, 'js', 'pages');
const appJsPath = path.join(rootDir, 'js', 'app.js');
const bundlePath = path.join(rootDir, 'js', 'bundle.js');

const servicesDir = path.join(rootDir, 'js', 'services');

const serviceFiles = [
  'whatsapp-provider.js',
  'invoice-generator.js',
  'notification-service.js'
];

const pageFiles = [
  'dashboard.js',
  'seat-map.js',
  'students.js',
  'student-profile.js',
  'memberships.js',
  'payments.js',
  'attendance.js',
  'floors.js',
  'expenses.js',
  'reports.js',
  'staff.js',
  'notifications.js',
  'activity.js',
  'settings.js',
  'reservations.js'
];

let bundleContent = `// StudyFlow Bundled Application Scripts\nwindow.Pages = window.Pages || {};\n\n`;

// ─── SERVICES ───
for (const file of serviceFiles) {
  const filePath = path.join(servicesDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    bundleContent += `// ─── SERVICE: ${file} ───\n(function() {\n${content}\n})();\n\n`;
  }
}

for (const file of pageFiles) {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Transform export function name(...) -> window.Pages.name = function name(...)
  content = content.replace(/export\s+function\s+([a-zA-Z0-9_]+)\s*\(/g, 'window.Pages.$1 = function $1(');
  // Transform export default or other export statements if any
  content = content.replace(/export\s+default\s+/g, '');
  content = content.replace(/export\s*\{[^}]*\};?/g, '');

  bundleContent += `// ─── PAGE: ${file} ───\n(function() {\n${content}\n})();\n\n`;
}

// Now read app.js
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Replace dynamic routes with sync page lookups
const routeReplacements = {
  "'/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard)": "'/dashboard': () => Promise.resolve(window.Pages.renderDashboard)",
  "'/seat-map': () => import('./pages/seat-map.js').then(m => m.renderSeatMap)": "'/seat-map': () => Promise.resolve(window.Pages.renderSeatMap)",
  "'/students': () => import('./pages/students.js').then(m => m.renderStudents)": "'/students': () => Promise.resolve(window.Pages.renderStudents)",
  "'/student': () => import('./pages/student-profile.js').then(m => m.renderStudentProfile)": "'/student': () => Promise.resolve(window.Pages.renderStudentProfile)",
  "'/memberships': () => import('./pages/memberships.js').then(m => m.renderMemberships)": "'/memberships': () => Promise.resolve(window.Pages.renderMemberships)",
  "'/payments': () => import('./pages/payments.js').then(m => m.renderPayments)": "'/payments': () => Promise.resolve(window.Pages.renderPayments)",
  "'/attendance': () => import('./pages/attendance.js').then(m => m.renderAttendance)": "'/attendance': () => Promise.resolve(window.Pages.renderAttendance)",
  "'/floors': () => import('./pages/floors.js').then(m => m.renderFloors)": "'/floors': () => Promise.resolve(window.Pages.renderFloors)",
  "'/expenses': () => import('./pages/expenses.js').then(m => m.renderExpenses)": "'/expenses': () => Promise.resolve(window.Pages.renderExpenses)",
  "'/reports': () => import('./pages/reports.js').then(m => m.renderReports)": "'/reports': () => Promise.resolve(window.Pages.renderReports)",
  "'/staff': () => import('./pages/staff.js').then(m => m.renderStaff)": "'/staff': () => Promise.resolve(window.Pages.renderStaff)",
  "'/notifications': () => import('./pages/notifications.js').then(m => m.renderNotifications)": "'/notifications': () => Promise.resolve(window.Pages.renderNotifications)",
  "'/activity': () => import('./pages/activity.js').then(m => m.renderActivity)": "'/activity': () => Promise.resolve(window.Pages.renderActivity)",
  "'/settings': () => import('./pages/settings.js').then(m => m.renderSettings)": "'/settings': () => Promise.resolve(window.Pages.renderSettings)",
  "'/reservations': () => import('./pages/reservations.js').then(m => m.renderReservations)": "'/reservations': () => Promise.resolve(window.Pages.renderReservations)"
};

for (const [search, replace] of Object.entries(routeReplacements)) {
  appContent = appContent.replace(search, replace);
}

// Make sure init runs reliably
appContent = appContent.replace(
  "document.addEventListener('DOMContentLoaded', () => app.init());",
  "if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => app.init()); } else { app.init(); }"
);

bundleContent += `// ─── APP CORE ───\n${appContent}\n`;

fs.writeFileSync(bundlePath, bundleContent, 'utf8');
console.log(`Bundle built successfully at ${bundlePath} (${(bundleContent.length / 1024).toFixed(1)} KB)`);
