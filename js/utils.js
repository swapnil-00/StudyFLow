// js/utils.js — Frontend Security Utilities & Application Bootstrapper (SEC-007, SEC-020)
'use strict';

/**
 * Encodes untrusted strings before inserting into HTML templates to prevent Cross-Site Scripting (XSS).
 * @param {*} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Encodes untrusted strings before inserting into HTML attributes.
 * @param {*} str
 * @returns {string}
 */
function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Global exposure for all pages and components
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeAttr;

  // ── Global Error & Recovery Handler (moved from index.html inline script for CSP) ──
  window.__appLoaded = false;

  window.showAppError = function(msg) {
    if (window.__appLoaded) return;
    const loaderMsg = document.getElementById('app-loader-msg');
    const spinner = document.getElementById('app-loader-spinner');
    const errorBox = document.getElementById('app-error-box');
    const errorDetail = document.getElementById('app-error-detail');
    if (spinner) spinner.style.display = 'none';
    if (loaderMsg) loaderMsg.textContent = 'Startup error encountered';
    if (errorDetail) errorDetail.textContent = msg || 'An unexpected script or database connection error occurred.';
    if (errorBox) errorBox.style.display = 'block';
  };

  window.addEventListener('error', function(e) {
    if (!window.__appLoaded) {
      window.showAppError(e.message || 'Script loading failure. Check browser console.');
    }
  });

  window.addEventListener('unhandledrejection', function(e) {
    if (!window.__appLoaded) {
      window.showAppError(e.reason?.message || 'Database request rejected.');
    }
  });

  // Boot timeout safeguard (15 seconds)
  setTimeout(function() {
    if (!window.__appLoaded && document.getElementById('app-loader')) {
      window.showAppError('Connection timed out. Verify your Neon database connection and Vercel environment configuration.');
    }
  }, 15000);

  // Dismiss loader function
  window.dismissAppLoader = function() {
    window.__appLoaded = true;
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      loader.style.pointerEvents = 'none';
      setTimeout(() => { if (loader.parentNode) loader.remove(); }, 300);
    }
  };

  // Attach retry button listener when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const retryBtn = document.getElementById('app-error-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => location.reload());
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, escapeAttr };
}
