// StudyFlow — High-Converting SaaS Landing Page
// Comprehensive showcase of features, interactive demo, pricing tiers, testimonials, and FAQ

export function renderLanding(container) {
  let billingCycle = 'monthly'; // 'monthly' or 'annual'

  // Helper to get prices based on billing cycle
  function getPrice(monthlyPrice) {
    if (billingCycle === 'annual') {
      const discounted = Math.round(monthlyPrice * 0.8);
      return { price: `₹${discounted.toLocaleString('en-IN')}`, period: '/ mo (billed yearly)' };
    }
    return { price: `₹${monthlyPrice.toLocaleString('en-IN')}`, period: '/ month' };
  }

  function render() {
    const starter = getPrice(1499);
    const pro = getPrice(3499);
    const enterprise = getPrice(7999);

    container.innerHTML = `
      <div class="sf-landing-wrapper">
        <!-- ── Navigation Bar ── -->
        <header class="sf-landing-nav">
          <div class="sf-landing-container sf-nav-inner">
            <div class="sf-landing-logo" onclick="app.navigate('/landing')">
              <div class="sidebar-logo-icon" style="width:36px;height:36px;font-size:16px;">SF</div>
              <div style="display:flex;flex-direction:column;line-height:1.2;">
                <span style="font-size:18px;font-weight:800;letter-spacing:-0.5px;color:var(--color-text-primary);">StudyFlow</span>
                <span style="font-size:10px;font-weight:700;color:var(--color-primary);letter-spacing:0.5px;text-transform:uppercase;">Library SaaS</span>
              </div>
            </div>

            <nav class="sf-nav-links">
              <a href="#features" class="sf-nav-link" onclick="scrollToSection(event, 'features')">Features</a>
              <a href="#demo" class="sf-nav-link" onclick="scrollToSection(event, 'demo')">Live Preview</a>
              <a href="#pricing" class="sf-nav-link" onclick="scrollToSection(event, 'pricing')">Pricing</a>
              <a href="#testimonials" class="sf-nav-link" onclick="scrollToSection(event, 'testimonials')">Testimonials</a>
              <a href="#faq" class="sf-nav-link" onclick="scrollToSection(event, 'faq')">FAQ</a>
            </nav>

            <div class="sf-nav-actions">
              <button class="topbar-icon-btn" title="Toggle theme" onclick="app.toggleTheme()" style="width:36px;height:36px;">
                ${icons.sun}
              </button>
              <button class="btn btn-ghost btn-sm" onclick="app.openLoginModal()">Sign In</button>
              <button class="btn btn-secondary btn-sm" onclick="app.navigate('/dashboard')">Launch Demo</button>
              <button class="btn btn-primary btn-sm" onclick="app.openRegisterModal()">⚡ Start Free Trial</button>
            </div>
          </div>
        </header>

        <!-- ── Hero Section ── -->
        <section class="sf-hero-section">
          <div class="sf-landing-container sf-hero-inner">
            <div class="sf-hero-badge">
              <span class="sf-pulse-dot"></span>
              <span>Next-Gen Cloud Library Management SaaS</span>
            </div>

            <h1 class="sf-hero-title">
              Transform Your Reading Hall into a <span class="sf-gradient-text">High-Revenue Smart Study Space</span>
            </h1>

            <p class="sf-hero-subtitle">
              Automate visual seat allocation, collect fees on time, dispatch instant WhatsApp invoices, and manage multi-shift occupancy from one powerful cloud dashboard.
            </p>

            <div class="sf-hero-cta-group">
              <button class="btn btn-primary btn-lg" onclick="app.openRegisterModal()" style="padding:14px 28px;font-size:15px;font-weight:700;box-shadow:0 8px 24px rgba(97,114,243,0.35);">
                ✨ Create Free Library Account
              </button>
              <button class="btn btn-secondary btn-lg" onclick="app.navigate('/dashboard')" style="padding:14px 24px;font-size:15px;">
                🚀 Explore Live Interactive App
              </button>
            </div>

            <div class="sf-hero-trust-badges">
              <div class="sf-trust-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 14-Day Free Trial</div>
              <div class="sf-trust-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> No Credit Card Required</div>
              <div class="sf-trust-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Instant 30-Sec Setup</div>
              <div class="sf-trust-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 1-Click WhatsApp Invoices</div>
            </div>

            <!-- Interactive Hero Dashboard Mockup -->
            <div class="sf-hero-mockup-wrapper">
              <div class="sf-hero-mockup-header">
                <div class="sf-mockup-dots">
                  <span style="background:#ef4444;"></span>
                  <span style="background:#f59e0b;"></span>
                  <span style="background:#10b981;"></span>
                </div>
                <div class="sf-mockup-title">StudyFlow Pro Dashboard · Apex Reading Lounge</div>
                <div style="font-size:11px;font-weight:600;color:var(--sf-success-600);display:flex;align-items:center;gap:4px;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#10b981;"></span> Live Connected
                </div>
              </div>

              <div class="sf-hero-mockup-body">
                <!-- Mini Stats Bar -->
                <div class="grid-4" style="gap:12px;margin-bottom:16px;">
                  <div class="sf-mini-stat">
                    <div class="sf-mini-label">Total Occupancy</div>
                    <div class="sf-mini-val" style="color:var(--color-primary);">88%</div>
                    <div class="sf-mini-sub">44 / 50 Seats Occupied</div>
                  </div>
                  <div class="sf-mini-stat">
                    <div class="sf-mini-label">Today's Collection</div>
                    <div class="sf-mini-val" style="color:var(--sf-success-600);">₹24,500</div>
                    <div class="sf-mini-sub">14 Payments Processed</div>
                  </div>
                  <div class="sf-mini-stat">
                    <div class="sf-mini-label">Active Students</div>
                    <div class="sf-mini-val">128</div>
                    <div class="sf-mini-sub">+12 this month</div>
                  </div>
                  <div class="sf-mini-stat">
                    <div class="sf-mini-label">WhatsApp Dispatches</div>
                    <div class="sf-mini-val" style="color:var(--sf-success-600);">99.4%</div>
                    <div class="sf-mini-sub">Instant Delivery Ticks</div>
                  </div>
                </div>

                <!-- Interactive Mini Seat Grid & Live WhatsApp Preview -->
                <div class="grid-2" style="gap:16px;align-items:start;">
                  <!-- Seat Grid Preview -->
                  <div class="sf-mockup-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                      <div style="font-size:12px;font-weight:700;color:var(--color-text-primary);">🪑 Ground Floor — Quiet Reading Hall (Live Grid)</div>
                      <span class="badge badge-success" style="font-size:10px;">32 Available</span>
                    </div>
                    <div class="sf-mini-grid">
                      ${Array.from({length: 24}).map((_, i) => {
                        const isOcc = [1, 2, 4, 5, 7, 8, 9, 12, 14, 15, 18, 19, 21, 22].includes(i);
                        const isRes = [3, 11, 20].includes(i);
                        const statusClass = isOcc ? 'occ' : (isRes ? 'res' : 'avail');
                        return `<div class="sf-mini-seat ${statusClass}" title="Seat ${i+1}">S${i+1}</div>`;
                      }).join('')}
                    </div>
                    <div style="display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--color-text-tertiary);">
                      <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#10b981;"></span> Available</span>
                      <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#6366f1;"></span> Occupied</span>
                      <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:2px;background:#f59e0b;"></span> Reserved</span>
                    </div>
                  </div>

                  <!-- Live WhatsApp Message Preview -->
                  <div class="sf-mockup-card" style="background:#0b141a;color:#e9edef;border-color:#202c33;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #202c33;">
                      <div style="width:28px;height:28px;border-radius:50%;background:#00a884;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;color:white;">SF</div>
                      <div>
                        <div style="font-size:12px;font-weight:700;color:#e9edef;">StudyFlow Automated WhatsApp</div>
                        <div style="font-size:10px;color:#8696a0;">Official Verified Business Account</div>
                      </div>
                    </div>
                    <div class="sf-wa-bubble">
                      <div style="font-weight:700;color:#00a884;margin-bottom:4px;">✨ Seat Allocation Confirmation</div>
                      <p style="margin:0 0 6px 0;font-size:11px;line-height:1.4;">Hello Rahul Sharma! Your seat <strong>#S14</strong> in Quiet Study Hall (24-Hour Shift) has been activated.</p>
                      <div style="background:rgba(255,255,255,0.06);padding:6px 8px;border-radius:4px;font-size:10px;margin-bottom:4px;">
                        📄 <strong>Invoice-2026-089.pdf</strong> (₹1,800 · Paid via UPI)
                      </div>
                      <div style="text-align:right;font-size:9px;color:#8696a0;">10:42 AM · Delivered ✓✓</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Problem vs Solution ── -->
        <section class="sf-section sf-comparison-section">
          <div class="sf-landing-container">
            <div class="sf-section-header">
              <h2 class="sf-section-title">Say Goodbye to Paper Registers & Missed Fee Payments</h2>
              <p class="sf-section-subtitle">See why modern reading halls and study spaces are switching to StudyFlow</p>
            </div>

            <div class="grid-2" style="gap:24px;align-items:stretch;">
              <div class="sf-comparison-box bad">
                <div class="sf-comp-title" style="color:#ef4444;">❌ The Old Traditional Way</div>
                <ul class="sf-comp-list">
                  <li>Paper registers with overwritten seat numbers and messy erasures.</li>
                  <li>Double bookings and arguments when multiple shifts overlap.</li>
                  <li>Manually calculating pending fees and embarrassing due reminder calls.</li>
                  <li>Typing out individual WhatsApp messages and searching for phone numbers.</li>
                  <li>No visibility into branch expenses, daily cash flow, or monthly profit.</li>
                </ul>
              </div>

              <div class="sf-comparison-box good">
                <div class="sf-comp-title" style="color:#10b981;">✅ The StudyFlow SaaS Way</div>
                <ul class="sf-comp-list">
                  <li>Interactive real-time visual seat map showing vacant & occupied seats instantly.</li>
                  <li>Multi-shift engine (Morning, Evening, 24h Full Day) prevents any double allocation.</li>
                  <li>Automated payment tracking with instant digital PDF receipt generation.</li>
                  <li>1-Click & automated WhatsApp receipt dispatches directly to student phones.</li>
                  <li>Multi-branch financial analytics, automated revenue breakdown, and profit reports.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Key Features Grid (Bento Box) ── -->
        <section class="sf-section" id="features">
          <div class="sf-landing-container">
            <div class="sf-section-header">
              <div class="sf-pill-badge">POWERFUL SAAS FEATURES</div>
              <h2 class="sf-section-title">Everything You Need to Run & Scale Your Library</h2>
              <p class="sf-section-subtitle">Engineered specifically for study room owners, reading halls, and multi-branch libraries.</p>
            </div>

            <div class="grid-3" style="gap:20px;">
              <!-- Feature 1 -->
              <div class="sf-feature-card">
                <div class="sf-feat-icon" style="background:rgba(99,102,241,0.12);color:var(--color-primary);">🪑</div>
                <h3 class="sf-feat-title">Visual Seat Map & Grid Visualizer</h3>
                <p class="sf-feat-desc">View all floors and rooms in an interactive color-coded grid. Filter by available, occupied, reserved, or expiring seats in 1 click.</p>
              </div>

              <!-- Feature 2 -->
              <div class="sf-feature-card">
                <div class="sf-feat-icon" style="background:rgba(16,185,129,0.12);color:#10b981;">📱</div>
                <h3 class="sf-feat-title">WhatsApp Cloud Invoicing</h3>
                <p class="sf-feat-desc">Send automated payment receipts, admission confirmations, and due reminders directly to students' WhatsApp in English, Hindi, or Marathi.</p>
              </div>

              <!-- Feature 3 -->
              <div class="sf-feature-card">
                <div class="sf-feat-icon" style="background:rgba(245,158,11,0.12);color:#f59e0b;">⏰</div>
                <h3 class="sf-feat-title">Multi-Shift Smart Management</h3>
                <p class="sf-feat-desc">Maximize your seat revenue by assigning Morning, Afternoon, Evening, and 24-Hour shifts to the same seat without conflicts.</p>
              </div>

              <!-- Feature 4 -->
              <div class="sf-feature-card">
                <div class="sf-feat-icon" style="background:rgba(239,68,68,0.12);color:#ef4444;">💰</div>
                <h3 class="sf-feat-title">Collections & Dues Ledger</h3>
                <p class="sf-feat-desc">Track today's cash and UPI collections, upcoming fee dues, partial payments, security deposits, and overdue penalty calculations.</p>
              </div>

              <!-- Feature 5 -->
              <div class="sf-feature-card">
                <div class="sf-feat-icon" style="background:rgba(14,165,233,0.12);color:#0ea5e9;">🏢</div>
                <h3 class="sf-feat-title">Multi-Branch & Floor Management</h3>
                <p class="sf-feat-desc">Manage all your library locations from a single dashboard. Switch branches seamlessly and configure custom room pricing.</p>
              </div>

              <!-- Feature 6 -->
              <div class="sf-feature-card">
                <div class="sf-feat-icon" style="background:rgba(168,85,247,0.12);color:#a855f7;">👥</div>
                <h3 class="sf-feat-title">Staff Roles & Audit Security</h3>
                <p class="sf-feat-desc">Grant role-based access for librarians and managers. Every fee collection, seat change, and student admission is securely logged.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Interactive Demo Preview Section ── -->
        <section class="sf-section sf-demo-section" id="demo">
          <div class="sf-landing-container">
            <div class="sf-section-header">
              <div class="sf-pill-badge">INTERACTIVE EXPERIENCE</div>
              <h2 class="sf-section-title">Experience the Speed of StudyFlow</h2>
              <p class="sf-section-subtitle">Click below to jump straight into the full live app with pre-loaded demo rooms.</p>
            </div>

            <div class="sf-demo-box">
              <div style="max-width:600px;margin:0 auto;text-align:center;">
                <div style="font-size:48px;margin-bottom:12px;">⚡</div>
                <h3 style="font-size:22px;font-weight:800;color:var(--color-text-primary);margin-bottom:8px;">Ready to test drive StudyFlow?</h3>
                <p style="font-size:14px;color:var(--color-text-secondary);margin-bottom:24px;">No registration needed to test. Try assigning seats, recording mock payments, creating students, and generating invoices in real-time.</p>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                  <button class="btn btn-primary btn-lg" onclick="app.navigate('/dashboard')">
                    🚀 Launch Interactive Dashboard
                  </button>
                  <button class="btn btn-secondary btn-lg" onclick="app.navigate('/seat-map')">
                    🪑 View Live Seat Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── SaaS Pricing Plans ── -->
        <section class="sf-section" id="pricing">
          <div class="sf-landing-container">
            <div class="sf-section-header">
              <div class="sf-pill-badge">TRANSPARENT PRICING</div>
              <h2 class="sf-section-title">Simple, Predictable Plans for Every Library</h2>
              <p class="sf-section-subtitle">Choose the plan that fits your seat capacity. Upgrade or downgrade anytime.</p>

              <!-- Billing Cycle Toggle -->
              <div class="sf-pricing-toggle-wrap">
                <span class="${billingCycle === 'monthly' ? 'active' : ''}" onclick="window.setLandingBilling('monthly')">Monthly Billing</span>
                <button class="sf-pricing-toggle-btn ${billingCycle === 'annual' ? 'on' : ''}" onclick="window.toggleLandingBilling()">
                  <span class="sf-toggle-handle"></span>
                </button>
                <span class="${billingCycle === 'annual' ? 'active' : ''}" onclick="window.setLandingBilling('annual')">
                  Annual Billing <span class="sf-save-badge">Save 20%</span>
                </span>
              </div>
            </div>

            <div class="grid-3" style="gap:24px;align-items:stretch;">
              <!-- Starter Plan -->
              <div class="sf-price-card">
                <div class="sf-price-header">
                  <div class="sf-plan-name">Starter Plan</div>
                  <p class="sf-plan-desc">Ideal for small reading rooms & single branch study spaces.</p>
                  <div class="sf-price-amount">
                    <span class="sf-price-val">${starter.price}</span>
                    <span class="sf-price-period">${starter.period}</span>
                  </div>
                </div>

                <div class="sf-plan-limits">
                  <strong>Up to 75 Seats</strong> · 1 Branch Location
                </div>

                <ul class="sf-plan-features">
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Full Interactive Seat Map</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Student Directory & Profiles</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Payment Ledger & PDF Receipts</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 1-Click Free WhatsApp Sharing</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Export Reports to Excel/CSV</li>
                </ul>

                <button class="btn btn-secondary w-full" onclick="app.openRegisterModal()">
                  Start 14-Day Free Trial
                </button>
              </div>

              <!-- Pro Plan (Popular) -->
              <div class="sf-price-card featured">
                <div class="sf-popular-ribbon">MOST POPULAR</div>
                <div class="sf-price-header">
                  <div class="sf-plan-name">Pro Plan</div>
                  <p class="sf-plan-desc">For growing libraries scaling multi-shift capacity & automation.</p>
                  <div class="sf-price-amount">
                    <span class="sf-price-val">${pro.price}</span>
                    <span class="sf-price-period">${pro.period}</span>
                  </div>
                </div>

                <div class="sf-plan-limits" style="color:var(--color-primary);font-weight:700;">
                  <strong>Up to 250 Seats</strong> · Up to 3 Branches
                </div>

                <ul class="sf-plan-features">
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Everything in Starter Plan</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <strong>Multi-Shift Seat Allocations</strong></li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <strong>Meta WhatsApp Cloud API Automation</strong></li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Expense & Profit Margin Reports</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Staff Management (Up to 5 staff)</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Priority WhatsApp Support</li>
                </ul>

                <button class="btn btn-primary w-full" onclick="app.openRegisterModal()" style="box-shadow:0 4px 16px rgba(97,114,243,0.4);">
                  Start 14-Day Free Trial
                </button>
              </div>

              <!-- Enterprise Plan -->
              <div class="sf-price-card">
                <div class="sf-price-header">
                  <div class="sf-plan-name">Enterprise Plan</div>
                  <p class="sf-plan-desc">For large multi-branch chains and commercial study lounges.</p>
                  <div class="sf-price-amount">
                    <span class="sf-price-val">${enterprise.price}</span>
                    <span class="sf-price-period">${enterprise.period}</span>
                  </div>
                </div>

                <div class="sf-plan-limits">
                  <strong>Up to 1,000 Seats</strong> · Unlimited Branches
                </div>

                <ul class="sf-plan-features">
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Everything in Pro Plan</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Interactive Custom Room Designer</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Dedicated Neon Database Instance</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Custom Branding & Invoicing Header</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Historical Data Migration Support</li>
                  <li><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> 24/7 Phone & Dedicated Manager</li>
                </ul>

                <button class="btn btn-secondary w-full" onclick="app.openRegisterModal()">
                  Start 14-Day Free Trial
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Customer Testimonials ── -->
        <section class="sf-section sf-testimonials-section" id="testimonials">
          <div class="sf-landing-container">
            <div class="sf-section-header">
              <div class="sf-pill-badge">TESTIMONIALS</div>
              <h2 class="sf-section-title">Loved by 250+ Library Owners Across India</h2>
              <p class="sf-section-subtitle">Here is what owners and study space managers have to say about StudyFlow.</p>
            </div>

            <div class="grid-3" style="gap:20px;">
              <!-- Review 1 -->
              <div class="sf-testimonial-card">
                <div class="sf-stars">★★★★★</div>
                <p class="sf-quote">"We used to manage 180 seats across 2 floors using paper registers. With StudyFlow, our overdue dues dropped by 90% in just one month thanks to automated WhatsApp receipts and reminders."</p>
                <div class="sf-author">
                  <div class="avatar avatar-md" style="background:#6366f1;">AM</div>
                  <div>
                    <div class="sf-author-name">Anand Mishra</div>
                    <div class="sf-author-role">Owner, Prerna Study Library (Pune)</div>
                  </div>
                </div>
              </div>

              <!-- Review 2 -->
              <div class="sf-testimonial-card">
                <div class="sf-stars">★★★★★</div>
                <p class="sf-quote">"The multi-shift feature alone doubled our revenue. We now assign Morning and Evening shifts to the same seat without any confusion. Best library software in India!"</p>
                <div class="sf-author">
                  <div class="avatar avatar-md" style="background:#10b981;">VK</div>
                  <div>
                    <div class="sf-author-name">Vikram Kulkarni</div>
                    <div class="sf-author-role">Founder, Scholar's Den (Mumbai)</div>
                  </div>
                </div>
              </div>

              <!-- Review 3 -->
              <div class="sf-testimonial-card">
                <div class="sf-stars">★★★★★</div>
                <p class="sf-quote">"Setting up our new branch took less than 2 minutes with the onboarding wizard. My reception staff learned the software on day 1 with zero training. Highly recommended."</p>
                <div class="sf-author">
                  <div class="avatar avatar-md" style="background:#f59e0b;">RS</div>
                  <div>
                    <div class="sf-author-name">Rajesh Sharma</div>
                    <div class="sf-author-role">Manager, Apex Reading Hall (Jaipur)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── FAQ Accordion ── -->
        <section class="sf-section" id="faq">
          <div class="sf-landing-container" style="max-width:800px;">
            <div class="sf-section-header">
              <div class="sf-pill-badge">HAVE QUESTIONS?</div>
              <h2 class="sf-section-title">Frequently Asked Questions</h2>
              <p class="sf-section-subtitle">Everything you need to know about StudyFlow and getting started.</p>
            </div>

            <div class="sf-faq-list">
              <div class="sf-faq-item" onclick="toggleFaq(this)">
                <div class="sf-faq-q">
                  <span>How does WhatsApp notification delivery work?</span>
                  <span class="sf-faq-icon">+</span>
                </div>
                <div class="sf-faq-a">
                  StudyFlow supports two modes: (1) 1-Click Free WhatsApp Web links (100% free forever, zero setup), and (2) Official Meta WhatsApp Cloud API for automated background delivery with 1,000 free monthly messages included.
                </div>
              </div>

              <div class="sf-faq-item" onclick="toggleFaq(this)">
                <div class="sf-faq-q">
                  <span>Can I assign multiple students to the same seat on different shifts?</span>
                  <span class="sf-faq-icon">+</span>
                </div>
                <div class="sf-faq-a">
                  Yes! StudyFlow includes a dedicated multi-shift engine allowing you to assign Morning (e.g. 6 AM - 2 PM), Evening (2 PM - 10 PM), and Night shifts to the same physical seat without double-booking conflicts.
                </div>
              </div>

              <div class="sf-faq-item" onclick="toggleFaq(this)">
                <div class="sf-faq-q">
                  <span>Is my library data secure and backed up?</span>
                  <span class="sf-faq-icon">+</span>
                </div>
                <div class="sf-faq-a">
                  Absolutely. StudyFlow utilizes cloud-native Neon PostgreSQL with SSL encryption, tenant-level data partitioning, and continuous automated cloud backups.
                </div>
              </div>

              <div class="sf-faq-item" onclick="toggleFaq(this)">
                <div class="sf-faq-q">
                  <span>Do I need to install any software or app?</span>
                  <span class="sf-faq-icon">+</span>
                </div>
                <div class="sf-faq-a">
                  No installation required. StudyFlow runs seamlessly on any device — laptops, desktops, tablets, and mobile phones through any standard web browser.
                </div>
              </div>

              <div class="sf-faq-item" onclick="toggleFaq(this)">
                <div class="sf-faq-q">
                  <span>Can I cancel or upgrade my plan at any time?</span>
                  <span class="sf-faq-icon">+</span>
                </div>
                <div class="sf-faq-a">
                  Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from the Settings page.
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Bottom CTA Banner ── -->
        <section class="sf-bottom-cta">
          <div class="sf-landing-container" style="text-align:center;">
            <h2 style="font-size:32px;font-weight:800;color:white;margin-bottom:12px;">Ready to Modernize Your Library?</h2>
            <p style="font-size:16px;color:rgba(255,255,255,0.8);max-width:560px;margin:0 auto 28px auto;">
              Join 250+ reading rooms and libraries boosting their seat occupancy and fee collections with StudyFlow.
            </p>
            <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
              <button class="btn btn-lg" onclick="app.openRegisterModal()" style="background:white;color:var(--color-primary);font-weight:700;padding:14px 28px;">
                ✨ Start 14-Day Free Trial
              </button>
              <button class="btn btn-lg" onclick="app.navigate('/dashboard')" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);padding:14px 24px;">
                🚀 Test Live Demo
              </button>
            </div>
          </div>
        </section>

        <!-- ── Footer ── -->
        <footer class="sf-landing-footer">
          <div class="sf-landing-container sf-footer-inner">
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="sidebar-logo-icon" style="width:28px;height:28px;font-size:12px;">SF</div>
                <span style="font-weight:800;font-size:16px;color:var(--color-text-primary);">StudyFlow</span>
              </div>
              <p style="font-size:12px;color:var(--color-text-tertiary);margin:0;max-width:300px;">
                The complete multi-tenant cloud SaaS for study libraries, reading rooms, and student lounges.
              </p>
            </div>

            <div class="sf-footer-links-group">
              <div class="sf-footer-col">
                <div class="sf-footer-col-title">Product</div>
                <a href="#features" onclick="scrollToSection(event, 'features')">Seat Map</a>
                <a href="#features" onclick="scrollToSection(event, 'features')">WhatsApp Invoicing</a>
                <a href="#pricing" onclick="scrollToSection(event, 'pricing')">Pricing Plans</a>
                <a href="javascript:void(0)" onclick="app.navigate('/dashboard')">Live Demo</a>
              </div>
              <div class="sf-footer-col">
                <div class="sf-footer-col-title">Account</div>
                <a href="javascript:void(0)" onclick="app.openLoginModal()">Sign In</a>
                <a href="javascript:void(0)" onclick="app.openRegisterModal()">Create Library</a>
                <a href="javascript:void(0)" onclick="app.openUpgradeModal()">Upgrade Subscription</a>
              </div>
            </div>
          </div>
          <div class="sf-landing-container" style="border-top:1px solid var(--color-border-secondary);padding-top:16px;margin-top:24px;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--color-text-tertiary);flex-wrap:wrap;gap:8px;">
            <div>© ${new Date().getFullYear()} StudyFlow SaaS Platform. All rights reserved.</div>
            <div>Built with ❤️ for Indian Library Owners & Study Spaces</div>
          </div>
        </footer>
      </div>
    `;
  }

  window.setLandingBilling = function(cycle) {
    billingCycle = cycle;
    render();
  };

  window.toggleLandingBilling = function() {
    billingCycle = billingCycle === 'monthly' ? 'annual' : 'monthly';
    render();
  };

  window.scrollToSection = function(e, id) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  window.toggleFaq = function(el) {
    el.classList.toggle('open');
  };

  render();
}
