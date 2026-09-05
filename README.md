# AIAPPSY Link Engine — Custom URL Shortener & Redirect Service

A production-grade, lightweight URL shortener and redirect engine designed for Google Cloud Run and custom domain routing.

## Features
- **Instant HTTP 302 Redirection:** Sub-millisecond latency for custom slugs (e.g. `/apps`, `/hubzoo`).
- **Interactive Management Dashboard:** Clean web interface to create, manage, and delete custom shortlinks.
- **Click Tracking:** Real-time persistence of click statistics per link.
- **Docker & Cloud Run Ready:** Includes minimal Alpine container configuration.

## Deploying to Google Cloud Run
1. Connect this GitHub repository in Google Cloud Run / Google AI Studio.
2. Select Dockerfile build.
3. Deploy! Google will provision a fully managed, auto-scaling HTTPS service.
