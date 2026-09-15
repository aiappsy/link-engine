# AIAPPSY — Flagship SaaS Showcase, Custom AI Engineering & High-Performance Redirect Engine

The unified web platform powering **[aiappsy.com](https://aiappsy.com)**, deployed on Google Cloud Run.

---

## 🌟 Platform Overview

1. **Root Flagship Showcase (`/`)**:
   - Interactive marketplace showcasing all 7 turnkey AI SaaS platforms.
   - Interactive Smart Match Advisor, live currency converter, dual language toggle (EN/NO).
   - High-converting acquisition funnels and direct licensing inquiry flows.

2. **Dedicated App Landing Pages (`/apps/`)**:
   - 7 Google-optimized, standalone product pages with structured data (`SoftwareApplication`, `FAQPage`, `BreadcrumbList`).
   - `/apps/hubzoo.html`, `/apps/upworkz.html`, `/apps/subsentry.html`, `/apps/maxmotion.html`, `/apps/appsave.html`, `/apps/mediabunny.html`, `/apps/manus.html`.

3. **Bespoke AI Engineering & Agency Services (`/custom-development.html`)**:
   - Technical service guide for custom autonomous action agents, generative media pipelines, and ERP integrations.

4. **SEO Knowledge Hub & Article Studio (`/articles/`, `/studio`)**:
   - Cornerstone thought leadership articles.
   - In-browser WYSIWYG studio for instant publishing with automated Google & Bing sitemap pings.

5. **High-Performance Redirect Engine (`/:slug`)**:
   - Microsecond 302 redirections for custom slugs (e.g. `/saasapps`, `/hubzoo`, `/agentur`).
   - **Query Parameter Preservation**: UTM parameters, tracking codes, and auth tokens are preserved and forwarded.
   - **Subpath Forwarding**: Handles nested routes (e.g. `/:slug/subpath`).
   - **Atomic File Writing**: Prevents data corruption during concurrent click traffic.

6. **Secured Administrative Link Manager (`/admin`)**:
   - Protected behind administrator authentication (`ADMIN_PASSWORD`).
   - Manage, inspect, and track click metrics without exposing the link generator publicly.

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port for the web server | `8080` |
| `ADMIN_PASSWORD` | Administrative password for Link Engine & Article Studio | `aiappsy2026` |

---

## 🚀 Deployment to Google Cloud Run

This repository is directly connected to GitHub (`aiappsy/link-engine`).

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Unify aiappsy.com: flagship showcase, secure admin, and robust link engine"
   git push origin main
   ```
2. Google Cloud Run automatically builds the Docker container and deploys the new revision to **aiappsy.com**.

