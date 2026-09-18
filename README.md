# AIAPPSY Enterprise Platform & Short Link Engine

> **Proprietary AI SaaS Studio, Cloud Run Infrastructure & Autonomous Operations Suite**  
> Active Repository: `C:\Users\paul\.gemini\antigravity\scratch\linking`  
> Synchronized Cloud Run Repo: `C:\Users\paul\.gemini\antigravity\scratch\tinyurl-clone`

---

## 📌 Project Overview

**AIAPPSY** is an independent AI product studio and engineering ecosystem. This project combines:
1. **Public Showcase & Client Portal:** Dark-mode showcase of 6 production SaaS applications, client services, and custom AI engineering inquiry workflows.
2. **Short Link Engine & Telemetry:** Enterprise redirection, QR code generation, and deep device/geographic analytics.
3. **Internal Operations & CRM (Hubzoo):** Proprietary CRM, LinkedIn lead intelligence bridge, and 60-second mobile proposal builder strictly reserved for AIAPPSY operations.
4. **Availability & Meeting Hub:** Full Cal.com-style calendar scheduling, blackout date management, and Google Meet automated room provisioning.
5. **AI Admin Copilot:** Autonomous administrator assistant capable of managing discount codes, adjusting platform pricing, analyzing leads, and auditing link health.

---

## 📂 Architecture & Directory Structure

```
linking/
├── admin.html              # Standalone Admin Operations Center
├── index.html              # Root Public Portal
├── package.json            # Node.js dependencies & scripts
├── payments.json           # Application pricing, subscriptions & discount vouchers
├── server.js               # Express API, short-link redirects, Firestore & booking engine
├── public/                 # Static web assets & client-side applications
│   ├── index.html          # Production Public Showcase (6 SaaS platforms)
│   ├── booking.html        # Interactive Public Meeting Booking (Cal.com-style)
│   ├── checkout.html       # Bilingual Stripe/PayPal payment checkout & voucher engine
│   ├── generator.html      # 60-second mobile quotation builder
│   ├── portfolio.html      # SaaS platform catalog & licensing explorer
│   ├── styles.css          # Clean dark-mode design system (#070a12)
│   ├── app.js              # Interactive UI mockup canvas & app tabs
│   ├── advisor.js          # Interactive web AI advisor with bilingual knowledgebase
│   ├── i18n.js             # Client-side language switcher (NO/EN)
│   ├── data.js             # English SaaS catalog metadata (6 public platforms)
│   ├── data_no.js          # Norwegian SaaS catalog metadata (6 public platforms)
│   ├── terms.html          # Legal terms of use
│   ├── privacy.html        # Privacy policy & GDPR compliance
│   ├── disclaimer.html     # Financial & AI liability disclaimers
│   ├── apps/               # Dedicated platform landing pages
│   │   ├── hubzoo.html     # [INTERNAL] AIAPPSY CRM & Operations Engine
│   │   ├── upworkz.html    # Proposal Architect & Deal Closer
│   │   ├── maxmotion.html  # Multi-Model AI Video Studio (Wan 2.1, Kling, Minimax)
│   │   ├── subsentry.html  # SaaS Subscription Watchdog & Dark Pattern Shield
│   │   ├── appsave.html    # SaaS & AI Discount Finder
│   │   ├── mediabunny.html # WASM Media Processing, Background Removal & Audio Normalization
│   │   └── manus.html      # Autonomous Book & Manuscript Studio
│   └── admin/
│       ├── index.html      # Responsive Admin Control Panel
│       ├── login.html      # Secure admin authentication
│       ├── js/             # Admin JavaScript modules (meetings, copilot, leads, payments)
│       └── css/            # Admin styling
```

---

## 🚀 Key Modules & Capabilities

### 1. Availability Hub & Meeting Scheduler (`/booking.html` & `/admin/#meetings`)
- **Admin Configuration:**
  - Weekly operating hours per day (e.g. Mon–Fri 09:00–16:30, Fri 09:00–15:30).
  - Lunch break / blackout buffer toggles (e.g. 12:00–12:30).
  - Custom interval buffers between appointments (15 min default).
  - Minimum booking notice (2 hours default) and horizon limits (30 days default).
  - Holiday & vacation blackout date picker with removable tags.
  - Dedicated Google Meet static or dynamic room assignment.
- **Client Booking Experience:**
  - Responsive dark-mode month calendar with visual available/disabled day indicators.
  - Conflict-free slot computation via `/api/bookings/available-slots`.
  - Instant calendar export: Google Calendar, Outlook Web, and download `.ics`.

### 2. Hubzoo Internal Operations & CRM (`/admin/#leads` & `/apps/hubzoo.html`)
- **Strictly for AIAPPSY Internal Use:**
  - Inbound lead capture from website forms and LinkedIn Lead Bridge.
  - Contact deduplication and persistence in Google Cloud Firestore.
  - 60-second mobile quotation builder (`/generator.html`) with 1-tap client signing and direct sync to Norwegian accounting platforms (Fiken, Tripletex).
  - Blocked from public checkout with automated lock notice.

### 3. Production Public SaaS Apps (6 Platforms)
- **Upworkz:** Autonomous proposal architect & 220-character hook generator.
- **MaxMotion AI:** Unified multi-model video generation studio (Wan 2.1, Kling 1.5, Minimax Hailuo).
- **SubSentry:** SaaS spend auditing, dark pattern cancellation playbooks.
- **AppSave:** Verified SaaS and cloud subscription coupon finder.
- **MediaBunny:** In-browser WASM media converter, EBU R128 audio normalization.
- **Manus AI Studio:** Autonomous long-form book and manuscript production engine.

### 4. Admin AI Copilot
- Natural language operations assistant in Admin.
- Direct tool execution:
  - Create, activate, and deactivate discount vouchers.
  - Inspect and update subscription pricing.
  - Query lead pipeline and booking metrics.
  - Audit broken short links and click statistics.

---

## 💻 Running the Application Locally

### Prerequisites
- Node.js 18+ installed
- PowerShell or bash terminal

### Quick Start
```powershell
# Navigate to the project directory
cd C:\Users\paul\.gemini\antigravity\scratch\linking

# Install dependencies (if not already installed)
npm install

# Start local server on port 8080
$env:PORT="8080"; node server.js
```

The application will be live at:
- **Public Portal:** `http://localhost:8080/`
- **Meeting Booking:** `http://localhost:8080/booking.html`
- **Quote Generator:** `http://localhost:8080/generator.html`
- **Admin Panel:** `http://localhost:8080/admin`

---

## 🌐 Deployment to Google Cloud Run

This project is deployed to Google Cloud Run under service name `tinyurl-clone` / `link-engine`.
All changes are kept synchronized between `linking` and `tinyurl-clone` and pushed to Git:

```powershell
# Git remotes:
# linking:       https://github.com/aiappsy/linking.git (main)
# tinyurl-clone: https://github.com/aiappsy/link-engine.git (main)
```
