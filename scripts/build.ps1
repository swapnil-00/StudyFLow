$rootDir = $PSScriptRoot | Split-Path -Parent
$pagesDir = Join-Path $rootDir "js\pages"
$servicesDir = Join-Path $rootDir "js\services"

$bundleContent = "// StudyFlow Bundled Application Scripts`r`nwindow.Pages = window.Pages || {};`r`n`r`n"

# 0. Utils
$utilsPath = Join-Path $rootDir "js\utils.js"
if (Test-Path $utilsPath) {
    $bundleContent += "// --- UTILS & SECURITY ---`r`n" + (Get-Content $utilsPath -Raw -Encoding UTF8) + "`r`n`r`n"
}

# 1. Icons
$iconsPath = Join-Path $rootDir "js\icons.js"
if (Test-Path $iconsPath) {
    $bundleContent += "// --- ICONS ---`r`n" + (Get-Content $iconsPath -Raw -Encoding UTF8) + "`r`n`r`n"
}

# 2. Store
$storePath = Join-Path $rootDir "js\store.js"
if (Test-Path $storePath) {
    $bundleContent += "// --- STORE & UTILS ---`r`n" + (Get-Content $storePath -Raw -Encoding UTF8) + "`r`n`r`n"
}

# 3. Services
$serviceFiles = @('whatsapp-provider.js', 'invoice-generator.js', 'notification-service.js')
foreach ($f in $serviceFiles) {
    $p = Join-Path $servicesDir $f
    if (Test-Path $p) {
        $bundleContent += "// --- SERVICE: $f ---`r`n(function() {`r`n" + (Get-Content $p -Raw -Encoding UTF8) + "`r`n})();`r`n`r`n"
    }
}

# 4. Pages
$pageFiles = @('auth.js', 'landing.js', 'dashboard.js', 'seat-map.js', 'students.js', 'student-profile.js', 'memberships.js', 'payments.js', 'floors.js', 'expenses.js', 'reports.js', 'staff.js', 'notifications.js', 'activity.js', 'settings.js', 'layout-editor.js')
foreach ($f in $pageFiles) {
    $p = Join-Path $pagesDir $f
    if (Test-Path $p) {
        $c = Get-Content $p -Raw -Encoding UTF8
        $c = $c -replace 'export\s+function\s+([a-zA-Z0-9_]+)\s*\(', 'window.Pages.$1 = function $1('
        $c = $c -replace 'export\s+default\s+', ''
        $c = $c -replace 'export\s*\{[^}]*\};?', ''
        $bundleContent += "// --- PAGE: $f ---`r`n(function() {`r`n" + $c + "`r`n})();`r`n`r`n"
    }
}

# 5. App Core
$appPath = Join-Path $rootDir "js\app.js"
$appContent = Get-Content $appPath -Raw -Encoding UTF8
$appContent = $appContent.Replace("'/login': () => import('./pages/auth.js').then(m => m.renderLoginPage)", "'/login': () => Promise.resolve(window.Pages.renderLoginPage)")
$appContent = $appContent.Replace("'/signup': () => import('./pages/auth.js').then(m => m.renderSignupPage)", "'/signup': () => Promise.resolve(window.Pages.renderSignupPage)")
$appContent = $appContent.Replace("'/setup-library': () => import('./pages/auth.js').then(m => m.renderSetupLibraryPage)", "'/setup-library': () => Promise.resolve(window.Pages.renderSetupLibraryPage)")
$appContent = $appContent.Replace("'/onboarding': () => import('./pages/auth.js').then(m => m.renderOnboardingPage)", "'/onboarding': () => Promise.resolve(window.Pages.renderOnboardingPage)")
$appContent = $appContent.Replace("'/invite': () => import('./pages/auth.js').then(m => m.renderInvitePage)", "'/invite': () => Promise.resolve(window.Pages.renderInvitePage)")
$appContent = $appContent.Replace("'/forgot-password': () => import('./pages/auth.js').then(m => m.renderForgotPasswordPage)", "'/forgot-password': () => Promise.resolve(window.Pages.renderForgotPasswordPage)")
$appContent = $appContent.Replace("'/landing': () => import('./pages/landing.js').then(m => m.renderLanding)", "'/landing': () => Promise.resolve(window.Pages.renderLanding)")
$appContent = $appContent.Replace("'/dashboard': () => import('./pages/dashboard.js').then(m => m.renderDashboard)", "'/dashboard': () => Promise.resolve(window.Pages.renderDashboard)")
$appContent = $appContent.Replace("'/seat-map': () => import('./pages/seat-map.js').then(m => m.renderSeatMap)", "'/seat-map': () => Promise.resolve(window.Pages.renderSeatMap)")
$appContent = $appContent.Replace("'/students': () => import('./pages/students.js').then(m => m.renderStudents)", "'/students': () => Promise.resolve(window.Pages.renderStudents)")
$appContent = $appContent.Replace("'/student': () => import('./pages/student-profile.js').then(m => m.renderStudentProfile)", "'/student': () => Promise.resolve(window.Pages.renderStudentProfile)")
$appContent = $appContent.Replace("'/memberships': () => import('./pages/memberships.js').then(m => m.renderMemberships)", "'/memberships': () => Promise.resolve(window.Pages.renderMemberships)")
$appContent = $appContent.Replace("'/payments': () => import('./pages/payments.js').then(m => m.renderPayments)", "'/payments': () => Promise.resolve(window.Pages.renderPayments)")
$appContent = $appContent.Replace("'/floors': () => import('./pages/floors.js').then(m => m.renderFloors)", "'/floors': () => Promise.resolve(window.Pages.renderFloors)")
$appContent = $appContent.Replace("'/expenses': () => import('./pages/expenses.js').then(m => m.renderExpenses)", "'/expenses': () => Promise.resolve(window.Pages.renderExpenses)")
$appContent = $appContent.Replace("'/reports': () => import('./pages/reports.js').then(m => m.renderReports)", "'/reports': () => Promise.resolve(window.Pages.renderReports)")
$appContent = $appContent.Replace("'/staff': () => import('./pages/staff.js').then(m => m.renderStaff)", "'/staff': () => Promise.resolve(window.Pages.renderStaff)")
$appContent = $appContent.Replace("'/notifications': () => import('./pages/notifications.js').then(m => m.renderNotifications)", "'/notifications': () => Promise.resolve(window.Pages.renderNotifications)")
$appContent = $appContent.Replace("'/activity': () => import('./pages/activity.js').then(m => m.renderActivity)", "'/activity': () => Promise.resolve(window.Pages.renderActivity)")
$appContent = $appContent.Replace("'/settings': () => import('./pages/settings.js').then(m => m.renderSettings)", "'/settings': () => Promise.resolve(window.Pages.renderSettings)")
$appContent = $appContent.Replace("'/layout-editor': () => import('./pages/layout-editor.js').then(m => m.renderLayoutEditor)", "'/layout-editor': () => Promise.resolve(window.Pages.renderLayoutEditor)")

$appContent = $appContent.Replace("document.addEventListener('DOMContentLoaded', () => app.init());", "if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => app.init()); } else { app.init(); }")

$bundleContent += "// --- APP CORE ---`r`n" + $appContent + "`r`n"

$bundlePath = Join-Path $rootDir "js\bundle.js"
[System.IO.File]::WriteAllText($bundlePath, $bundleContent, [System.Text.Encoding]::UTF8)

# 6. Copy to public/
$publicDir = Join-Path $rootDir "public"
$publicJsDir = Join-Path $publicDir "js"
$publicCssDir = Join-Path $publicDir "css"
$publicAssetsDir = Join-Path $publicDir "assets"

New-Item -ItemType Directory -Force -Path $publicDir, $publicJsDir, $publicCssDir, $publicAssetsDir | Out-Null

Copy-Item $bundlePath (Join-Path $publicJsDir "bundle.js") -Force
Copy-Item (Join-Path $rootDir "index.html") (Join-Path $publicDir "index.html") -Force
Copy-Item (Join-Path $rootDir "css\*") $publicCssDir -Force -Recurse
if (Test-Path (Join-Path $rootDir "assets")) {
    Copy-Item (Join-Path $rootDir "assets\*") $publicAssetsDir -Force -Recurse
}

Write-Host "Bundle built successfully. Size: $([math]::Round($bundleContent.Length / 1024, 1)) KB"
