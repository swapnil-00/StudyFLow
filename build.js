const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const esbuild = require('esbuild');

const rootDir = __dirname;
const pagesDir = path.join(rootDir, 'js', 'pages');
const appJsPath = path.join(rootDir, 'js', 'app.js');
const utilsJsPath = path.join(rootDir, 'js', 'utils.js');
const iconsJsPath = path.join(rootDir, 'js', 'icons.js');
const storeJsPath = path.join(rootDir, 'js', 'store.js');
const bundlePath = path.join(rootDir, 'js', 'bundle.js');

const servicesDir = path.join(rootDir, 'js', 'services');

const serviceFiles = [
  'whatsapp-manual.js',
  'whatsapp-provider.js',
  'invoice-generator.js',
  'notification-service.js'
];

const pageFiles = [
  'auth.js',
  'landing.js',
  'dashboard.js',
  'seat-map.js',
  'students.js',
  'student-profile.js',
  'memberships.js',
  'payments.js',
  'floors.js',
  'expenses.js',
  'reports.js',
  'staff.js',
  'notifications.js',
  'activity.js',
  'settings.js',
  'layout-editor.js'
];


let bundleContent = `// StudyFlow Bundled Application Scripts\nwindow.Pages = window.Pages || {};\n\n`;

// ─── 0. UTILS & SECURITY (XSS Escaping & Boot Error Handler) ───
if (fs.existsSync(utilsJsPath)) {
  const utilsContent = fs.readFileSync(utilsJsPath, 'utf8');
  bundleContent += `// ─── UTILS & SECURITY ───\n${utilsContent}\n\n`;
}

// ─── 1. ICONS ───
if (fs.existsSync(iconsJsPath)) {
  const iconsContent = fs.readFileSync(iconsJsPath, 'utf8');
  bundleContent += `// ─── ICONS ───\n${iconsContent}\n\n`;
}

// ─── 2. STORE & UTILITIES ───
if (fs.existsSync(storeJsPath)) {
  const storeContent = fs.readFileSync(storeJsPath, 'utf8');
  bundleContent += `// ─── STORE & UTILS ───\n${storeContent}\n\n`;
}

// ─── 3. SERVICES ───
for (const file of serviceFiles) {
  const filePath = path.join(servicesDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    bundleContent += `// ─── SERVICE: ${file} ───\n(function() {\n${content}\n})();\n\n`;
  }
}

// ─── 4. PAGES ───
for (const file of pageFiles) {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Transform export function name(...) -> window.Pages.name = function name(...)
  content = content.replace(/export\s+function\s+([a-zA-Z0-9_]+)\s*\(/g, 'window.Pages.$1 = function $1(');
  content = content.replace(/export\s+default\s+/g, '');
  content = content.replace(/export\s*\{[^}]*\};?/g, '');

  bundleContent += `// ─── PAGE: ${file} ───\n(function() {\n${content}\n})();\n\n`;
}

// ─── 5. APP CORE ───
let appContent = fs.readFileSync(appJsPath, 'utf8');

// Replace dynamic imports with sync window.Pages lookup
const routeReplacements = {
  "'/login': () => import('./pages/auth.js').then(m => m.renderLoginPage)": "'/login': () => Promise.resolve(window.Pages.renderLoginPage)",
  "'/signup': () => import('./pages/auth.js').then(m => m.renderSignupPage)": "'/signup': () => Promise.resolve(window.Pages.renderSignupPage)",
  "'/setup-library': () => import('./pages/auth.js').then(m => m.renderSetupLibraryPage)": "'/setup-library': () => Promise.resolve(window.Pages.renderSetupLibraryPage)",
  "'/onboarding': () => import('./pages/auth.js').then(m => m.renderOnboardingPage)": "'/onboarding': () => Promise.resolve(window.Pages.renderOnboardingPage)",
  "'/invite': () => import('./pages/auth.js').then(m => m.renderInvitePage)": "'/invite': () => Promise.resolve(window.Pages.renderInvitePage)",
  "'/forgot-password': () => import('./pages/auth.js').then(m => m.renderForgotPasswordPage)": "'/forgot-password': () => Promise.resolve(window.Pages.renderForgotPasswordPage)",
  "'/landing': () => import('./pages/landing.js').then(m => m.renderLanding)": "'/landing': () => Promise.resolve(window.Pages.renderLanding)",
  "'/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard)": "'/dashboard': () => Promise.resolve(window.Pages.renderDashboard)",
  "'/seat-map': () => import('./pages/seat-map.js').then(m => m.renderSeatMap)": "'/seat-map': () => Promise.resolve(window.Pages.renderSeatMap)",
  "'/students': () => import('./pages/students.js').then(m => m.renderStudents)": "'/students': () => Promise.resolve(window.Pages.renderStudents)",
  "'/student': () => import('./pages/student-profile.js').then(m => m.renderStudentProfile)": "'/student': () => Promise.resolve(window.Pages.renderStudentProfile)",
  "'/memberships': () => import('./pages/memberships.js').then(m => m.renderMemberships)": "'/memberships': () => Promise.resolve(window.Pages.renderMemberships)",
  "'/payments': () => import('./pages/payments.js').then(m => m.renderPayments)": "'/payments': () => Promise.resolve(window.Pages.renderPayments)",
  "'/floors': () => import('./pages/floors.js').then(m => m.renderFloors)": "'/floors': () => Promise.resolve(window.Pages.renderFloors)",
  "'/expenses': () => import('./pages/expenses.js').then(m => m.renderExpenses)": "'/expenses': () => Promise.resolve(window.Pages.renderExpenses)",
  "'/reports': () => import('./pages/reports.js').then(m => m.renderReports)": "'/reports': () => Promise.resolve(window.Pages.renderReports)",
  "'/staff': () => import('./pages/staff.js').then(m => m.renderStaff)": "'/staff': () => Promise.resolve(window.Pages.renderStaff)",
  "'/notifications': () => import('./pages/notifications.js').then(m => m.renderNotifications)": "'/notifications': () => Promise.resolve(window.Pages.renderNotifications)",
  "'/activity': () => import('./pages/activity.js').then(m => m.renderActivity)": "'/activity': () => Promise.resolve(window.Pages.renderActivity)",
  "'/settings': () => import('./pages/settings.js').then(m => m.renderSettings)": "'/settings': () => Promise.resolve(window.Pages.renderSettings)",
  "'/layout-editor': () => import('./pages/layout-editor.js').then(m => m.renderLayoutEditor)": "'/layout-editor': () => Promise.resolve(window.Pages.renderLayoutEditor)"
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

// ─── 6. EXPORT STATIC DISTRIBUTION (public/) FOR VERCEL ───
const publicDir = path.join(rootDir, 'public');
const publicJsDir = path.join(publicDir, 'js');
const publicCssDir = path.join(publicDir, 'css');
const publicAssetsDir = path.join(publicDir, 'assets');

[publicDir, publicJsDir, publicCssDir, publicAssetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Clear previously emitted hashed JS/CSS so stale bundles are not deployed
for (const dir of [publicJsDir, publicCssDir]) {
  for (const f of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, f));
}

const contentHash = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 10);

// Minified, content-hashed JS bundle. The bundle is a classic script whose top-level
// functions are referenced from inline handlers, so esbuild runs as a plain transform
// (no format), which keeps top-level names intact and only renames local identifiers.
const minifiedJs = esbuild.transformSync(bundleContent, { loader: 'js', minify: true, target: 'es2019', legalComments: 'none' }).code;
assertTopLevelNamesPreserved(
  [utilsJsPath, iconsJsPath, storeJsPath]
    .filter(p => fs.existsSync(p))
    .map(p => fs.readFileSync(p, 'utf8'))
    .concat(appContent)
    .join('\n'),
  minifiedJs
);
const jsFileName = `bundle.${contentHash(minifiedJs)}.js`;
fs.writeFileSync(path.join(publicJsDir, jsFileName), minifiedJs, 'utf8');

// One minified, content-hashed stylesheet in the original cascade order
const cssDir = path.join(rootDir, 'css');
const cssOrder = ['tokens.css', 'base.css', 'layout.css', 'components.css', 'pages.css'];
const cssSource = cssOrder
  .filter(f => fs.existsSync(path.join(cssDir, f)))
  .map(f => fs.readFileSync(path.join(cssDir, f), 'utf8'))
  .join('\n');
const minifiedCss = esbuild.transformSync(cssSource, { loader: 'css', minify: true }).code;
const cssFileName = `app.${contentHash(minifiedCss)}.css`;
fs.writeFileSync(path.join(publicCssDir, cssFileName), minifiedCss, 'utf8');

// index.html pointing at the hashed assets
const indexHtmlPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  const cssLinkPattern = /[ \t]*<link rel="stylesheet" href="\/css\/[a-z-]+\.css(\?v=[^"]*)?" \/>\r?\n/g;
  let cssReplaced = false;
  html = html.replace(cssLinkPattern, (match) => {
    if (cssReplaced) return '';
    cssReplaced = true;
    return `  <link rel="stylesheet" href="/css/${cssFileName}" />\n`;
  });
  html = html.replace(/\/js\/bundle\.js(\?v=[^"]*)?/, `/js/${jsFileName}`);
  if (!cssReplaced || !html.includes(`/js/${jsFileName}`)) {
    throw new Error('build.js: could not rewrite asset references in index.html');
  }
  fs.writeFileSync(path.join(publicDir, 'index.html'), html, 'utf8');
}

console.log(`Minified assets: js/${jsFileName} (${(minifiedJs.length / 1024).toFixed(1)} KB), css/${cssFileName} (${(minifiedCss.length / 1024).toFixed(1)} KB)`);

// Guard: the unwrapped (global) sections — utils, icons, store, app core — declare names that
// inline onclick handlers and other scripts use. Fail the build if the minifier renamed any of them.
function assertTopLevelNamesPreserved(globalSource, output) {
  const declared = [...globalSource.matchAll(/^(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  const escapeRe = (s) => s.replace(/\$/g, '\\$');
  const missing = [...new Set(declared)].filter(n =>
    !new RegExp(`(?:function\\*?|class|const|let|var|,)\\s*${escapeRe(n)}\\b`).test(output)
  );
  if (missing.length) {
    throw new Error(`build.js: minifier renamed global names used by inline handlers: ${missing.slice(0, 10).join(', ')}`);
  }
}

// Copy Assets directory
const assetsDir = path.join(rootDir, 'assets');
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  for (const f of assetFiles) {
    const src = path.join(assetsDir, f);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(publicAssetsDir, f));
    }
  }
}


console.log('Static distribution compiled to public/ directory for Vercel deployment.');

