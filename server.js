const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const LINKS_FILE = path.join(__dirname, 'links.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const LEADS_FILE = path.join(__dirname, 'leads.json');
const EMAIL_LOGS_FILE = path.join(__dirname, 'email_logs.json');

let firestoreDb = null;
let isFirestoreReady = false;
let linksMemoryCache = null;
let settingsMemoryCache = null;

try {
  const { Firestore } = require('@google-cloud/firestore');
  // Initialize Firestore client with ignoreUndefinedProperties
  firestoreDb = new Firestore({ ignoreUndefinedProperties: true });
  console.log('[Firestore] Klient initialisert. Kobler til Google Cloud Firestore...');
} catch (err) {
  console.log('[Firestore] Kunne ikke laste Firestore-bibliotek, kjører i lokal filmodus:', err.message);
}

function parseDomainEntry(domainStr, label = '', isDefault = false) {
  const clean = domainStr.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const parts = clean.split('.');
  const isSubdomain = parts.length >= 3;
  const subdomain = isSubdomain ? parts[0] : '@';
  const parentDomain = isSubdomain ? parts.slice(1).join('.') : clean;
  const defaultLabel = isSubdomain ? `${clean} (Subdomene – ${clean.length} tegn)` : `${clean} (Toppdomene / Apex – ${clean.length} tegn)`;
  const recordType = isSubdomain ? 'CNAME' : 'A (4 poster)';
  const target = isSubdomain 
    ? 'ghs.googlehosted.com.' 
    : '216.239.32.21 (samt .34, .36, .38)';
  return {
    domain: clean,
    label: label ? label.trim() : defaultLabel,
    isDefault,
    isSubdomain,
    subdomain,
    parentDomain,
    recordType,
    target,
    aRecords: isSubdomain ? [] : ['216.239.32.21', '216.239.34.21', '216.239.36.21', '216.239.38.21'],
    gcloudCommand: `gcloud beta run domain-mappings create --service aiappsy-link-engine --domain ${clean} --region us-west1`
  };
}

const DEFAULT_SETTINGS = {
  activeDomain: process.env.CUSTOM_DOMAIN || process.env.SHORT_DOMAIN || 'aiappsy.com',
  domains: [
    parseDomainEntry('aiappsy.com', 'aiappsy.com (Hoveddomene – 11 tegn)', true),
    parseDomainEntry('go.aiappsy.no', 'go.aiappsy.no (Anbefalt subdomene – 13 tegn)', false),
    parseDomainEntry('link.aiappsy.no', 'link.aiappsy.no (Subdomene – 15 tegn)', false),
    parseDomainEntry('aiappsy.link', 'aiappsy.link (Toppdomene – 12 tegn)', false)
  ]
};

function loadSettingsFromFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      if (!data.domains || !Array.isArray(data.domains) || data.domains.length === 0) {
        data.domains = DEFAULT_SETTINGS.domains;
      }
      if (!data.activeDomain) {
        data.activeDomain = data.domains[0].domain;
      }
      return data;
    }
  } catch (err) {
    console.error('Kunne ikke laste settings.json:', err.message);
  }
  return DEFAULT_SETTINGS;
}

function saveSettingsToFile(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Feil ved lagring av settings.json:', err.message);
    return false;
  }
}

function loadLinksFromFile() {
  try {
    if (fs.existsSync(LINKS_FILE)) {
      const content = fs.readFileSync(LINKS_FILE, 'utf-8');
      return content ? JSON.parse(content) : {};
    }
  } catch (err) {
    console.error('Kunne ikke laste links.json:', err.message);
  }
  return {};
}

function saveLinksToFile(links) {
  try {
    fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Feil ved lagring av links.json:', err.message);
    return false;
  }
}

// Initial synkronisering mot Firestore ved oppstart
async function syncFromFirestore() {
  linksMemoryCache = loadLinksFromFile();
  settingsMemoryCache = loadSettingsFromFile();

  if (!firestoreDb) return;

  try {
    const snapshot = await firestoreDb.collection('links').get();
    const remoteLinks = {};
    snapshot.forEach(doc => {
      remoteLinks[doc.id] = doc.data();
    });

    if (Object.keys(remoteLinks).length > 0) {
      linksMemoryCache = remoteLinks;
      saveLinksToFile(remoteLinks);
      console.log(`[Firestore] Synkroniserte ${Object.keys(remoteLinks).length} lenker fra Firestore.`);
    } else if (Object.keys(linksMemoryCache).length > 0) {
      // Last opp eksisterende lokale lenker til Firestore
      const batch = firestoreDb.batch();
      for (const [slug, item] of Object.entries(linksMemoryCache)) {
        batch.set(firestoreDb.collection('links').doc(slug), item);
      }
      await batch.commit();
      console.log(`[Firestore] Lastet opp ${Object.keys(linksMemoryCache).length} lokale lenker til Firestore.`);
    }

    try {
      const setDoc = await firestoreDb.collection('settings').doc('global').get();
      if (setDoc.exists) {
        settingsMemoryCache = setDoc.data();
        saveSettingsToFile(settingsMemoryCache);
        console.log('[Firestore] Innstillinger synkronisert fra Firestore.');
      }
    } catch (e) {}

    isFirestoreReady = true;
    console.log('[Firestore] Persistent database er tilkoblet og klar!');
  } catch (err) {
    console.warn('[Firestore] Info: Firestore ikke tilgjengelig eller ikke aktivert ennå. Bruker lokal fillagring:', err.message);
  }
}
syncFromFirestore();

function loadSettings() {
  if (!settingsMemoryCache) {
    settingsMemoryCache = loadSettingsFromFile();
  }
  return settingsMemoryCache;
}

function saveSettings(settings) {
  settingsMemoryCache = settings;
  saveSettingsToFile(settings);
  if (isFirestoreReady && firestoreDb) {
    firestoreDb.collection('settings').doc('global').set(settings, { merge: true })
      .catch(err => console.error('[Firestore] Feil ved lagring av innstillinger:', err.message));
  }
  return true;
}

function loadLinks() {
  if (!linksMemoryCache) {
    linksMemoryCache = loadLinksFromFile();
  }
  return linksMemoryCache;
}

function saveLinks(links, modifiedSlug = null) {
  linksMemoryCache = links;
  saveLinksToFile(links);

  if (isFirestoreReady && firestoreDb) {
    if (modifiedSlug) {
      if (links[modifiedSlug]) {
        firestoreDb.collection('links').doc(modifiedSlug).set(links[modifiedSlug], { merge: true })
          .catch(err => console.error(`[Firestore] Feil ved lagring av /${modifiedSlug}:`, err.message));
      } else {
        firestoreDb.collection('links').doc(modifiedSlug).delete()
          .catch(err => console.error(`[Firestore] Feil ved sletting av /${modifiedSlug}:`, err.message));
      }
    } else {
      const batch = firestoreDb.batch();
      for (const [slug, item] of Object.entries(links)) {
        batch.set(firestoreDb.collection('links').doc(slug), item);
      }
      batch.commit().catch(err => console.error('[Firestore] Batch-lagringsfeil:', err.message));
    }
  }
  return true;
}

// Serve static assets from public folder with extensionless URL support
const PUBLIC_DIR = path.join(__dirname, 'public');

// Admin route with no-cache headers to ensure immediate freshness
app.get(['/admin', '/admin/', '/admin/index.html', '/admin.html'], (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  const adminFile = path.join(PUBLIC_DIR, 'admin.html');
  if (fs.existsSync(adminFile)) {
    return res.sendFile(adminFile);
  }
  const rootAdminFile = path.join(__dirname, 'admin.html');
  if (fs.existsSync(rootAdminFile)) {
    return res.sendFile(rootAdminFile);
  }
  res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html'));
});

app.use(express.static(PUBLIC_DIR, {
  extensions: ['html', 'htm'],
  maxAge: '1h'
}));

// Explicit shortcut routes
app.get(['/portfolio', '/portfolio/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'portfolio.html'));
});

app.get(['/custom-development', '/custom-dev'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'custom-development.html'));
});

app.get(['/studio', '/studio/'], (req, res) => res.redirect(302, '/admin#articles'));


// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Cache-Control & headers middleware
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.STUDIO_PASSWORD || 'aiappsy2026';

const APP_CTAS = {
  upworkz: {
    name: "Upworkz",
    title: "Automate High-Converting Upwork Proposals in 45 Seconds",
    desc: "Upworkz deconstructs client job postings, audits scope gotchas, and crafts winning 220-character hooks that bypass mobile inbox truncation.",
    link: "../apps/upworkz.html",
    btnText: "Explore Upworkz Full Guide & Specs →"
  },
  hubzoo: {
    name: "Hubzoo",
    title: "60-Second Mobile Quotes & Automated Multi-Channel Follow-Up",
    desc: "Built for contractors, craftsmen, and busy SMBs. Send professional estimates from your phone in 60 seconds with native 1-click sync to Fiken and Tripletex.",
    link: "../apps/hubzoo.html",
    btnText: "Explore Hubzoo Specifications & Video Demo →"
  },
  subsentry: {
    name: "SubSentry",
    title: "Expose SaaS Dark Patterns & Cancel Unwanted Subscriptions",
    desc: "Stop recurring credit card bloat. SubSentry flags deceptive checkout traps, provides 1-click cancellation playbooks, and suggests cost-effective alternatives.",
    link: "../apps/subsentry.html",
    btnText: "Explore SubSentry Shield →"
  },
  maxmotion: {
    name: "MaxMotion AI",
    title: "The Multi-Model AI Video Studio (Wan 2.1, Kling & Minimax)",
    desc: "Orchestrate the industry's premier video models in a unified timeline canvas with permanent Google Cloud Storage that never expires.",
    link: "../apps/maxmotion.html",
    btnText: "Explore MaxMotion AI Studio →"
  },
  appsave: {
    name: "AppSave",
    title: "The 'Honey' for SaaS, Cloud Hosting & AI Subscriptions",
    desc: "A lightweight Chrome extension (Manifest V3) that tests verified promo codes on checkout pages to save 15% to 40% on software.",
    link: "../apps/appsave.html",
    btnText: "Explore AppSave Directory →"
  },
  mediabunny: {
    name: "MediaBunny",
    title: "In-Browser WebAssembly Media Processing & Audio Normalizer",
    desc: "AI background removal, broadcast-standard EBU R128 audio normalization, and 75% CRF video compression on-device with zero data uploads.",
    link: "../apps/mediabunny.html",
    btnText: "Explore MediaBunny Tools →"
  },
  manus: {
    name: "Manus AI Studio",
    title: "Autonomous General-Purpose Action Agent",
    desc: "Beyond chat: Manus browses the web, writes code, scaffolds full-stack applications, and solves complex business workflows unattended.",
    link: "../apps/manus.html",
    btnText: "Explore Manus AI Studio →"
  },
  custom_dev: {
    name: "Custom AI Engineering",
    title: "Need Bespoke AI Software Engineered For Your Business?",
    desc: "We build custom autonomous action agents, generative media pipelines, and enterprise ERP bridges. Working MVPs delivered in 7 to 14 days.",
    link: "../custom-development.html",
    btnText: "Explore Custom AI Engineering Services →"
  }
};

function generateArticleHtml(article) {
  const cta = APP_CTAS[article.targetApp] || APP_CTAS['custom_dev'];
  const canonicalUrl = `https://aiappsy.com/articles/${article.slug}.html`;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "description": article.metaDesc,
    "datePublished": article.publishDate || new Date().toISOString().split('T')[0],
    "author": {
      "@type": "Organization",
      "name": "AIAPPSY Research & Engineering"
    },
    "publisher": {
      "@type": "Organization",
      "name": "AIAPPSY",
      "url": "https://aiappsy.com"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    }
  };

  const faqSchema = (article.faqs && article.faqs.length > 0) ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": article.faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  } : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title} — AIAPPSY Insights</title>
  <meta name="description" content="${article.metaDesc}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${article.title}">
  <meta property="og:description" content="${article.metaDesc}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json">
${JSON.stringify(blogSchema, null, 2)}
  </script>
  ${faqSchema ? `<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>` : ''}
  <style>
    body { background: #0b0f19; color: #f1f5f9; font-family: 'Inter', -apple-system, sans-serif; line-height: 1.7; margin: 0; padding: 0; }
    .article-wrap { max-width: 820px; margin: 0 auto; padding: 3rem 1.5rem 6rem; }
    .article-header { margin-bottom: 2.5rem; text-align: center; }
    .article-tag { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 999px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #a5b4fc; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.25rem; }
    .article-header h1 { font-size: 2.4rem; font-weight: 800; line-height: 1.25; margin-bottom: 1rem; color: #ffffff; letter-spacing: -0.02em; }
    .article-meta { color: #94a3b8; font-size: 0.9rem; }
    .article-body { font-size: 1.05rem; color: #cbd5e1; }
    .article-body h2 { font-size: 1.6rem; font-weight: 700; color: #ffffff; margin-top: 2.5rem; margin-bottom: 1rem; }
    .article-body h3 { font-size: 1.25rem; font-weight: 600; color: #e2e8f0; margin-top: 1.75rem; margin-bottom: 0.75rem; }
    .article-body p { margin-bottom: 1.25rem; }
    .article-body ul, .article-body ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
    .article-body li { margin-bottom: 0.5rem; }
    .article-cta-box { background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 16px; padding: 2rem; margin: 3rem 0; text-align: center; }
    .article-cta-box h3 { font-size: 1.35rem; font-weight: 800; color: #ffffff; margin-bottom: 0.75rem; }
    .article-cta-box p { color: #cbd5e1; margin-bottom: 1.5rem; font-size: 0.98rem; }
    .btn-cta { display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 0.85rem 1.75rem; border-radius: 10px; font-weight: 700; transition: background 0.2s; }
    .btn-cta:hover { background: #4f46e5; }
    .faq-section { margin-top: 3.5rem; border-top: 1px solid #1e293b; padding-top: 2.5rem; }
    .faq-item { margin-bottom: 1.5rem; background: #131d35; border: 1px solid #1e293b; border-radius: 10px; padding: 1.25rem 1.5rem; }
    .faq-q { font-weight: 700; color: #ffffff; margin-bottom: 0.5rem; font-size: 1.05rem; }
    .faq-a { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }
    .article-nav { display: flex; justify-content: space-between; align-items: center; padding-bottom: 2rem; border-bottom: 1px solid #1e293b; margin-bottom: 2.5rem; }
    .nav-back { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; }
    .nav-back:hover { color: #ffffff; }
  </style>
</head>
<body>
  <div class="article-wrap">
    <div class="article-nav">
      <a href="index.html" class="nav-back">← Back to Articles Hub</a>
      <a href="/" class="nav-back">AIAPPSY Home</a>
    </div>

    <header class="article-header">
      <span class="article-tag">${article.category || 'AI Strategy'}</span>
      <h1>${article.title}</h1>
      <div class="article-meta">
        <span>By AIAPPSY Engineering</span> · 
        <span>${article.readTime || '5 min read'}</span> · 
        <span>Published ${article.publishDate || new Date().toISOString().split('T')[0]}</span>
      </div>
    </header>

    <article class="article-body">
      ${article.contentHtml}

      <div class="article-cta-box">
        <h3>${cta.title}</h3>
        <p>${cta.desc}</p>
        <a href="${cta.link}" class="btn-cta">${cta.btnText}</a>
      </div>

      ${(article.faqs && article.faqs.length > 0) ? `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${article.faqs.map(f => `
          <div class="faq-item">
            <div class="faq-q">${f.q}</div>
            <div class="faq-a">${f.a}</div>
          </div>
        `).join('')}
      </section>
      ` : ''}
    </article>

    <footer style="margin-top: 4rem; text-align: center; border-top: 1px solid #1e293b; padding-top: 2rem; color: #64748b; font-size: 0.85rem;">
      <p>© ${new Date().getFullYear()} AIAPPSY. Built on Google Cloud Run & Frontier AI Models.</p>
    </footer>
  </div>
</body>
</html>`;
}

function updateArticlesIndex(article) {
  const indexPath = path.join(PUBLIC_DIR, 'articles', 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, 'utf8');
  const cardSnippet = `
      <!-- Article: ${article.slug} -->
      <a href="${article.slug}.html" class="article-stream-card">
        <div class="stream-tag-row">
          <span>${article.category || 'AI Strategy'}</span>
          <span>•</span>
          <span>${article.readTime || '5 min read'}</span>
        </div>
        <h2>${article.title}</h2>
        <p>${article.metaDesc}</p>
        <div class="stream-card-footer">
          <span>Focus: ${APP_CTAS[article.targetApp]?.name || 'AI Engineering'}</span>
          <span class="read-arrow">Read Article →</span>
        </div>
      </a>`;

  if (content.includes(`href="${article.slug}.html"`)) return;

  const marker = '<main class="articles-stream">';
  if (content.includes(marker)) {
    content = content.replace(marker, `${marker}\n${cardSnippet}`);
    fs.writeFileSync(indexPath, content, 'utf8');
  }
}

function updateSitemap(slug) {
  const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  if (!fs.existsSync(sitemapPath)) return;

  let content = fs.readFileSync(sitemapPath, 'utf8');
  const articleUrl = `https://aiappsy.com/articles/${slug}.html`;

  if (content.includes(articleUrl)) return;

  const newEntry = `  <url>
    <loc>${articleUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`;

  const marker = '<!-- Dedicated Product Landing Pages -->';
  if (content.includes(marker)) {
    content = content.replace(marker, `${newEntry}\n  ${marker}`);
  } else {
    content = content.replace('</urlset>', `${newEntry}\n</urlset>`);
  }

  fs.writeFileSync(sitemapPath, content, 'utf8');
}

function pingSearchEngines(sitemapUrl) {
  const encodedUrl = encodeURIComponent(sitemapUrl);
  const targets = [
    { name: 'Google', host: 'www.google.com', path: `/ping?sitemap=${encodedUrl}` },
    { name: 'Bing', host: 'www.bing.com', path: `/ping?sitemap=${encodedUrl}` }
  ];

  return Promise.all(targets.map(target => {
    return new Promise((resolve) => {
      const req = https.get({
        host: target.host,
        path: target.path,
        headers: { 'User-Agent': 'AIAPPSY-Sitemap-Notifier/1.0' }
      }, (res) => {
        resolve({ target: target.name, status: res.statusCode });
      });
      req.on('error', (err) => {
        resolve({ target: target.name, error: err.message });
      });
      req.setTimeout(3500, () => {
        req.destroy();
        resolve({ target: target.name, timeout: true });
      });
    });
  }));
}

// ============================================================================



// Admin Authorization Middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-admin-password'];
  const cookieStr = req.headers.cookie || '';
  const hasCookie = cookieStr.includes('admin_auth=') || cookieStr.includes('aiappsy2026');
  
  let providedPassword = customHeader;
  
  if (!providedPassword && authHeader) {
    providedPassword = authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  
  if (!providedPassword && hasCookie) {
    providedPassword = ADMIN_PASSWORD;
  }

  if (!providedPassword && req.query.key) {
    providedPassword = req.query.key;
  }

  if (providedPassword === ADMIN_PASSWORD) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Uautorisert: Feil eller manglende admin-passord (X-Admin-Password).'
  });
}

app.post(['/api/publish', '/api/publish-article'], requireAdminAuth, async (req, res) => {
  try {
    const article = req.body;
    if (!article.title || !article.slug || !article.contentHtml) {
      return res.status(400).json({ success: false, error: 'Tittel, slug og innhold er påkrevd.' });
    }

    article.slug = article.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!article.metaDesc) article.metaDesc = article.title;

    const html = generateArticleHtml(article);
    const targetFile = path.join(PUBLIC_DIR, 'articles', `${article.slug}.html`);
    fs.writeFileSync(targetFile, html, 'utf8');

    updateArticlesIndex(article);
    updateSitemap(article.slug);

    const sitemapFullUrl = 'https://aiappsy.com/sitemap.xml';
    const pingResults = await pingSearchEngines(sitemapFullUrl);

    res.json({
      success: true,
      slug: article.slug,
      url: `/articles/${article.slug}.html`,
      fullUrl: `https://aiappsy.com/articles/${article.slug}.html`,
      pingResults,
      message: `Artikkelen '${article.title}' ble publisert og søkemotorer varslet!`
    });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apps list for studio dropdown
app.get('/api/apps', (req, res) => {
  res.json(APP_CTAS);
});

// ============================================================================
// AI ARTICLE WRITER & SEO CONTENT ENGINE
// Trained on AIAPPSY's 7 Portfolio Apps, Cloud Dev & Frontier AI Tech
// ============================================================================

const AIAPPSY_KNOWLEDGE_BASE = `
You are the Lead Technical Writer and AI Systems Architect for AIAPPSY (aiappsy.com), a premier frontier AI engineering house and micro-SaaS studio.
You write authoritative, deeply informative, compelling, and actionable articles about modern cloud application development, frontier AI technologies, and AIAPPSY's proprietary portfolio of apps and engineering services.

## AIAPPSY PORTFOLIO APPS & SERVICES:
1. Hubzoo (Slug/key: hubzoo, URL: ../apps/hubzoo.html)
   - Value Proposition: 60-Second Mobile Quotes & Automated Multi-Channel Follow-Up.
   - Core Audience: Contractors, craftsmen (snekkere, elektrikere, rørleggere, malere), construction SMBs, field service professionals.
   - Key Features: Fast estimate builder configured on mobile, automated SMS and email follow-up sequence, native 1-click accounting sync to Fiken and Tripletex, real-time client view notifications.
   - Pain Point Solved: Eliminates the "lead black hole" where over 40% of inbound requests are lost because contractors spend evenings manually drafting PDFs.

2. Upworkz (Slug/key: upworkz, URL: ../apps/upworkz.html)
   - Value Proposition: 45-Second AI Proposal Architect for Upwork & B2B Freelancers.
   - Core Audience: Top-rated freelancers, agency owners, independent software engineers, consultants.
   - Key Features: Deconstructs client job postings, identifies hidden screening questions and gotchas, crafts high-converting 220-character opening hooks designed specifically to beat mobile inbox truncation, generates customized technical scopes.
   - Metrics: Lifts proposal interview rates from average 8% to over 35%.

3. SubSentry (Slug/key: subsentry, URL: ../apps/subsentry.html)
   - Value Proposition: SaaS Dark Pattern Shield & Recurring Subscription Audit.
   - Core Audience: Startup founders, SMB operations managers, finance directors, tech consumers.
   - Key Features: Detects hidden auto-renewals, multi-step cancellation mazes, deceptive checkout tick-boxes, generates 1-click verified cancellation playbooks, provides cheaper or open-source alternatives.
   - Pain Point Solved: Reclaims an average of $2,400 to $18,000 annually in zombie software licenses and shadow IT bloat.

4. MaxMotion AI (Slug/key: maxmotion, URL: ../apps/maxmotion.html)
   - Value Proposition: Multi-Model AI Video Production Studio on a Single Canvas.
   - Core Audience: Video creators, marketing agencies, motion designers, social media managers.
   - Key Features: Unifies premier video models (Wan 2.1, Kling 1.5, Minimax Hailuo AI) in a unified multi-track timeline canvas, permanent Google Cloud Storage assets that never expire (no 24h CDN expiry), direct camera control prompts, frame interpolation.
   - Pain Point Solved: Ends vendor lock-in and juggling 4 different subscriptions with expiring download links.

5. MediaBunny (Slug/key: mediabunny, URL: ../apps/mediabunny.html)
   - Value Proposition: In-Browser WebAssembly Media Processor & Audio Normalizer.
   - Core Audience: Content creators, podcasters, video editors, privacy-conscious enterprises.
   - Key Features: 100% private on-device processing via WebAssembly (WASM) with zero data uploads to cloud servers, neural AI background removal, broadcast-standard EBU R128 loudness normalization (-23 LUFS / -14 LUFS), 75% CRF video compression.
   - Advantage: Zero cloud server compute cost, total GDPR compliance, instant processing without network bottleneck.

6. AppSave (Slug/key: appsave, URL: ../apps/appsave.html)
   - Value Proposition: Chrome Extension (Manifest V3) for SaaS & Cloud Discounts.
   - Core Audience: Small businesses, solo developers, procurement teams buying SaaS tools.
   - Key Features: Auto-tests crowdsourced and verified coupon codes at checkout for SaaS, cloud hosting (AWS, GCP, DigitalOcean), AI API providers, and developer productivity tools.
   - Impact: Saves 15% to 40% on SaaS subscriptions with zero user friction.

7. Manus AI Studio (Slug/key: manus, URL: ../apps/manus.html)
   - Value Proposition: Autonomous General-Purpose Action Agent for Business Automation.
   - Core Audience: Enterprise tech leads, operations managers, developers.
   - Key Features: Full browser automation (Playwright/Puppeteer), sandboxed code execution, dynamic API synthesis, end-to-end task execution (from raw prompt to compiled code, formatted reports, or scraped databases).
   - Difference vs Chatbots: Executes real multi-step tool calls, browses the live web, repairs errors autonomously without waiting for human intervention.

8. Custom AI Engineering (Slug/key: custom_dev, URL: ../custom-development.html)
   - Value Proposition: Bespoke AI Systems Engineered in 7 to 14 Days.
   - Offerings: Autonomous agent swarms, production RAG vector search engines, real-time Voice AI pipelines (<500ms latency), ERP/CRM bridges (Fiken, Tripletex, SAP), Google Cloud Run microservices.
   - Delivery: Battle-tested production code with CI/CD, monitoring, and fixed-price scope.

## APP DEVELOPMENT & ARCHITECTURE PRINCIPLES:
- Serverless & Cloud-Native: Built on Google Cloud Run with Docker containers, zero-idle scale to zero, multi-zone failover, cold-start mitigation (<300ms).
- Zero-Bloat Client Architecture: Modern Vanilla JS and high-performance Web Components instead of heavy single-page app frameworks, yielding sub-50ms TTFB and perfect 100 Lighthouse scores.
- Client-Side WASM Compute: Offloading heavy media/neural workloads to client hardware using WebAssembly (MediaBunny), slashing cloud GPU bills to zero.
- Enterprise Integrations: Direct REST and webhook bridges with Norwegian and European accounting ERPs (Fiken, Tripletex) and payment gateways (Stripe, Vipps, PayPal).

## FRONTIER AI TECH STACK:
- Hybrid RAG: Dense vector embeddings combined with sparse BM25 keyword matching and cross-encoder reranking.
- Autonomous Action Agents: Multi-turn tool execution, reflection and self-correction loops, deterministic schema validation.
- Next-Gen Generative Video: Wan 2.1, Kling 1.5, Minimax Hailuo AI.
- Voice AI: WebRTC duplex streaming audio with ultra-low latency (<500ms voice turnarounds).
`;

function callGeminiArticleJson(apiKey, systemInstruction, userPrompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: userPrompt }]
      }],
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'Gemini API Error'));
          }
          const rawText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error('Ingen tekst mottatt fra Gemini'));
          
          let cleaned = rawText.trim();
          if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
          else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/, '');
          
          const articleJson = JSON.parse(cleaned);
          resolve(articleJson);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(35000, () => {
      req.destroy();
      reject(new Error('Tidsavbrudd mot Gemini API (35s)'));
    });
    req.write(payload);
    req.end();
  });
}

function generateFallbackArticle({ topic = '', targetApp = 'hubzoo', articleType = 'how-to', language = 'no', tone = 'tactical' }) {
  const isEn = language === 'en';
  const appMeta = APP_CTAS[targetApp] || APP_CTAS['hubzoo'];
  const appName = appMeta.name;
  const cleanTopic = (topic || '').trim();

  // Knowledge base templates by app
  const templates = {
    hubzoo: {
      category_no: 'B2B Salg & AI-Automatisering',
      category_en: 'B2B Sales & AI Automation',
      defaultTitle_no: 'Hvordan sende profesjonelle håndverkertilbud på 60 sekunder og vinne 3x flere oppdrag',
      defaultTitle_en: 'How 60-Second Mobile Quotes & Automated Follow-Up Triple Contractor Win Rates',
      slug_no: '60-sekunders-tilbud-og-salgsautomatisering-handverkere',
      slug_en: '60-second-mobile-quotes-contractor-win-rates',
      metaDesc_no: 'Oppdag hvordan ledende håndverkere kutter tilbudstiden fra timer til sekunder med Hubzoo, integrerer med Fiken/Tripletex og sikrer 7 av 10 oppdrag.',
      metaDesc_en: 'Discover how top contractors slash quoting time from hours to seconds with Hubzoo, sync with modern ERPs, and close 7 out of 10 incoming client jobs.',
      h1_no: 'Den Usynlige Salgslekkasjen: Hvorfor Håndverkere Taper 40% av Innkommende Jobber',
      h1_en: 'The Silent Sales Leak: Why Contractors Lose 40% of Inbound Inquiries',
      contentHtml_no: `
        <p class="lead">De fleste håndverkere, snekkere og elektrikere taper ikke oppdrag på pris eller faglig dyktighet – de taper fordi det tar for lang tid å sende pristilbudet. I 2026 forventer kunden svar samme dag.</p>
        
        <h2>Problemet med kveldsarbeid og manuelle PDF-tilbud</h2>
        <p>En typisk håndverker bruker 6 til 10 timer hver uke på kontorarbeid etter at den fysiske arbeidsdagen er over. Målinger, notater på papirlapper og manuelle Excel-ark fører til forsinkelser på 3 til 7 dager før kunden mottar et tilbud. Forskning viser at <strong>over 80 % av kundene velger den første seriøse leverandøren</strong> som leverer et ryddig, spesifisert estimat.</p>

        <blockquote>"Den raskeste leverandøren med et profesjonelt og transparent tilbud vinner oppdraget i 7 av 10 tilfeller. Å vente til søndag kveld med å skrive tilbud er en direkte oppskrift på tapt omsetning."</blockquote>

        <h2>Slik fungerer 60-sekunders mobil arbeidsflyt med Hubzoo</h2>
        <p>Med moderne mobile verktøy som <a href="../apps/hubzoo.html"><strong>Hubzoo</strong></a> kan du generere et komplett, kalkulert pristilbud rett fra mobilen mens du fortsatt står på befaringen hos kunden:</p>
        <ul>
          <li><strong>Maler for repeterende jobber:</strong> Standardiserte timepriser, materiellpåslag og vanlige oppdrag legges inn med få trykk.</li>
          <li><strong>Automatisk flerkanals oppfølging:</strong> Systemet sender automatisk en høflig SMS og e-post etter 48 timer dersom kunden ikke har svart.</li>
          <li><strong>Direkte regnskapssynk:</strong> Full 1-klikks overføring til Fiken og Tripletex, slik at du slipper dobbeltarbeid ved fakturering.</li>
        </ul>

        <h2>Målbare resultater etter 30 dager</h2>
        <p>Bedrifter som har gått over til umiddelbar mobil tilbudsgiving rapporterer i gjennomsnitt en <strong>økning i tilslagsrate på 68 %</strong>, samtidig som administrasjonstiden kuttes med 8 timer per uke per prosjektleder.</p>
      `,
      contentHtml_en: `
        <p class="lead">Contractors, craftsmen, and field service teams rarely lose projects due to craftsmanship or pricing—they lose them because drafting quotes takes too long. In 2026, speed to lead defines win rates.</p>

        <h2>The Desk Trap: Why Evening PDF Invoicing is Killing Growth</h2>
        <p>Contractors spend an average of 8 hours every weekend typing up estimates from crumpled job-site notes. By the time a proposal reaches a homeowner or property manager 5 days later, a competitor has already visited, quoted, and started work. Data proves that <strong>over 78% of service deals are awarded to the first responder</strong> providing a transparent breakdown.</p>

        <blockquote>"Speed wins deals. In residential and commercial subcontracting, the business that provides a structured, mobile-first estimate within hours closes at triple the industry average."</blockquote>

        <h2>The 60-Second Mobile Proposal Engine</h2>
        <p>Using <a href="../apps/hubzoo.html"><strong>Hubzoo</strong></a>, project leads build, price, and deliver high-converting quotes directly from their smartphone before even leaving the client's driveway:</p>
        <ul>
          <li><strong>Pre-configured item matrices:</strong> Labor, materials, and margin calculations are locked into intelligent mobile templates.</li>
          <li><strong>Multi-channel auto follow-up:</strong> Automated SMS and email nudges re-engage prospective clients after 48 hours without annoying pressure.</li>
          <li><strong>Native ERP & accounting bridge:</strong> One-click synchronization into leading European accounting backends including Fiken and Tripletex.</li>
        </ul>

        <h2>Bottom-Line ROI</h2>
        <p>Field teams adopting immediate on-site quoting achieve a <strong>68% increase in proposal close rates</strong> and recover up to 10 hours of billable or personal time every single week.</p>
      `,
      faqs_no: [
        { q: 'Hvor raskt kan en ansatt lære å bruke Hubzoo?', a: 'Hubzoo er designet for mobilskjerm med store berøringsflater og null opplæringstid. De fleste oppretter sitt første tilbud på under 2 minutter.' },
        { q: 'Fungerer Hubzoo med eksisterende regnskapsprogrammer?', a: 'Ja, Hubzoo har innebygget direkte integrasjon med ledende systemer som Fiken og Tripletex, samt eksportmuligheter via API.' },
        { q: 'Hva skjer dersom kunden ikke svarer på tilbudet?', a: 'Hubzoos automatiserte oppfølgingsmotor sender automatisk tilpassede påminnelser via SMS og e-post til avtalte intervaller.' }
      ],
      faqs_en: [
        { q: 'How long does it take for field crews to adopt Hubzoo?', a: 'Hubzoo is built mobile-first with zero learning curve. Crews generate their first compliant proposal in less than 2 minutes.' },
        { q: 'Does Hubzoo integrate with our accounting software?', a: 'Yes, Hubzoo natively connects with leading European accounting platforms including Fiken and Tripletex with full API support.' },
        { q: 'How does automated follow-up work?', a: 'The engine sends courteous SMS and email follow-ups at 48-hour intervals until the client approves or requests scope changes.' }
      ]
    },

    upworkz: {
      category_no: 'Frilans & B2B Salgsstrategi',
      category_en: 'Freelance & B2B Proposal Strategy',
      defaultTitle_no: '220-tegns regelen: Slik dobler du svarprosenten på Upwork med AI-optimaliserte anbud',
      defaultTitle_en: 'The 220-Character Rule: How AI Bid Architecture Triples Proposal Interview Rates',
      slug_no: '220-tegns-regelen-upwork-anbud-ai-arkitektur',
      slug_en: '220-character-rule-upwork-proposals-ai-architecture',
      metaDesc_no: 'Lær hvordan de første 220 tegnene i Upwork-søknaden avgjør om kunden klikker eller forkaster. Slik bruker Upworkz AI for å nå 35% svarprosent.',
      metaDesc_en: 'Learn why the first 220 characters of an Upwork proposal determine whether a client reads or archives. See how Upworkz drives a 35%+ response rate.',
      contentHtml_no: `
        <p class="lead">Når en oppdragsgiver åpner Upwork på mobil, ser de kun de første 220 tegnene av søknaden din i innboksen før de må bestemme seg for å åpne eller arkivere. Generiske hilsener er dødsstøtet for anbudet ditt.</p>

        <h2>Hvorfor "Dear Hiring Manager" garanterer avslag</h2>
        <p>Gjennomsnittlige anbud på Upwork kaster bort de mest verdifulle tegnene på intetsigende innledninger som <em>"Hei, jeg leste oppdraget ditt med stor interesse..."</em>. Innen kunden har skumlest forbi høflighetsfrasene på sin iPhone, har de allerede trykket 'Archive' og gått videre til neste søker.</p>

        <blockquote>"De første 220 tegnene er ikke en innledning – de er en spissformulert hypotese om kundens kjerneavvik og løsning."</blockquote>

        <h2>Hvordan Upworkz dekonstruerer oppdragsbeskrivelser</h2>
        <p>Med <a href="../apps/upworkz.html"><strong>Upworkz</strong></a> analyseres oppdragsannonsen på 45 sekunder for å avdekke:</p>
        <ul>
          <li><strong>Skjulte kontrollspørsmål:</strong> Mange kunder gjemmer kodeord i midten av teksten for å filtrere bort roboter.</li>
          <li><strong>Arkitektur-gotchas:</strong> Identifiserer underliggende tekniske flaskehalser som kunden ikke selv har beskrevet nøyaktig.</li>
          <li><strong>En skreddersydd åpningskrok:</strong> Genererer en 220-tegns åpning som beviser umiddelbar forståelse for det eksakte problemet.</li>
        </ul>

        <h2>Resultat: Fra 8 % til 35 % intervjurater</h2>
        <p>Ved å fokusere på teknisk presisjon og eliminere fyllord, rapporterer Upworkz-brukere en dramatisk økning i intervjuer og oppdragsinntekter.</p>
      `,
      contentHtml_en: `
        <p class="lead">When a hiring client reviews Upwork proposals on iOS or Android, the interface truncates each pitch to exactly 220 characters in the preview list. Generic openers are fatal to your win rate.</p>

        <h2>The Death of "Dear Hiring Manager"</h2>
        <p>Over 90% of submitted proposals squander the crucial preview window on filler: <em>"Hello! I saw your posting and have 10 years of experience..."</em>. The client never opens the full proposal because the preview failed to communicate domain mastery.</p>

        <blockquote>"Your first 220 characters are not an introduction; they are an immediate technical thesis demonstrating you already understand the client's bottleneck."</blockquote>

        <h2>Automated Job Deconstruction with Upworkz</h2>
        <p>The <a href="../apps/upworkz.html"><strong>Upworkz</strong></a> bid architect deconstructs postings in under 45 seconds:</p>
        <ul>
          <li><strong>Audit screening traps:</strong> Instantly catches hidden verification words and client test questions.</li>
          <li><strong>Scope flaw detection:</strong> Spots architectural contradictions or missing dependencies in the client's brief.</li>
          <li><strong>High-converting mobile hook:</strong> Crafts a laser-focused opening paragraph engineered specifically to bypass mobile inbox truncation.</li>
        </ul>

        <h2>Proven Performance Metrics</h2>
        <p>Engineers and agencies using Upworkz regularly report proposal interview rates jumping from the industry baseline of 8% to sustained rates above 35%.</p>
      `,
      faqs_no: [
        { q: 'Hvorfor er akkurat 220 tegn så viktig?', a: 'Upworks mobilapp kutter forhåndsvisningen i klientens innboks ved ca. 220 tegn. Alt etter dette krever et aktivt klikk for å leses.' },
        { q: 'Er anbudene ferdigskrevne eller bare kladder?', a: 'Upworkz leverer et komplett, teknisk presist forslag med milepæler, estimert tidsbruk og relevante spørsmål klar til sending på under 45 sekunder.' },
        { q: 'Fungerer Upworkz også for andre frilansplattformer?', a: 'Ja, de samme prinsippene for dekonstruksjon og åpningskroker gjelder for direkte B2B e-postforslag og andre markedsplasser.' }
      ],
      faqs_en: [
        { q: 'Why is the 220-character threshold so critical?', a: 'Upwork mobile clients preview roughly 220 characters in the inbox queue. If value is not established immediately, the pitch is archived without opening.' },
        { q: 'Does Upworkz output full proposals or bullet points?', a: 'Upworkz generates complete, technically sound proposals with scope milestones and questions in 45 seconds.' },
        { q: 'Can Upworkz be used for direct B2B cold outreach?', a: 'Yes, the underlying deconstruction methodology applies equally to cold email pitches and RFP responses.' }
      ]
    },

    subsentry: {
      category_no: 'SaaS & Kostnadsoptimalisering',
      category_en: 'SaaS & Cost Optimization',
      defaultTitle_no: 'SaaS Dark Patterns: Slik avdekker du skjulte fornyelser og kutter bedriftens programvarekostnader',
      defaultTitle_en: 'SaaS Dark Patterns: How to Audit Shadow Subscriptions and Eliminate Recurring Software Waste',
      slug_no: 'saas-dark-patterns-avdekk-skjulte-abonnementer',
      slug_en: 'saas-dark-patterns-audit-shadow-subscriptions',
      metaDesc_no: 'Lær hvordan moderne SaaS-selskaper låser bedriften din i dyre årsavtaler med mørke mønstre, og hvordan SubSentry sparer deg for tusenvis av kroner.',
      metaDesc_en: 'Discover how SaaS companies use dark UX patterns to trap businesses in auto-renewals, and how SubSentry audits licenses to reclaim thousands annually.',
      contentHtml_no: `
        <p class="lead">Næringslivet mister årlig titalls milliarder kroner på "skygge-IT" og abonnementsfeller som fornyes i det stille. Mørke designmønstre gjør det nesten umulig å si opp uten assistanse.</p>

        <h2>Hva er "Dark Patterns" i moderne programvare?</h2>
        <p>Begrepet <em>Dark Patterns</em> betegner brukergrensesnitt som bevisst er konstruert for å manipulere brukere til handlinger de ellers ikke ville gjort. Eksempler inkluderer skjulte oppsigelsesknapper gjemt fem nivåer nede i innstillinger, krav om å ringe et amerikansk telefonnummer for å avbryte en prøveperiode, og forhåndsavkryssede bokser for årlig fakturering.</p>

        <blockquote>"Den gjennomsnittlige bedriften med 10 til 50 ansatte betaler for mellom 4 og 12 programvarelisenser som ingen i selskapet har brukt de siste 90 dagene."</blockquote>

        <h2>SubSentry: Ditt skjold mot uønskede trekk</h2>
        <p>Gjennom <a href="../apps/subsentry.html"><strong>SubSentry</strong></a> får bedriften et intelligent varslingssystem og en dedikert oppsigelsesradar:</p>
        <ul>
          <li><strong>Varsel før automatisk binding:</strong> Få påminnelse 7 dager før gratis prøveperioder konverterer til bindende årsavtaler.</li>
          <li><strong>Trinnvise oppsigelsesoppskrifter:</strong> Verifiserte guider som viser nøyaktig hvilke knapper du må trykke for å unnslippe oppsigelseslabyrinter.</li>
          <li><strong>Kostnadseffektive alternativer:</strong> Finn rimeligere eller åpen kildekode-alternativer til overprisede enterprise-verktøy.</li>
        </ul>

        <h2>Konklusjon: Ta kontroll over kredittkortet</h2>
        <p>Ved å gjennomføre en strukturert abonnementsrevisjon kan de fleste bedrifter umiddelbart redusere sine månedlige IT-utgifter med 20 % til 35 %.</p>
      `,
      contentHtml_en: `
        <p class="lead">Companies waste tens of thousands of dollars each year on shadow IT and unattended auto-renewals. Deceptive checkout flows and obfuscated cancellation loops are deliberately engineered to bleed budgets.</p>

        <h2>The Mechanics of SaaS Dark Patterns</h2>
        <p>A dark pattern is a user experience engineered to manipulate users into taking actions contrary to their intent. In enterprise software, this includes burying the 'Cancel Subscription' toggle under four submenus, requiring telephone calls to account managers during US business hours, and converting monthly trials into non-refundable annual contracts.</p>

        <blockquote>"The average SMB with 10 to 50 employees pays for between 4 and 12 SaaS seats that have not logged a single session in over 90 days."</blockquote>

        <h2>SubSentry: The Subscription Shield</h2>
        <p>Deploying <a href="../apps/subsentry.html"><strong>SubSentry</strong></a> establishes rigorous governance across corporate software spend:</p>
        <ul>
          <li><strong>Pre-conversion tripwires:</strong> Real-time alerts 7 days before trials roll over into annual obligations.</li>
          <li><strong>Direct cancellation playbooks:</strong> Verified step-by-step click maps that bypass retention mazes.</li>
          <li><strong>Rationalized alternatives:</strong> Automated discovery of cost-effective alternatives and self-hosted open-source counterparts.</li>
        </ul>

        <h2>Take Back Control</h2>
        <p>A systematic audit of software recurring billing routinely claws back 20% to 35% of total annual software expenditure.</p>
      `,
      faqs_no: [
        { q: 'Krever SubSentry tilgang til bedriftens bankkonto?', a: 'Nei, SubSentry analyserer kvitteringer, fakturaer og nettlesermønstre uten behov for direkte API-kobling til bedriftens bankkonto.' },
        { q: 'Hvor mye sparer en typisk bedrift?', a: 'Bedrifter sparer i gjennomsnitt mellom 20 000 og 150 000 kroner i året ved å eliminere ubrukte seter og uoppdagede årsfornyelser.' },
        { q: 'Kan SubSentry hjelpe med å forhandle lavere priser?', a: 'Ja, SubSentry tilbyr benchmark-data som viser hva andre bedrifter faktisk betaler for tilsvarende programvare.' }
      ],
      faqs_en: [
        { q: 'Does SubSentry require corporate bank login credentials?', a: 'No, SubSentry operates via browser receipt recognition and invoice ingestion without requiring direct banking API credentials.' },
        { q: 'What is the average savings realized?', a: 'Companies typically reclaim between $2,400 and $18,000 annually by eliminating inactive seats and zombie software.' },
        { q: 'Does SubSentry assist with renewal negotiations?', a: 'Yes, SubSentry compiles real-world benchmark pricing data to strengthen your leverage during contract renewals.' }
      ]
    },

    maxmotion: {
      category_no: 'AI-Video & Multimodal Medieproduksjon',
      category_en: 'AI Video & Multimodal Media Production',
      defaultTitle_no: 'Wan 2.1 vs Kling vs Minimax: Den ultimate sammenligningen av generative AI-videomodeller',
      defaultTitle_en: 'Wan 2.1 vs Kling vs Minimax: The Definitive Multi-Model AI Video Architecture Guide',
      slug_no: 'wan-2-1-vs-kling-vs-minimax-ai-video-sammenligning',
      slug_en: 'wan-2-1-vs-kling-vs-minimax-ai-video-comparison',
      metaDesc_no: 'Vi tester Wan 2.1, Kling 1.5 og Minimax på fysikk, prompt-troskap og konsistens. Se hvordan MaxMotion AI samler modellene på ett lerret med permanent skylagring.',
      metaDesc_en: 'Comprehensive benchmark of Wan 2.1, Kling 1.5, and Minimax across physics, prompt fidelity, and temporal consistency with MaxMotion AI studio.',
      contentHtml_no: `
        <p class="lead">Landskapet for generativ AI-video har eksplodert i 2026. Å låse seg til én enkelt leverandør fører til kompromisser på bildekvalitet og unødvendig høye abonnementskostnader.</p>

        <h2>Felt-test: Fysikk, lyssetting og tidsmessig konsistens</h2>
        <p>Vi har kjørt standardiserte prompts gjennom tre av markedets mest avanserte modeller:</p>
        <ul>
          <li><strong>Wan 2.1:</strong> Eksepsjonell på teksturbeskrivelser og komplekse kamerabevegelser. Svært sterk på fotorealistiske menneskeansikter og lysrefleksjoner.</li>
          <li><strong>Kling 1.5:</strong> Markedsledende på fysiske interaksjoner – håndbevegelser, kollisjoner og væskedynamikk oppfører seg bemerkelsesverdig naturlig.</li>
          <li><strong>Minimax Hailuo AI:</strong> Lynrask genereringstid og suveren på filmatiske scener med dramatiske fargegraderinger.</li>
        </ul>

        <blockquote>"Ingen enkelt AI-videomodell vinner i alle kategorier. De beste produksjonene kombinerer styrkene til flere modeller i samme tidslinje."</blockquote>

        <h2>MaxMotion AI: Én felles tidslinje og permanent lagring</h2>
        <p>I stedet for å betale for tre separate abonnementer med midlertidige 24-timers nedlastingslenker, lar <a href="../apps/maxmotion.html"><strong>MaxMotion AI</strong></a> deg orkestrere alle tre modellene direkte fra ett samlet lerret:</p>
        <ul>
          <li><strong>Permanent Google Cloud Storage:</strong> Genererte klipp slettes aldri etter et døgn – de lagres sikkert i din egen prosjektmappe.</li>
          <li><strong>Sømløs klipping:</strong> Kombiner scener fra Wan 2.1 og Kling på samme spor med automatisk fargejustering og overganger.</li>
          <li><strong>Kostnadseffektiv kredittbruk:</strong> Betal kun for sekundene du faktisk genererer, uten dyre månedlige låsninger.</li>
        </ul>

        <h2>Konklusjon for profesjonelle innholdsskapere</h2>
        <p>Å orkestrere multimodal video gjennom et enhetlig studio gir høyere produksjonsverdi og sparer produksjonsteam for timevis med manuell filhåndtering.</p>
      `,
      contentHtml_en: `
        <p class="lead">The generative AI video landscape in 2026 has fractured across multiple frontier models. Relying on a single vendor limits creative fidelity and inflates subscription overhead.</p>

        <h2>The Head-to-Head Benchmark: Physics, Fidelity & Motion</h2>
        <p>We executed standardized stress-test prompts across the premier video engines:</p>
        <ul>
          <li><strong>Wan 2.1:</strong> Unmatched rendering of subtle lighting nuances, skin shaders, and cinematic depth-of-field.</li>
          <li><strong>Kling 1.5:</strong> The benchmark for believable physics—fluid dynamics, object permanence, and complex anatomical motion behave naturally.</li>
          <li><strong>Minimax Hailuo AI:</strong> Ultra-rapid throughput with dramatic color grading ideal for commercial b-roll.</li>
        </ul>

        <blockquote>"No single video model dominates every scenario. Commercial production pipelines must orchestrate specialized models dynamically."</blockquote>

        <h2>MaxMotion AI: The Unified Multi-Model Timeline</h2>
        <p>Rather than juggling three disparate subscriptions with expiring 24-hour CDN links, <a href="../apps/maxmotion.html"><strong>MaxMotion AI</strong></a> unifies Wan 2.1, Kling, and Minimax on a singular timeline:</p>
        <ul>
          <li><strong>Permanent Cloud Storage:</strong> All render assets are persisted permanently to Google Cloud Storage.</li>
          <li><strong>Unified Timeline Canvas:</strong> Splice and sequence generations across models with automated color normalization.</li>
          <li><strong>Usage-based pricing:</strong> Zero subscription lock-in—pay solely for the compute seconds consumed.</li>
        </ul>

        <h2>The Future of Production Workflows</h2>
        <p>Aggregating multimodal models into a cohesive studio timeline accelerates delivery times by up to 5x while slashing cloud asset management friction.</p>
      `,
      faqs_no: [
        { q: 'Hvor lenge lagres videoklippene i MaxMotion AI?', a: 'Alle genererte videofiler lagres permanent i Google Cloud Storage og slettes aldri, i motsetning til standard 24-timers lenker.' },
        { q: 'Støtter MaxMotion AI oppskalering til 4K?', a: 'Ja, plattformen har innebygget AI-oppskalering som øker oppløsningen til 4K uten tap av detaljer eller artefakter.' },
        { q: 'Kan jeg eksportere tidslinjen til Premiere Pro eller DaVinci?', a: 'Ja, du kan eksportere prosjektet som standard XML/EDL eller ferdig sammensatt MP4-fil.' }
      ],
      faqs_en: [
        { q: 'How long are generated videos stored in MaxMotion?', a: 'All media is permanently stored in Google Cloud Storage with no 24-hour expiration limits.' },
        { q: 'Does MaxMotion support 4K upscaling?', a: 'Yes, integrated neural upscalers enhance render resolution to pristine 4K with edge preservation.' },
        { q: 'Can project timelines be exported to Premiere or DaVinci?', a: 'Yes, export directly to industry-standard XML/EDL timeline formats or consolidated high-bitrate ProRes/MP4.' }
      ]
    },

    mediabunny: {
      category_no: 'WebAssembly & Nettleser-Teknologi',
      category_en: 'WebAssembly & Browser Technology',
      defaultTitle_no: 'WebAssembly på klientsiden: Hvorfor fremtidens videoredigering og EBU R128-lyd skjer i nettleseren',
      defaultTitle_en: 'Client-Side WebAssembly: High-Throughput Media Processing and EBU R128 Normalization in the Browser',
      slug_no: 'webassembly-klientside-videoredigering-ebu-r128',
      slug_en: 'client-side-webassembly-media-processing-ebu-r128',
      metaDesc_no: 'Hvordan WebAssembly flytter videokomprimering, AI-bakgrunnsfjerning og EBU R128 lydnormalisering til brukerens nettleser med null serverkostnader.',
      metaDesc_en: 'How WebAssembly enables zero-upload video compression, AI background removal, and EBU R128 broadcast audio normalization entirely in the browser.',
      contentHtml_no: `
        <p class="lead">I over et tiår har tung videobehandling krevd opplasting til kostbare skyservere. Med WebAssembly (WASM) kan avansert medieprosessering nå kjøres 100 % lokalt i nettleseren.</p>

        <h2>Slutt på gigabyte-opplastinger og sky-GPU-regninger</h2>
        <p>Å laste opp 4K-opptak til skyservere for enkel redigering eller bakgrunnsfjerning skaper massive flaskehalser: treg opplastingsbåndbredde, personvernrisikoer (GDPR) og astronomiske skyserver-regninger for tjenesteleverandøren.</p>

        <blockquote>"WebAssembly gjør nettleseren til en fullverdig virtuell maskin. Ved å utnytte brukerens egen CPU og GPU oppnås null serverkostnad og 100 % lokalt personvern."</blockquote>

        <h2>MediaBunny: Kraftfull medieprosessering på klientsiden</h2>
        <p>Med <a href="../apps/mediabunny.html"><strong>MediaBunny</strong></a> utføres tunge oppgaver direkte på brukerens maskinvare:</p>
        <ul>
          <li><strong>EBU R128 Lydnormalisering:</strong> Broadcast-standard volumjustering (-23 LUFS / -14 LUFS for Spotify og YouTube) uten at lyden forlater enheten.</li>
          <li><strong>Nevral AI-bakgrunnsfjerning:</strong> segmenteringsmodeller kompilert til WebAssembly fjerner videobakgrunner i sanntid.</li>
          <li><strong>75% CRF-komprimering:</strong> Reduser filstørrelser dramatisk uten synlig kvalitetstap ved hjelp av FFmpeg WASM.</li>
        </ul>

        <h2>Fremtiden for personvernsikker medieprosessering</h2>
        <p>Bedrifter som behandler sensitive interne videoer eller lydopptak slipper å bekymre seg for datalekkasjer – ingenting sendes over internett.</p>
      `,
      contentHtml_en: `
        <p class="lead">Heavy multimedia manipulation has historically mandated uploading raw gigabytes to expensive cloud clusters. WebAssembly (WASM) flips this paradigm by running bare-metal media pipelines client-side.</p>

        <h2>Eliminating Ingestion Bottlenecks and Cloud Compute Spikes</h2>
        <p>Pushing raw footage to central transcoders exposes businesses to network latency, regulatory compliance issues (GDPR/HIPAA), and soaring GPU cloud bills. Client-side WASM allows browser tabs to execute compiled C++/Rust engines at native speeds.</p>

        <blockquote>"WebAssembly turns the web browser into a sandboxed bare-metal environment. Utilizing client-side silicon slashes backend infrastructure overhead to zero."</blockquote>

        <h2>MediaBunny: Zero-Upload Media Infrastructure</h2>
        <p>Built with high-throughput WASM binaries, <a href="../apps/mediabunny.html"><strong>MediaBunny</strong></a> delivers broadcast-tier processing on-device:</p>
        <ul>
          <li><strong>EBU R128 Audio Normalization:</strong> Precision loudness conformance (-23 LUFS for broadcast, -14 LUFS for streaming) calculated locally in real time.</li>
          <li><strong>Neural Edge Segmentation:</strong> Lightweight on-device models strip video backgrounds without telemetry or data leakage.</li>
          <li><strong>75% CRF Lossless Compression:</strong> Multi-threaded FFmpeg WASM compresses raw media directly in local storage.</li>
        </ul>

        <h2>Enterprise-Grade Privacy</h2>
        <p>Zero data leaves the browser window, ensuring airtight compliance for sensitive corporate communications, internal all-hands recordings, and proprietary assets.</p>
      `,
      faqs_no: [
        { q: 'Hvorfor er klientside WebAssembly sikrere enn skyservere?', a: 'Fordi mediefilen aldri lastes opp til internett. All prosessering skjer internt i nettleserens minne på din egen PC.' },
        { q: 'Hva er EBU R128-standard for lyd?', a: 'EBU R128 er den internasjonale kringkastingsstandarden som sikrer jevnt volum uten ubehagelige hopp eller forvrengning.' },
        { q: 'Fungerer dette på mobile enheter?', a: 'Ja, moderne smarttelefoner med oppdaterte nettlesere har kraftige brikkesett som kjører WASM-prosessering lynraskt.' }
      ],
      faqs_en: [
        { q: 'Why is client-side WebAssembly more secure than cloud transcoding?', a: 'Raw files are never transmitted across the network; all byte-level processing occurs strictly within sandboxed browser memory.' },
        { q: 'What is the EBU R128 loudness standard?', a: 'EBU R128 is the global broadcast standard regulating perceived loudness to prevent dynamic clipping and audio distortion.' },
        { q: 'Does MediaBunny execute on mobile browsers?', a: 'Yes, modern mobile chipsets execute multi-threaded WASM instructions natively with zero plugin installation required.' }
      ]
    },

    appsave: {
      category_no: 'SaaS & Innkjøpsoptimalisering',
      category_en: 'SaaS & Procurement Optimization',
      defaultTitle_no: 'SaaS-innkjøp på autopilot: Slik sparer du 15–40% på programvare med smarte rabattkoder',
      defaultTitle_en: 'Automated SaaS Procurement: How to Slash Software Overhead by 15-40% at Checkout',
      slug_no: 'saas-innkjop-autopilot-rabattkoder-appsave',
      slug_en: 'automated-saas-procurement-appsave',
      metaDesc_no: 'Hvordan AppSave Chrome-utvidelsen tester verifiserte rabattkoder i kassen for SaaS og skytjenester, og sparer bedrifter for tusenvis av kroner.',
      metaDesc_en: 'How the AppSave Chrome extension automatically tests verified promo codes during SaaS checkouts, slashing recurring overhead by 15-40%.',
      contentHtml_no: `
        <p class="lead">De fleste selskaper betaler full listepris for sin programvarestakk. Sannheten er at nesten alle SaaS-leverandører tilbyr 15 % til 40 % rabatt ved kassen dersom du kjenner de rette kodene.</p>

        <h2>Hemmeligheten bak skjulte B2B-promokoder</h2>
        <p>SaaS-selskaper oppretter kontinuerlig lanseringskoder, partnerskapsrabatter og sesongtilbud som sjelden vises på den offentlige prissiden. Å lete manuelt gjennom utdaterte kupongnettsider er tidkrevende og fører ofte til ugyldige koder.</p>

        <blockquote>"Å betale full pris for skyhosting og SaaS-abonnementer i 2026 tilsvarer å kaste penger ut av vinduet. De fleste plattformer har aktive marginer for direkte rabattering."</blockquote>

        <h2>AppSave: Den smarte Chrome-utvidelsen for bedrifter</h2>
        <p>Med <a href="../apps/appsave.html"><strong>AppSave</strong></a> (bygget på Manifest V3) automatiseres hele prosessen:</p>
        <ul>
          <li><strong>Automatisk gjenkjenning i kassen:</strong> Utvidelsen oppdager når du er på en checkout-side for kjente verktøy som AWS, HubSpot, Slack og AI-tjenester.</li>
          <li><strong>Verifisering i sanntid:</strong> Tester en kontinuerlig oppdatert database med aktive koder på få sekunder.</li>
          <li><strong>Maksimal besparelse:</strong> Velger automatisk koden som gir det største fratrekket i handlekurven før betaling bekreftes.</li>
        </ul>

        <h2>Oppsummering</h2>
        <p>Ved å installere AppSave kan både enkeltutviklere og innkjøpsavdelinger redusere den årlige programvareregningen uten forhandlingsmøter.</p>
      `,
      contentHtml_en: `
        <p class="lead">Most organizations pay sticker list price for their software stack. In reality, virtually every major SaaS vendor operates checkout discount tiers ranging from 15% to 40%.</p>

        <h2>The Hidden Economy of B2B Promo Codes</h2>
        <p>SaaS vendors regularly deploy conference promotions, accelerator partnership discounts, and retention codes that never appear on public pricing grids. Manually scouring spam-laden coupon directories wastes productive engineering hours.</p>

        <blockquote>"Paying list price for developer tooling and cloud subscriptions in 2026 represents unnecessary margin leakage. Vendors expect informed buyers to claim checkout concessions."</blockquote>

        <h2>AppSave: Zero-Friction Procurement Savings</h2>
        <p>Operating as a lightweight Manifest V3 browser extension, <a href="../apps/appsave.html"><strong>AppSave</strong></a> automates enterprise discounts:</p>
        <ul>
          <li><strong>Instant Checkout Detection:</strong> Recognizes checkout workflows across hundreds of developer platforms and cloud providers.</li>
          <li><strong>Algorithmic Code Verification:</strong> Simultaneously cycles verified promotional vouchers within seconds.</li>
          <li><strong>Optimized Margin Recovery:</strong> Applies the highest-value discount structure before the final credit card authorization.</li>
        </ul>

        <h2>Immediate Financial Impact</h2>
        <p>Adopting automated coupon testing at checkout systematically cuts annual software and hosting overhead by thousands of dollars with zero operational disruption.</p>
      `,
      faqs_no: [
        { q: 'Er AppSave trygg å bruke i bedriftsnettlesere?', a: 'Ja, AppSave er bygget på Manifest V3 med strengt sandkassereglement og samler ingen personlige betalingsopplysninger.' },
        { q: 'Hvilke verktøy dekkes av AppSave?', a: 'Databasen dekker hundrevis av verktøy innen hosting, skytjenester, AI API-er, prosjektstyring og CRM.' },
        { q: 'Koster det noe å installere utvidelsen?', a: 'Grunnversjonen er helt gratis for bedrifter og utviklere.' }
      ],
      faqs_en: [
        { q: 'Is AppSave secure for enterprise browser environments?', a: 'Yes, AppSave is architected strictly under Chrome Manifest V3 specifications and stores zero payment telemetry.' },
        { q: 'Which categories of software are supported?', a: 'The database monitors hundreds of platforms spanning cloud infrastructure, AI APIs, analytics, and CRM ecosystems.' },
        { q: 'What is the pricing model for the extension?', a: 'The core extension is completely free for individual engineers and procurement teams.' }
      ]
    },

    manus: {
      category_no: 'Autonome Agenter & Fremtidens AI',
      category_en: 'Autonomous Agents & Frontier AI',
      defaultTitle_no: 'Fra passive chatbots til autonome action-agenter: Hvorfor handling trumfer samtale i 2026',
      defaultTitle_en: 'Beyond Chatbots: How Autonomous Action Agents Execute Complex Multi-Step Workflows Unattended',
      slug_no: 'fra-chatbots-til-autonome-action-agenter-2026',
      slug_en: 'from-chatbots-to-autonomous-action-agents-2026',
      metaDesc_no: 'Chatbots gir bare svar – autonome action-agenter utfører faktiske handlinger. Se hvordan Manus AI Studio navigerer nettet, koder og løser forretningsprosesser.',
      metaDesc_en: 'Chatbots offer advice; autonomous agents execute real work. Learn how Manus AI Studio browses the web, writes code, and solves end-to-end business workflows.',
      contentHtml_no: `
        <p class="lead">De siste tre årene har markedet vært oversvømmet av samtale-chatbots. Men i 2026 har bedrifter sluttet å nøye seg med gode råd – de trenger systemer som faktisk utfører arbeidet autonomt.</p>

        <h2>Hvorfor tradisjonelle chatbots svikter i den virkelige verden</h2>
        <p>En standard chatbot kan fortelle deg hvordan du setter opp en database, skrive et utkast til en rapport eller forklare en feilmelding. Men så snart samtalen er over, må et menneske manuelt åpne nettleseren, logge inn på systemene, kopiere koden og rette eventuelle feil.</p>

        <blockquote>"Skillet mellom 2023 og 2026 er skillet mellom samtale og handling. En autonom agent stopper ikke ved forslag – den åpner nettleseren, navigerer grensesnitt og verifiserer resultatet."</blockquote>

        <h2>Manus AI Studio: Arkitekturen bak autonome agenter</h2>
        <p>Gjennom <a href="../apps/manus.html"><strong>Manus AI Studio</strong></a> beveger vi oss inn i handlingsorientert automatisering:</p>
        <ul>
          <li><strong>Verktøybruk og nettleserstyring:</strong> Agenten kan åpne en ekte nettleser (via headless Playwright), navigere menyer, fylle ut skjemaer og hente data.</li>
          <li><strong>Sandkasse-kodekjøring:</strong> Koden som skrives blir umiddelbart testet i et isolert miljø; hvis en feil oppstår, feilsøker og fikser agenten det selv.</li>
          <li><strong>Strukturerte oppgaver på autopilot:</strong> Fra markedsundersøkelser og datainnsamling til oppsett av komplette nettsider uten menneskelig innblanding.</li>
        </ul>

        <h2>Veien videre for bedrifter</h2>
        <p>Bedrifter som integrerer autonome action-agenter i sine kjerneprosesser vil oppleve en multiplikatoreffekt på produktiviteten til sine ansatte.</p>
      `,
      contentHtml_en: `
        <p class="lead">For three years, enterprises embraced conversational chatbots. But in 2026, enterprise value has shifted decisively from conversational advice to autonomous operational execution.</p>

        <h2>The Fundamental Limitation of Chat Interfaces</h2>
        <p>Conventional LLM chats generate well-reasoned guidance, but they are severed from execution. When a chatbot provides a script, a human operator must still copy the snippet, run tests, diagnose missing dependencies, and manually commit the changes.</p>

        <blockquote>"The decisive architectural shift of 2026 is the migration from advice to action. Autonomous agents do not provide recipes; they step into the kitchen and prepare the meal."</blockquote>

        <h2>Manus AI Studio: The Execution Engine</h2>
        <p>Operating beyond text windows, <a href="../apps/manus.html"><strong>Manus AI Studio</strong></a> introduces multi-turn autonomous tool orchestration:</p>
        <ul>
          <li><strong>Full Browser Automation:</strong> The agent commands sandboxed browser sessions (via Playwright) to navigate dynamic SPAs, authenticate, and manipulate DOM trees.</li>
          <li><strong>Self-Healing Code Execution:</strong> Generated code is executed in isolated runtime sandboxes; runtime exceptions trigger autonomous reflection and remediation loops.</li>
          <li><strong>Multi-Step Task Completion:</strong> From end-to-end competitor intelligence gathering to scaffolding complete application microservices unattended.</li>
        </ul>

        <h2>The Strategic Horizon</h2>
        <p>Organizations standardizing on autonomous action agents achieve operational velocity impossible with human-in-the-loop manual task shuffling.</p>
      `,
      faqs_no: [
        { q: 'Hva skiller Manus fra en standard ChatGPT-samtale?', a: 'Manus har tilgang til verktøy: agenten kan styre en nettleser, kjøre programkode og fullføre oppgaver uten menneskelig overvåking.' },
        { q: 'Er agentens handlinger trygge og reviderbare?', a: 'Ja, alle handlinger logges med skjermbilder og fullstendig revisjonsspor før kritiske endringer iverksettes.' },
        { q: 'Trenger jeg teknisk kompetanse for å styre Manus?', a: 'Nei, du beskriver målet i naturlig språk, og agenten bryter automatisk ned oppgaven i nødvendige delsteg.' }
      ],
      faqs_en: [
        { q: 'What distinguishes Manus from standard LLM chatbots?', a: 'Manus possesses tool authority—it controls sandboxed browsers, executes terminal commands, and resolves errors autonomously.' },
        { q: 'How are agent actions audited for security?', a: 'Every execution step is captured with full DOM logs, network traces, and visual snapshots for comprehensive audit compliance.' },
        { q: 'Is programming proficiency required to direct Manus?', a: 'No, objectives are articulated in plain English; the agent autonomously derives the execution plan.' }
      ]
    },

    custom_dev: {
      category_no: 'Skyarkitektur & AI-Ingeniørkunst',
      category_en: 'Cloud Architecture & AI Engineering',
      defaultTitle_no: 'Slik bygger du en produksjonsklar AI-mikrotjeneste på Google Cloud Run på 14 dager',
      defaultTitle_en: 'Engineering Production AI Microservices on Google Cloud Run: From Architecture to MVP in 14 Days',
      slug_no: 'produksjonsklar-ai-mikrotjeneste-cloud-run-14-dager',
      slug_en: 'production-ai-microservice-cloud-run-14-days',
      metaDesc_no: 'Lær hvordan AIAPPSY bygger skalerbare, feiltolerante AI-systemer med Gemini, hybrid RAG og Google Cloud Run med levering på under to uker.',
      metaDesc_en: 'Learn how AIAPPSY engineers enterprise AI microservices using Gemini, hybrid RAG, and serverless Google Cloud Run shipped in under 14 days.',
      contentHtml_no: `
        <p class="lead">Mange bedrifter sitter fast i månedslange AI-piloter som aldri når produksjon. Med riktig arkitektur på Google Cloud Run kan en robust, skalerbar AI-tjeneste leveres på under to uker.</p>

        <h2>Fallgruvene som stopper tradisjonelle AI-prosjekter</h2>
        <p>De vanligste årsakene til at AI-prosjekter mislykkes er overdreven kompleksitet: massive Kubernetes-klynger for enkle oppgaver, upålitelige RAG-oppsett som hallusinerer, og mangel på integrasjon mot bedriftens eksisterende ERP- og CRM-systemer.</p>

        <blockquote>"Målet er ikke å trene enorme modeller fra bunnen av, men å koble ledende frontier-modeller direkte til bedriftens reelle forretningsdata via sikre API-er."</blockquote>

        <h2>Vår 14-dagers ingeniørmetodikk</h2>
        <p>Gjennom <a href="../custom-development.html"><strong>Skreddersydd AI-utvikling</strong></a> hos AIAPPSY leverer vi produksjonsklare løsninger i rekordfart:</p>
        <ul>
          <li><strong>Dag 1–3: Datamodellering og Hybrid RAG:</strong> Oppsett av vektorsøk kombinert med nøkkelordsøk for 99 % presisjon i informasjonsgjenfinning.</li>
          <li><strong>Dag 4–8: Autonome agenter og verktøykoblinger:</strong> Implementering av funksjonskall mot regnskapssystemer (Fiken/Tripletex), e-post og interne databaser.</li>
          <li><strong>Dag 9–14: Serverless utrulling på Google Cloud Run:</strong> Containerisering med Docker, automatisk skalering til null og sub-300ms responstid.</li>
        </ul>

        <h2>Ferdig produkt til avtalt fastpris</h2>
        <p>Vi overlater full kildekode, CI/CD-pipelines og dokumentasjon til kunden, uten skjulte abonnementslåsninger.</p>
      `,
      contentHtml_en: `
        <p class="lead">Most enterprise AI initiatives stall in perpetual proof-of-concept limbo. Utilizing modern serverless containers on Google Cloud Run enables robust, hardened AI systems to ship in two weeks.</p>

        <h2>The Root Causes of AI Project Failure</h2>
        <p>Enterprises frequently over-engineer: deploying bloated Kubernetes infrastructures, brittle vector pipelines prone to severe hallucinations, and failing to connect model outputs back into core transaction systems.</p>

        <blockquote>"The objective is not pre-training bespoke models from scratch; it is binding state-of-the-art frontier models securely to enterprise systems of record."</blockquote>

        <h2>The 14-Day Delivery Framework</h2>
        <p>Our <a href="../custom-development.html"><strong>Custom AI Engineering</strong></a> practice delivers production-grade solutions rapidly:</p>
        <ul>
          <li><strong>Days 1–3: Hybrid Vector Architecture:</strong> Marrying dense embeddings with sparse BM25 indexing and cross-encoder reranking for 99% retrieval precision.</li>
          <li><strong>Days 4–8: Agent Function Execution:</strong> Wiring deterministic tool calls into ERP systems (Tripletex, Fiken, SAP) and database clusters.</li>
          <li><strong>Days 9–14: Serverless Deployment on Cloud Run:</strong> Docker containerization, scale-to-zero economics, and cold-start optimization (<300ms).</li>
        </ul>

        <h2>Full IP Ownership</h2>
        <p>Clients receive full source code repository ownership, automated CI/CD configurations, and comprehensive operational playbooks.</p>
      `,
      faqs_no: [
        { q: 'Hvorfor velge Google Cloud Run fremfor tradisjonelle servere?', a: 'Cloud Run skalerer automatisk fra null til tusenvis av samtidige forespørsler, slik at du kun betaler for nøyaktig den prosessortiden som brukes.' },
        { q: 'Hvem eier kildekoden etter fullført prosjekt?', a: 'Kunden har 100 % eierskap til all kildekode, arkitektur og oppsatte mikrotjenester.' },
        { q: 'Hvordan sikres konfidensielle bedriftsdata?', a: 'Data sendes aldri til offentlig modelltrenig. All kommunikasjon krypteres og forblir i din dedikerte skykonto.' }
      ],
      faqs_en: [
        { q: 'Why select Google Cloud Run over dedicated VM instances?', a: 'Cloud Run scales to zero during idle periods and bursts instantaneously to thousands of concurrent requests, eliminating idle overhead.' },
        { q: 'Who retains intellectual property rights?', a: 'The client owns 100% of all generated source code, container manifests, and architecture documentation.' },
        { q: 'How is enterprise data confidentiality protected?', a: 'Zero enterprise telemetry is utilized for public model training; all data resides strictly inside isolated VPC boundaries.' }
      ]
    }
  };

  const selectedTpl = templates[targetApp] || templates['hubzoo'];
  
  let title = isEn ? selectedTpl.defaultTitle_en : selectedTpl.defaultTitle_no;
  let slug = isEn ? selectedTpl.slug_en : selectedTpl.slug_no;
  let category = isEn ? selectedTpl.category_en : selectedTpl.category_no;
  let metaDesc = isEn ? selectedTpl.metaDesc_en : selectedTpl.metaDesc_no;
  let contentHtml = isEn ? selectedTpl.contentHtml_en : selectedTpl.contentHtml_no;
  let faqs = isEn ? selectedTpl.faqs_en : selectedTpl.faqs_no;

  if (cleanTopic) {
    title = cleanTopic.length > 70 ? cleanTopic.substring(0, 67).trim() + '...' : cleanTopic;
    slug = cleanTopic.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (slug.length > 50) slug = slug.substring(0, 50).replace(/-+$/, '');
    
    // Inject topic context into lead paragraph
    if (isEn) {
      metaDesc = `In-depth analysis of ${cleanTopic}. Discover modern app architecture, frontier AI capabilities, and implementation workflows with ${appName}.`;
      if (metaDesc.length > 160) metaDesc = metaDesc.substring(0, 157).trim() + '...';
      contentHtml = `<p class="lead">Exploring <strong>${cleanTopic}</strong>: How modern engineering, cloud-native architecture, and the ${appName} ecosystem transform business velocity.</p>` + contentHtml;
    } else {
      metaDesc = `Dybdeanalyse av ${cleanTopic}. Se hvordan moderne skyarkitektur, frontier AI og ${appName} skaper målbare resultater for bedriften.`;
      if (metaDesc.length > 160) metaDesc = metaDesc.substring(0, 157).trim() + '...';
      contentHtml = `<p class="lead">Dybdeanalyse av <strong>${cleanTopic}</strong>: Hvordan moderne app-arkitektur, frontier AI og økosystemet rundt ${appName} gir målbare fortrinn.</p>` + contentHtml;
    }
  }

  return {
    title,
    slug,
    category,
    targetApp,
    metaDesc,
    readTime: isEn ? '5 min read' : '5 min lesetid',
    contentHtml,
    faqs
  };
}

// POST /api/articles/generate (Admin protected)
app.post('/api/articles/generate', requireAdminAuth, async (req, res) => {
  const {
    topic = '',
    targetApp = 'hubzoo',
    articleType = 'how-to',
    language = 'no',
    tone = 'tactical',
    geminiApiKey = ''
  } = req.body || {};

  const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

  if (effectiveGeminiKey) {
    try {
      const userPrompt = `Generate a complete, in-depth, production-ready article in JSON format.
Topic / Focus: ${topic || 'Optimalisering med moderne AI og smarte verktøy'}
Target Product / Service: ${targetApp} (${APP_CTAS[targetApp]?.name || targetApp})
Article Type: ${articleType}
Language: ${language === 'en' ? 'English' : 'Norwegian (Bokmål)'}
Tone: ${tone}

Return a valid JSON object matching this schema:
{
  "title": "String (engaging, SEO-optimized title, 50-75 chars)",
  "slug": "String (URL-friendly kebab-case slug)",
  "category": "String (e.g. AI-Automatisering, B2B Salg, SaaS & Sky, App-Utvikling)",
  "targetApp": "${targetApp}",
  "metaDesc": "String (Punchy meta description strictly <= 160 chars)",
  "readTime": "String (e.g. '5 min read' or '6 min lesetid')",
  "contentHtml": "String (Rich HTML with <p class=\\"lead\\">, multiple <h2> and <h3>, paragraphs, <blockquote>, and <ul>/<li> lists)",
  "faqs": [
    { "q": "Question 1?", "a": "Answer 1" },
    { "q": "Question 2?", "a": "Answer 2" },
    { "q": "Question 3?", "a": "Answer 3" }
  ]
}`;

      const generated = await callGeminiArticleJson(effectiveGeminiKey, AIAPPSY_KNOWLEDGE_BASE, userPrompt);
      if (generated && generated.title && generated.contentHtml) {
        generated.slug = (generated.slug || generated.title).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (generated.metaDesc && generated.metaDesc.length > 160) {
          generated.metaDesc = generated.metaDesc.substring(0, 157).trim() + '...';
        }
        return res.json({
          success: true,
          article: generated,
          generator: 'gemini-2.5-flash',
          message: `Artikkel '${generated.title}' ble generert med Gemini 2.5 Flash!`
        });
      }
    } catch (apiErr) {
      console.warn('[AI Article Writer] Gemini API failed, falling back to built-in KB engine:', apiErr.message);
    }
  }

  // Fallback to built-in intelligent domain engine
  const fallback = generateFallbackArticle({ topic, targetApp, articleType, language, tone });
  return res.json({
    success: true,
    article: fallback,
    generator: 'builtin-ai-engine',
    message: `Artikkel '${fallback.title}' ble generert med AIAPPSY Innebygd Kunnskapsmotor!`
  });
});

// API: Login & verify admin password
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', `admin_auth=${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ success: false, error: 'Feil admin-passord.' });
});

// DYNAMIC CAMPAIGN & MODAL POP-UP ENGINE
// ============================================================================
const CAMPAIGN_FILE = path.join(__dirname, 'campaign.json');

const DEFAULT_CAMPAIGN = {
  active: false,
  type: 'lead-magnet',
  badge: '⚡ EKSKLUSIVT TILBUD',
  title: 'Vil du automatisere kundeservicen din med AI?',
  subtitle: 'Få vår sjekkliste over hvordan ledende bedrifter sparer 20 timer ukentlig med autonome agenter.',
  ctaText: 'Send meg guiden nå →',
  ctaLink: '#contact',
  inputPlaceholder: 'Din e-postadresse...',
  trigger: 'exit-intent',
  delaySeconds: 5,
  scrollPercent: 50,
  themeColor: '#6366f1',
  updatedAt: new Date().toISOString()
};

function loadCampaign() {
  try {
    if (fs.existsSync(CAMPAIGN_FILE)) {
      return JSON.parse(fs.readFileSync(CAMPAIGN_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading campaign file:', e.message);
  }
  return { ...DEFAULT_CAMPAIGN };
}

function saveCampaign(camp) {
  try {
    fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify(camp, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving campaign file:', e.message);
    return false;
  }
}

// GET active campaign configuration (Public for website runner)
app.get('/api/campaign', (req, res) => {
  const camp = loadCampaign();
  res.json({ success: true, campaign: camp });
});

// POST update campaign configuration (Protected)
app.post('/api/campaign', (req, res) => {
  const customHeader = req.headers['x-admin-password'];
  const authHeader = req.headers['authorization'];
  const cookieStr = req.headers.cookie || '';
  const hasCookie = cookieStr.includes('admin_auth=') || cookieStr.includes('aiappsy2026');
  const pwd = customHeader || (authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '');

  if (pwd !== ADMIN_PASSWORD && !hasCookie && req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Uautorisert: Feil admin-passord' });
  }

  const newConfig = req.body || {};
  const current = loadCampaign();
  const updated = {
    ...current,
    ...newConfig,
    active: typeof newConfig.active === 'boolean' ? newConfig.active : current.active,
    updatedAt: new Date().toISOString()
  };

  saveCampaign(updated);
  console.log('[Campaign Engine] Kampanje oppdatert. Aktiv status:', updated.active);
  res.json({ success: true, message: 'Kampanjeoppsett lagret!', campaign: updated });
});

// API: Motta henvendelse / lead capture
app.post('/api/inquiry', (req, res) => {
  const { name, email, projectType, message } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Vennligst oppgi en gyldig e-postadresse.' });
  }

  const lead = {
    id: 'lead_' + Date.now(),
    name: (name || '').trim(),
    email: email.trim(),
    projectType: (projectType || 'General').trim(),
    message: (message || '').trim(),
    createdAt: new Date().toISOString(),
    ip: req.ip || req.headers['x-forwarded-for'] || ''
  };

  try {
    let leads = typeof loadLeadsSafe === 'function' ? loadLeadsSafe() : [];
    leads.unshift(lead);
    if (typeof saveLeadsSafe === 'function') saveLeadsSafe(leads);

    if (isFirestoreReady && firestoreDb) {
      firestoreDb.collection('leads').doc(lead.id).set(lead).catch(err => {
        console.error('[Firestore] Feil ved lagring av lead:', err.message);
      });
    }

    console.log(`[Lead Mottatt] ${lead.name} <${lead.email}> - ${lead.projectType}`);

    return res.json({
      success: true,
      message: 'Takk! Din henvendelse er mottatt. Vi svarer innen 24 timer.',
      lead
    });
  } catch (err) {
    console.error('Feil ved lagring av henvendelse:', err);
    return res.json({
      success: true,
      message: 'Mottatt! Vi kontakter deg snarest.',
      lead
    });
  }
});

// API: Hent mottatte henvendelser (Beskyttet av admin-passord)
app.get('/api/leads', (req, res) => {
  const customHeader = req.headers['x-admin-password'];
  const authHeader = req.headers['authorization'];
  let pwd = customHeader;
  if (!pwd && authHeader) pwd = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Uautorisert.' });
  }

  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
      return res.json({ success: true, leads: data });
    }
  } catch (e) {}
  return res.json({ success: true, leads: [] });
});

// API: Check auth status

// ============================================================================
// VOUCHER & RABATTKUPONG ENGINE
// ============================================================================
const VOUCHERS_FILE = path.join(__dirname, 'vouchers.json');

function loadVouchers() {
  try {
    if (fs.existsSync(VOUCHERS_FILE)) {
      return JSON.parse(fs.readFileSync(VOUCHERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Feil ved lesing av vouchers:', e);
  }
  return [];
}

function saveVouchers(vouchers) {
  try {
    fs.writeFileSync(VOUCHERS_FILE, JSON.stringify(vouchers, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Feil ved lagring av vouchers:', e);
    return false;
  }
}

// GET all vouchers (Admin protected)
app.get('/api/vouchers', requireAdminAuth, (req, res) => {
  const vouchers = loadVouchers();
  res.json({ success: true, vouchers });
});

// POST create or update voucher (Admin protected)
app.post('/api/vouchers', requireAdminAuth, (req, res) => {
  const { code, discountType, discountValue, currency, maxUses, expiresAt, active, appliesTo, description } = req.body || {};
  if (!code) {
    return res.status(400).json({ success: false, error: 'Kupongkode er påkrevd.' });
  }

  const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const val = parseFloat(discountValue) || 0;
  if (val <= 0) {
    return res.status(400).json({ success: false, error: 'Rabattverdi må være større enn 0.' });
  }

  const vouchers = loadVouchers();
  const existingIdx = vouchers.findIndex(v => v.code === cleanCode);

  const voucherObj = {
    code: cleanCode,
    discountType: discountType === 'fixed' ? 'fixed' : 'percent',
    discountValue: val,
    currency: currency || 'NOK',
    maxUses: maxUses ? parseInt(maxUses, 10) : null,
    usedCount: existingIdx !== -1 ? (vouchers[existingIdx].usedCount || 0) : 0,
    expiresAt: expiresAt || null,
    active: typeof active === 'boolean' ? active : true,
    appliesTo: appliesTo || 'all',
    description: (description || '').trim(),
    createdAt: existingIdx !== -1 ? vouchers[existingIdx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx !== -1) {
    vouchers[existingIdx] = voucherObj;
  } else {
    vouchers.unshift(voucherObj);
  }

  saveVouchers(vouchers);
  res.json({
    success: true,
    message: existingIdx !== -1 ? `Kupong ${cleanCode} oppdatert!` : `Kupong ${cleanCode} opprettet!`,
    voucher: voucherObj
  });
});

// DELETE voucher (Admin protected)
app.delete('/api/vouchers/:code', requireAdminAuth, (req, res) => {
  const cleanCode = req.params.code.trim().toUpperCase();
  const vouchers = loadVouchers();
  const filtered = vouchers.filter(v => v.code !== cleanCode);
  if (filtered.length === vouchers.length) {
    return res.status(404).json({ success: false, error: 'Kupongen finnes ikke.' });
  }
  saveVouchers(filtered);
  res.json({ success: true, message: `Kupong ${cleanCode} slettet.` });
});

// POST validate voucher (Public endpoint for generator and checkout)
app.post('/api/vouchers/validate', (req, res) => {
  const { code, amount } = req.body || {};
  if (!code) {
    return res.status(400).json({ success: false, error: 'Ingen kupongkode oppgitt.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const vouchers = loadVouchers();
  const v = vouchers.find(item => item.code === cleanCode);

  if (!v || !v.active) {
    return res.status(404).json({ success: false, error: 'Ugyldig eller deaktivert kupongkode.' });
  }

  if (v.expiresAt && new Date(v.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: 'Denne kupongkoden har utløpt.' });
  }

  if (v.maxUses && v.usedCount >= v.maxUses) {
    return res.status(400).json({ success: false, error: 'Denne kupongkoden har nådd maksimalt antall bruk.' });
  }

  const baseAmount = parseFloat(amount) || 0;
  let discountAmount = 0;

  if (v.discountType === 'percent') {
    discountAmount = Math.round(baseAmount * (v.discountValue / 100));
  } else {
    discountAmount = Math.min(baseAmount, v.discountValue);
  }

  const newTotal = Math.max(0, baseAmount - discountAmount);

  res.json({
    success: true,
    valid: true,
    code: v.code,
    discountType: v.discountType,
    discountValue: v.discountValue,
    discountAmount,
    newTotal,
    description: v.description,
    currency: v.currency || 'NOK'
  });
});

// ============================================================================
// LEAD CRM & COMMUNICATION ENGINE
// ============================================================================
function loadLeadsSafe() {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Feil ved lesing av leads:', e);
  }
  return [];
}

function saveLeadsSafe(leads) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Feil ved lagring av leads:', e);
    return false;
  }
}

// PUT /api/leads/:id/status (Update pipeline status)
app.put('/api/leads/:id/status', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowed = ['new', 'contacted', 'meeting_booked', 'proposal_sent', 'won', 'archived'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, error: 'Ugyldig status.' });
  }

  const leads = loadLeadsSafe();
  const lead = leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead ikke funnet.' });
  }

  lead.status = status;
  lead.updatedAt = new Date().toISOString();
  saveLeadsSafe(leads);

  res.json({ success: true, message: `Status oppdatert til ${status}`, lead });
});

// POST /api/leads/:id/notes (Add internal note)
app.post('/api/leads/:id/notes', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Notattekst kan ikke være tom.' });
  }

  const leads = loadLeadsSafe();
  const lead = leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead ikke funnet.' });
  }

  if (!lead.notes) lead.notes = [];
  const note = {
    id: 'note_' + Date.now(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  };
  lead.notes.unshift(note);
  lead.updatedAt = new Date().toISOString();
  saveLeadsSafe(leads);

  res.json({ success: true, message: 'Notat lagret!', note, lead });
});

// POST /api/leads/:id/reply (Log outbound communication / email response)
app.post('/api/leads/:id/reply', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { subject, body, voucherCode } = req.body || {};
  if (!body || !body.trim()) {
    return res.status(400).json({ success: false, error: 'Meldingsinnhold er påkrevd.' });
  }

  const leads = loadLeadsSafe();
  const lead = leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ success: false, error: 'Lead ikke funnet.' });
  }

  if (!lead.communications) lead.communications = [];
  const comm = {
    id: 'comm_' + Date.now(),
    direction: 'outbound',
    subject: (subject || 'Svar fra AIAPPSY').trim(),
    body: body.trim(),
    voucherCode: (voucherCode || '').trim() || null,
    sentAt: new Date().toISOString()
  };

  lead.communications.unshift(comm);
  if (lead.status === 'new') {
    lead.status = voucherCode ? 'proposal_sent' : 'contacted';
  }
  lead.updatedAt = new Date().toISOString();
  saveLeadsSafe(leads);

  res.json({ success: true, message: 'Melding logget og status oppdatert!', comm, lead });
});

// ============================================================================
// MEETING BOOKING & MANAGEMENT ENGINE
// ============================================================================
// MEETING BOOKING & CALENDAR ENGINE (CALENDLY / CAL.COM ARCHITECTURE)
// ============================================================================
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
const CALENDAR_CONFIG_FILE = path.join(__dirname, 'calendar_config.json');

const DEFAULT_CALENDAR_CONFIG = {
  hostTimeZone: 'Asia/Manila',
  clientPrimaryTimeZone: 'Europe/Oslo',
  scheduleTimeZone: 'Asia/Manila',
  weeklySchedule: {
    monday:    { enabled: true,  start: '15:00', end: '23:00' },
    tuesday:   { enabled: true,  start: '15:00', end: '23:00' },
    wednesday: { enabled: true,  start: '15:00', end: '23:00' },
    thursday:  { enabled: true,  start: '15:00', end: '23:00' },
    friday:    { enabled: true,  start: '15:00', end: '22:00' },
    saturday:  { enabled: false, start: '15:00', end: '19:00' },
    sunday:    { enabled: false, start: '15:00', end: '19:00' }
  },
  lunchBreak: { enabled: true, start: '18:30', end: '19:15' },
  bufferMinutes: 15,
  minNoticeHours: 2,
  maxFutureDays: 30,
  timeZone: 'Asia/Manila',
  blackoutDates: [],
  defaultMeetType: 'google_meet',
  customMeetUrl: '',
  meetingTypes: [
    {
      id: 'strategy',
      name_no: 'AI-Strategisamtale',
      name_en: 'AI Strategy Session',
      duration: 30,
      badge_no: '30 MIN · GRATIS',
      badge_en: '30 MIN · FREE',
      desc_no: 'Kartlegging av manuelle flaskehalser, tidsbruk og hvilke AI-modeller som gir raskest ROI.',
      desc_en: 'Identify automation bottlenecks and AI models for fastest ROI.'
    },
    {
      id: 'technical',
      name_no: 'Arkitekturgjennomgang',
      name_en: 'Technical Architecture Review',
      duration: 45,
      badge_no: '45 MIN · TEKNISK',
      badge_en: '45 MIN · TECHNICAL',
      desc_no: 'For bedrifter som ønsker dypere integrasjon med interne databaser, ERP eller CRM (Fiken, HubSpot).',
      desc_en: 'Deep dive into custom ERP, CRM and enterprise AI integrations.'
    },
    {
      id: 'demo',
      name_no: 'Produktdemo & Whitelabel',
      name_en: 'Product Demo & Whitelabel',
      duration: 15,
      badge_no: '15 MIN · LYNRASK',
      badge_en: '15 MIN · QUICK',
      desc_no: 'Rask gjennomgang av våre 7 ferdige AI-apper for byråer eller investorer som vil lansere egne merkevarer.',
      desc_en: 'Fast walkthrough of our 7 ready-to-use apps for agencies & founders.'
    }
  ]
};

// Timezone conversion helpers
function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

function zonedDateTimeToUtc(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, h, min, 0));
  const invDate = new Date(utcGuess.toLocaleString('en-US', { timeZone: 'UTC' }));
  const targetDate = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
  const diff = invDate.getTime() - targetDate.getTime();
  return new Date(utcGuess.getTime() + diff);
}

function getZonedParts(utcDate, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    weekday: 'long'
  });
  const parts = formatter.formatToParts(utcDate);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    dateStr: `${map.year}-${map.month}-${map.day}`,
    weekday: (map.weekday || '').toLowerCase(),
    hour: map.hour,
    minute: map.minute,
    timeStr: `${map.hour}:${map.minute}`,
    minutes: parseInt(map.hour, 10) * 60 + parseInt(map.minute, 10)
  };
}

function loadCalendarConfig() {
  try {
    if (fs.existsSync(CALENDAR_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CALENDAR_CONFIG_FILE, 'utf8'));
      return {
        ...DEFAULT_CALENDAR_CONFIG,
        ...parsed,
        hostTimeZone: parsed.hostTimeZone || DEFAULT_CALENDAR_CONFIG.hostTimeZone,
        clientPrimaryTimeZone: parsed.clientPrimaryTimeZone || DEFAULT_CALENDAR_CONFIG.clientPrimaryTimeZone,
        scheduleTimeZone: parsed.scheduleTimeZone || DEFAULT_CALENDAR_CONFIG.scheduleTimeZone,
        weeklySchedule: { ...DEFAULT_CALENDAR_CONFIG.weeklySchedule, ...(parsed.weeklySchedule || {}) },
        lunchBreak: { ...DEFAULT_CALENDAR_CONFIG.lunchBreak, ...(parsed.lunchBreak || {}) }
      };
    }
  } catch (e) {
    console.error('Feil ved lesing av calendar_config.json:', e);
  }
  return { ...DEFAULT_CALENDAR_CONFIG };
}

function saveCalendarConfig(cfg) {
  try {
    fs.writeFileSync(CALENDAR_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Feil ved lagring av calendar_config.json:', e);
    return false;
  }
}

function loadBookings() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      return JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Feil ved lesing av bookings:', e);
  }
  return [];
}

function saveBookings(bookings) {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Feil ved lagring av bookings:', e);
    return false;
  }
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

// GET calendar configuration (Public)
app.get('/api/bookings/config', (req, res) => {
  const cfg = loadCalendarConfig();
  res.json({ success: true, config: cfg });
});

// POST save calendar configuration (Admin protected)
app.post('/api/bookings/config', requireAdminAuth, (req, res) => {
  const incoming = req.body || {};
  const current = loadCalendarConfig();
  const updated = {
    ...current,
    ...incoming,
    hostTimeZone: incoming.hostTimeZone || current.hostTimeZone || 'Asia/Manila',
    clientPrimaryTimeZone: incoming.clientPrimaryTimeZone || current.clientPrimaryTimeZone || 'Europe/Oslo',
    scheduleTimeZone: incoming.scheduleTimeZone || current.scheduleTimeZone || 'Asia/Manila',
    weeklySchedule: { ...current.weeklySchedule, ...(incoming.weeklySchedule || {}) },
    lunchBreak: { ...current.lunchBreak, ...(incoming.lunchBreak || {}) },
    meetingTypes: Array.isArray(incoming.meetingTypes) ? incoming.meetingTypes : current.meetingTypes,
    blackoutDates: Array.isArray(incoming.blackoutDates) ? incoming.blackoutDates : current.blackoutDates,
    updatedAt: new Date().toISOString()
  };

  saveCalendarConfig(updated);
  console.log('[Calendar Config] Innstillinger oppdatert av admin med tidssoner:', {
    host: updated.hostTimeZone,
    client: updated.clientPrimaryTimeZone,
    schedule: updated.scheduleTimeZone
  });
  res.json({ success: true, message: 'Kalender- og tilgjengelighetsinnstillinger lagret!', config: updated });
});

// GET available slots for a given date and meeting type (Public, Timezone-aware)
app.get('/api/bookings/available-slots', (req, res) => {
  const date = req.query.date;
  const type = req.query.type || 'strategy';
  const durationParam = parseInt(req.query.duration, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'Ugyldig datoformat (YYYY-MM-DD).' });
  }

  const config = loadCalendarConfig();
  const hostTz = isValidTimeZone(config.hostTimeZone) ? config.hostTimeZone : 'Asia/Manila';
  const clientPrimaryTz = isValidTimeZone(config.clientPrimaryTimeZone) ? config.clientPrimaryTimeZone : 'Europe/Oslo';
  const schedTz = isValidTimeZone(config.scheduleTimeZone) ? config.scheduleTimeZone : hostTz;

  const requestedTz = req.query.timeZone || req.query.clientTimeZone || clientPrimaryTz;
  const clientTz = isValidTimeZone(requestedTz) ? requestedTz : clientPrimaryTz;

  // 1. Sjekk sperredatoer / feriedager (sjekkes mot dato)
  if (config.blackoutDates && config.blackoutDates.includes(date)) {
    return res.json({ 
      success: true, 
      date, 
      clientTimeZone: clientTz,
      hostTimeZone: hostTz,
      scheduleTimeZone: schedTz,
      availableSlots: [], 
      slotDetails: [],
      bookedSlots: [], 
      isClosed: true, 
      reason: 'blackout' 
    });
  }

  // 2. Finn møtetype og varighet
  const mType = (config.meetingTypes || []).find(t => t.id === type) || config.meetingTypes[0] || { duration: 30 };
  const duration = durationParam || parseInt(mType.duration, 10) || 30;
  const buffer = parseInt(config.bufferMinutes, 10) || 0;
  const minNoticeHours = parseInt(config.minNoticeHours, 10) || 2;
  const maxFutureDays = parseInt(config.maxFutureDays, 10) || 30;

  // 3. Lunsjpause i scheduleTimeZone
  const hasLunch = config.lunchBreak && config.lunchBreak.enabled;
  const lunchStart = hasLunch ? timeToMinutes(config.lunchBreak.start || '18:30') : -1;
  const lunchEnd = hasLunch ? timeToMinutes(config.lunchBreak.end || '19:15') : -1;

  // 4. Eksisterende bookinger
  const bookings = loadBookings();
  const activeBookings = bookings.filter(b => b.status !== 'cancelled').map(b => {
    let startUtc = 0;
    if (b.utcIso) {
      startUtc = new Date(b.utcIso).getTime();
    } else if (b.date && b.time) {
      const bTz = b.clientTimeZone || clientPrimaryTz;
      startUtc = zonedDateTimeToUtc(b.date, b.time, bTz).getTime();
    }
    const bDuration = parseInt(b.duration, 10) || 30;
    return {
      startUtc,
      endUtc: startUtc + bDuration * 60000,
      clientDate: b.date,
      clientTime: b.time
    };
  });

  const nowMs = Date.now();
  const minAllowedTime = nowMs + minNoticeHours * 3600000;
  const maxAllowedTime = nowMs + maxFutureDays * 86400000;

  const availableSlots = [];
  const slotDetails = [];
  const bookedSlotStrings = [];

  // Generer kandidattider gjennom dagen i klientens tidssone (fra 07:00 til 23:00)
  const step = duration <= 15 ? 15 : 30;

  for (let clientMinutes = 7 * 60; clientMinutes + duration <= 23 * 60; clientMinutes += step) {
    const timeStr = minutesToTime(clientMinutes);
    const candUtcDate = zonedDateTimeToUtc(date, timeStr, clientTz);
    const candStartMs = candUtcDate.getTime();
    const candEndMs = candStartMs + duration * 60000;

    // Sjekk minste varslingstid
    if (candStartMs < minAllowedTime) {
      continue;
    }

    // Sjekk maksimal planleggingshorisont
    if (candStartMs > maxAllowedTime) {
      continue;
    }

    // Finn tid og ukedag i vertens timeplan-tidssone (schedTz, f.eks. Asia/Manila)
    const hostParts = getZonedParts(candUtcDate, schedTz);
    const hostDayName = hostParts.weekday;
    const hostDayConfig = config.weeklySchedule ? config.weeklySchedule[hostDayName] : null;

    // Er vertens ukedag åpen?
    if (!hostDayConfig || !hostDayConfig.enabled) {
      continue;
    }

    // Er datoen i vertens tidssone sperret?
    if (config.blackoutDates && config.blackoutDates.includes(hostParts.dateStr)) {
      continue;
    }

    // Sjekk om innenfor vertens arbeidstid
    const dayStartMin = timeToMinutes(hostDayConfig.start || '15:00');
    const dayEndMin = timeToMinutes(hostDayConfig.end || '23:00');
    const hostSlotStart = hostParts.minutes;
    const hostSlotEnd = hostSlotStart + duration;

    if (hostSlotStart < dayStartMin || hostSlotEnd > dayEndMin) {
      continue;
    }

    // Sjekk lunsjpause
    if (hasLunch && hostSlotStart < lunchEnd && hostSlotEnd > lunchStart) {
      continue;
    }

    // Sjekk kollisjon med bookinger inkludert buffer
    const hasConflict = activeBookings.some(b => {
      const bufferMs = buffer * 60000;
      return (candStartMs < (b.endUtc + bufferMs)) && (candEndMs > (b.startUtc - bufferMs));
    });

    if (hasConflict) {
      bookedSlotStrings.push(timeStr);
      continue;
    }

    // Gyldig tidsluke funnet
    availableSlots.push(timeStr);
    slotDetails.push({
      time: timeStr,
      hostTime: hostParts.timeStr,
      hostDay: hostDayName,
      hostDate: hostParts.dateStr,
      utc: candUtcDate.toISOString(),
      label: `${timeStr} (${hostParts.timeStr} Manila)`
    });
  }

  res.json({
    success: true,
    date,
    clientTimeZone: clientTz,
    hostTimeZone: hostTz,
    scheduleTimeZone: schedTz,
    duration,
    availableSlots,
    slotDetails,
    bookedSlots: bookedSlotStrings,
    isClosed: availableSlots.length === 0
  });
});

// POST create booking (Public, Timezone-aware)
app.post('/api/bookings', (req, res) => {
  const { name, email, company, phone, type, date, time, notes, clientTimeZone } = req.body || {};
  if (!name || !email || !email.includes('@') || !date || !time) {
    return res.status(400).json({ success: false, error: 'Navn, gyldig e-post, dato og klokkeslett kreves.' });
  }

  const config = loadCalendarConfig();
  const hostTz = isValidTimeZone(config.hostTimeZone) ? config.hostTimeZone : 'Asia/Manila';
  const clientPrimaryTz = isValidTimeZone(config.clientPrimaryTimeZone) ? config.clientPrimaryTimeZone : 'Europe/Oslo';
  const effectiveClientTz = isValidTimeZone(clientTimeZone) ? clientTimeZone : clientPrimaryTz;

  const utcDate = zonedDateTimeToUtc(date, time, effectiveClientTz);
  const utcIso = utcDate.toISOString();
  const candStartMs = utcDate.getTime();

  const mType = (config.meetingTypes || []).find(t => t.id === type) || config.meetingTypes[0] || {};
  const title = mType.name_no || '30 min Gratis AI-Strategisamtale';
  const duration = parseInt(req.body.duration || mType.duration, 10) || 30;
  const candEndMs = candStartMs + duration * 60000;

  // Sjekk kollisjon mot aktive bookinger
  const bookings = loadBookings();
  const isConflict = bookings.some(b => {
    if (b.status === 'cancelled') return false;
    let bStart = 0;
    if (b.utcIso) {
      bStart = new Date(b.utcIso).getTime();
    } else if (b.date && b.time) {
      const bTz = b.clientTimeZone || clientPrimaryTz;
      bStart = zonedDateTimeToUtc(b.date, b.time, bTz).getTime();
    }
    const bDur = parseInt(b.duration, 10) || 30;
    const bEnd = bStart + bDur * 60000;
    return (candStartMs < bEnd && candEndMs > bStart);
  });

  if (isConflict) {
    return res.status(400).json({ success: false, error: 'Dette tidspunktet er dessverre allerede booket. Vennligst velg et annet.' });
  }

  // Finn dato og klokkeslett i Filippinene (vertens tidssone)
  const hostParts = getZonedParts(utcDate, hostTz);

  let meetUrl = config.customMeetUrl;
  if (!meetUrl) {
    const meetId = 'aiappsy-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 6);
    meetUrl = `https://meet.google.com/${meetId}`;
  }

  const booking = {
    id: 'meet_' + Date.now(),
    title,
    type: type || 'strategy',
    name: name.trim(),
    email: email.trim(),
    company: (company || '').trim(),
    phone: (phone || '').trim(),
    date: date.trim(),
    time: time.trim(),
    clientTimeZone: effectiveClientTz,
    hostDate: hostParts.dateStr,
    hostTime: hostParts.timeStr,
    hostTimeZone: hostTz,
    utcIso,
    duration,
    meetUrl,
    status: 'confirmed',
    notes: (notes || '').trim(),
    remindersSent: {},
    createdAt: new Date().toISOString()
  };

  booking.googleCalendarUrl = getGoogleCalendarUrl(booking);
  booking.icsUrl = `/api/bookings/${booking.id}/ics`;

  bookings.unshift(booking);
  saveBookings(bookings);

  // Automatisk e-postbekreftelse og kalendersynk (Google Kalender & .ics)
  sendBookingNotificationEmails(booking).catch(err => {
    console.error('[Booking Email] Feil ved utsendelse av bekreftelse:', err.message);
  });

  // Automatisk registrering i CRM med dual timezone-info
  try {
    const leads = loadLeadsSafe();
    const existingLead = leads.find(l => l.email && l.email.toLowerCase() === booking.email.toLowerCase());
    const meetingNoteText = `Booket møte: ${booking.title} den ${booking.date} kl. ${booking.time} (${booking.clientTimeZone}) / kl. ${booking.hostTime} (${booking.hostTimeZone})`;
    if (existingLead) {
      existingLead.status = 'meeting_booked';
      if (!existingLead.notes) existingLead.notes = [];
      existingLead.notes.unshift({
        id: 'note_' + Date.now(),
        text: meetingNoteText,
        createdAt: new Date().toISOString()
      });
      existingLead.updatedAt = new Date().toISOString();
      saveLeadsSafe(leads);
    } else {
      const newLead = {
        id: 'lead_' + Date.now(),
        name: booking.name,
        email: booking.email,
        projectType: `Møte: ${booking.title}`,
        message: `${meetingNoteText}. Notater: ${booking.notes || 'Ingen'}`,
        createdAt: new Date().toISOString(),
        status: 'meeting_booked',
        notes: [{
          id: 'note_' + Date.now(),
          text: `Møte opprettet via bookingportal (${booking.title})`,
          createdAt: new Date().toISOString()
        }],
        communications: []
      };
      leads.unshift(newLead);
      saveLeadsSafe(leads);
    }
  } catch (err) {
    console.error('Feil ved CRM-kobling av booking:', err);
  }

  console.log(`[Booking Opprettet] ${booking.name} <${booking.email}> - ${booking.title} (${booking.date} ${booking.time} ${booking.clientTimeZone} = ${booking.hostTime} Manila)`);
  res.json({
    success: true,
    message: 'Møtet er bekreftet! Kalenderinvitasjon og e-post er sendt.',
    booking
  });
});

// GET all bookings (Admin protected)
app.get('/api/bookings', requireAdminAuth, (req, res) => {
  const bookings = loadBookings();
  res.json({ success: true, bookings });
});

// PUT update booking (Admin protected)
app.put('/api/bookings/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};
  const bookings = loadBookings();
  const booking = bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Møtebooking ikke funnet.' });
  }

  const prevStatus = booking.status;
  if (updates.status) booking.status = updates.status;
  if (updates.date) booking.date = updates.date;
  if (updates.time) booking.time = updates.time;
  if (updates.meetUrl) booking.meetUrl = updates.meetUrl;
  if (updates.notes) booking.notes = updates.notes;
  booking.updatedAt = new Date().toISOString();
  booking.googleCalendarUrl = getGoogleCalendarUrl(booking);

  saveBookings(bookings);

  // Send bekreftelse ved statusendring til 'confirmed'
  if (updates.status === 'confirmed' && prevStatus !== 'confirmed') {
    sendBookingConfirmedEmails(booking).catch(e => console.error('Feil ved bekreftelses-e-post:', e.message));
  }

  res.json({ success: true, message: 'Møtebooking oppdatert!', booking });
});

// DELETE booking (Admin protected)
app.delete('/api/bookings/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const bookings = loadBookings();
  const filtered = bookings.filter(b => b.id !== id);
  if (filtered.length === bookings.length) {
    return res.status(404).json({ success: false, error: 'Møtebooking ikke funnet.' });
  }
  saveBookings(filtered);
  res.json({ success: true, message: 'Møtebooking slettet.' });
});

// POST /api/bookings/:id/send-reminder (Admin protected manual trigger)
app.post('/api/bookings/:id/send-reminder', requireAdminAuth, async (req, res) => {
  const { id } = req.params;
  const bookings = loadBookings();
  const booking = bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ success: false, error: 'Booking ikke funnet.' });
  }

  try {
    const result = await sendMeetingReminderEmails(booking, 'manual');
    if (!booking.remindersSent) booking.remindersSent = {};
    booking.remindersSent.manual = new Date().toISOString();
    saveBookings(bookings);

    res.json({
      success: true,
      message: `Påminnelse og møtelenke sendt til ${booking.email} og verten!`,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/bookings/:id/google-calendar (Public 302 redirect to Google Calendar event creation)
app.get('/api/bookings/:id/google-calendar', (req, res) => {
  const { id } = req.params;
  const bookings = loadBookings();
  const b = bookings.find(item => item.id === id);
  if (!b) {
    return res.status(404).send('Booking ikke funnet');
  }
  const gcalUrl = getGoogleCalendarUrl(b);
  res.redirect(gcalUrl);
});

// GET generate .ics calendar invite (Public, Universal UTC with METHOD:REQUEST)
app.get('/api/bookings/:id/ics', (req, res) => {
  const { id } = req.params;
  const bookings = loadBookings();
  const b = bookings.find(item => item.id === id);
  if (!b) {
    return res.status(404).send('Booking not found');
  }

  const icsContent = buildIcsCalendarEvent(b);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8; method=REQUEST');
  res.setHeader('Content-Disposition', `attachment; filename="aiappsy-mote-${b.date}.ics"`);
  res.send(icsContent);
});

// ============================================================================
// EMAIL, PING, REMINDERS & GOOGLE CALENDAR ENGINE
// ============================================================================

function loadEmailConfig() {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  const cfg = (settings && settings.email) ? settings.email : {};
  return {
    enabled: cfg.enabled !== false,
    smtpHost: process.env.SMTP_HOST || cfg.smtpHost || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || cfg.smtpPort || '465', 10),
    smtpSecure: (process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : (cfg.smtpSecure !== false)),
    smtpUser: process.env.SMTP_USER || process.env.SENDER_EMAIL || cfg.smtpUser || 'paljuritzen@gmail.com',
    smtpPass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || cfg.smtpPass || '',
    notificationEmail: process.env.NOTIFICATION_EMAIL || cfg.notificationEmail || 'paul@aiappsy.com',
    senderName: cfg.senderName || 'Pål Juritzen · AIAPPSY'
  };
}

function saveEmailConfig(cfg) {
  const settings = typeof loadSettings === 'function' ? loadSettings() : {};
  settings.email = { ...(settings.email || {}), ...cfg };
  if (typeof saveSettings === 'function') saveSettings(settings);
  return settings.email;
}

function loadEmailLogs() {
  try {
    if (fs.existsSync(EMAIL_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(EMAIL_LOGS_FILE, 'utf8'));
    }
  } catch (e) {}
  return [];
}

function logEmailSent(entry) {
  try {
    const logs = loadEmailLogs();
    logs.unshift({ id: 'mail_' + Date.now(), timestamp: new Date().toISOString(), ...entry });
    if (logs.length > 200) logs.length = 200;
    fs.writeFileSync(EMAIL_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Feil ved skriving til email_logs.json:', e.message);
  }
}

function getGoogleCalendarUrl(b) {
  let startUtc = null;
  if (b.utcIso) {
    startUtc = new Date(b.utcIso);
  } else {
    const tz = b.clientTimeZone || 'Europe/Oslo';
    startUtc = zonedDateTimeToUtc(b.date, b.time, tz);
  }
  const durationMin = parseInt(b.duration, 10) || 30;
  const endUtc = new Date(startUtc.getTime() + durationMin * 60000);
  const fmt = d => d.toISOString().replace(/-|:|\.\d+/g, '');
  const title = `AIAPPSY: ${b.title || 'AI Rådgivning & Strategimøte'}`;
  const details = `Møte med ${b.name} (${b.email}).\n\nKlientens lokale tid (${b.clientTimeZone || 'Europe/Oslo'}): ${b.date} kl. ${b.time}\nVertens lokale tid (${b.hostTimeZone || 'Asia/Manila'}): ${b.hostTime || ''}\n\nGoogle Meet: ${b.meetUrl || 'https://meet.google.com/new'}\nFirma: ${b.company || 'Ikke oppgitt'}\nTelefon: ${b.phone || 'Ikke oppgitt'}\nNotater: ${b.notes || 'Ingen'}\n\nArrangør: Pål Juritzen (AIAPPSY)`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startUtc)}/${fmt(endUtc)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(b.meetUrl || 'Google Meet')}&add=${encodeURIComponent(b.email)}`;
}

function buildIcsCalendarEvent(b) {
  let startUtc = null;
  if (b.utcIso) {
    startUtc = new Date(b.utcIso);
  } else {
    const tz = b.clientTimeZone || 'Europe/Oslo';
    startUtc = zonedDateTimeToUtc(b.date, b.time, tz);
  }
  const durationMin = parseInt(b.duration, 10) || 30;
  const endUtc = new Date(startUtc.getTime() + durationMin * 60000);

  function formatIcsDate(d) {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  const startDt = formatIcsDate(startUtc);
  const endDt = formatIcsDate(endUtc);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AIAPPSY//Meeting Engine 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${b.id}@aiappsy.com`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:AIAPPSY: ${b.title || 'Strategimøte'}`,
    `DESCRIPTION:${b.title || 'Strategimøte'}\\n\\nKlienttid: ${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})\\nVertstid (Manila): kl. ${b.hostTime || ''} (${b.hostTimeZone || 'Asia/Manila'})\\n\\nGoogle Meet videolenke: ${b.meetUrl}\\nArrangør: Pål Juritzen (paljuritzen@gmail.com)\\nNotater: ${b.notes || 'Ingen'}`,
    `LOCATION:${b.meetUrl}`,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=Pål Juritzen (AIAPPSY):mailto:paljuritzen@gmail.com',
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${b.name}:mailto:${b.email}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:AIAPPSY Møte starter om 15 minutter',
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

async function sendEmail({ to, subject, html, text, icsContent, icsFilename = 'meeting-invite.ics', isPing = false }) {
  const cfg = loadEmailConfig();
  const fromAddress = `"${cfg.senderName}" <${cfg.smtpUser}>`;

  const logEntry = {
    to,
    subject,
    from: fromAddress,
    isPing,
    hasIcs: !!icsContent,
    status: 'pending'
  };

  if (!cfg.enabled || !cfg.smtpPass) {
    console.log(`[Email Service (Simulert/Logg)] To: ${to} | Subject: "${subject}" | (Mangler SMTP-passord i konfigurasjon)`);
    logEntry.status = 'simulated';
    logEntry.note = 'Simulert e-post (Mangler Gmail App-passord i innstillingene)';
    logEmailSent(logEntry);
    return {
      success: false,
      simulated: true,
      error: 'Gmail App-passord er ikke lagret ennå. Gå til innstillingene i Admin og lim inn ditt 16-tegns Google App Password.'
    };
  }

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, ' '),
    html
  };

  if (icsContent) {
    mailOptions.icalEvent = {
      filename: icsFilename,
      method: 'REQUEST',
      content: icsContent
    };
    mailOptions.alternatives = [{
      contentType: 'text/calendar; charset="utf-8"; method=REQUEST',
      content: icsContent
    }];
  }

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      auth: {
        user: cfg.smtpUser,
        pass: cfg.smtpPass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] ✓ Sendt til ${to}: "${subject}" (MessageID: ${info.messageId})`);
    logEntry.status = 'sent';
    logEntry.messageId = info.messageId;
    logEmailSent(logEntry);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.warn(`[Email Service] Første forsøk feilet for ${to} på port ${cfg.smtpPort}: ${err.message}`);

    // Fallback: Hvis port 465 timeout/blokkert, prøv port 587 (STARTTLS)
    if (cfg.smtpPort === 465 || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ESOCKET') {
      try {
        console.log(`[Email Service] Prøver fallback via smtp.gmail.com:587 (STARTTLS)...`);
        const fallbackTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: cfg.smtpUser,
            pass: cfg.smtpPass
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000
        });
        const info = await fallbackTransporter.sendMail(mailOptions);
        console.log(`[Email Service] ✓ Fallback sendt via port 587 til ${to} (MessageID: ${info.messageId})`);
        logEntry.status = 'sent_fallback_587';
        logEntry.messageId = info.messageId;
        logEmailSent(logEntry);
        return { success: true, messageId: info.messageId };
      } catch (fallbackErr) {
        console.error(`[Email Service] ❌ Også fallback feilet for ${to}:`, fallbackErr.message);
        logEntry.status = 'failed';
        logEntry.error = fallbackErr.message;
        logEmailSent(logEntry);
        return { success: false, error: fallbackErr.message };
      }
    }

    logEntry.status = 'failed';
    logEntry.error = err.message;
    logEmailSent(logEntry);
    return { success: false, error: err.message };
  }
}

async function sendBookingNotificationEmails(b) {
  const cfg = loadEmailConfig();
  const icsContent = buildIcsCalendarEvent(b);
  const gcalUrl = getGoogleCalendarUrl(b);

  // 1. E-post til besøkende / kunde
  const visitorHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Møtebekreftelse · AIAPPSY</span>
      <h1 style="color: #ffffff; font-size: 24px; margin: 16px 0 8px;">Ditt møte er reservert!</h1>
      <p style="color: #94a3b8; font-size: 15px; margin: 0;">Vi gleder oss til samtalen om AI-utvikling og smarte løsninger.</p>
    </div>

    <div style="background: #131d35; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin-top: 0; color: #ffffff; font-size: 17px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">${b.title}</h3>
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 140px;">📅 Din lokale tid:</td>
          <td style="padding: 6px 0; color: #38bdf8; font-weight: 700;">${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">🌏 Vertens tid:</td>
          <td style="padding: 6px 0; color: #a78bfa; font-weight: 600;">kl. ${b.hostTime || ''} (${b.hostTimeZone || 'Asia/Manila'})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">⏱️ Varighet:</td>
          <td style="padding: 6px 0; color: #ffffff;">${b.duration} minutter</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">🎥 Møtested:</td>
          <td style="padding: 6px 0;"><a href="${b.meetUrl}" style="color: #6366f1; text-decoration: none; font-weight: 700;">${b.meetUrl}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">👤 Vert:</td>
          <td style="padding: 6px 0; color: #ffffff;">Pål Juritzen · AIAPPSY Engineering</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${gcalUrl}" style="background: #4285f4; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 10px; margin-bottom: 10px;">
        📅 Legg til i Google Kalender
      </a>
      <a href="${b.meetUrl}" style="background: #10b981; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; margin-bottom: 10px;">
        🎥 Bli med i Google Meet
      </a>
    </div>

    <p style="color: #64748b; font-size: 12px; text-align: center; margin: 0;">
      En kalenderinvitasjon (.ics) er vedlagt denne e-posten for Outlook og Apple Calendar.<br>
      © ${new Date().getFullYear()} AIAPPSY (aiappsy.com)
    </p>
  </div>`;

  await sendEmail({
    to: b.email,
    subject: `✓ Bekreftelse: Ditt møte med AIAPPSY (${b.date} kl. ${b.time})`,
    html: visitorHtml,
    icsContent
  });

  // 2. Varsling til verten (Pål Juritzen / Admin)
  const hostHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <div style="margin-bottom: 20px;">
      <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">🔔 NY MØTEBOOKING</span>
      <h1 style="color: #ffffff; font-size: 22px; margin: 12px 0 6px;">Nytt møte: ${b.name} (${b.company || 'Privat'})</h1>
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">Møtet er automatisk registrert i kalenderen og CRM-pipelinen.</p>
    </div>

    <div style="background: #131d35; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #94a3b8; width: 140px;">🇵🇭 Manila Tid (Deg):</td>
          <td style="padding: 6px 0; color: #38bdf8; font-weight: 800;">${b.hostDate || b.date} kl. ${b.hostTime || ''} (${b.hostTimeZone || 'Asia/Manila'})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">🇳🇴 Klienttid (Oslo):</td>
          <td style="padding: 6px 0; color: #a78bfa; font-weight: 700;">${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">👤 Klient:</td>
          <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${b.name} &lt;${b.email}&gt;</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">🏢 Firma / Tlf:</td>
          <td style="padding: 6px 0; color: #ffffff;">${b.company || 'Ikke oppgitt'} · Tlf: ${b.phone || 'Ikke oppgitt'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">📝 Notater:</td>
          <td style="padding: 6px 0; color: #cbd5e1;">${b.notes || 'Ingen spesifisert'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #94a3b8;">🎥 Meet URL:</td>
          <td style="padding: 6px 0;"><a href="${b.meetUrl}" style="color: #6366f1; font-weight: 700;">${b.meetUrl}</a></td>
        </tr>
      </table>
    </div>

    <div style="text-align: center;">
      <a href="${gcalUrl}" style="background: #4285f4; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 10px; margin-bottom: 10px;">
        📅 Oppdater min Google Kalender (1-klikk)
      </a>
      <a href="https://aiappsy.com/admin#bookings" style="background: #6366f1; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; margin-bottom: 10px;">
        Åpne Admin CRM
      </a>
    </div>
  </div>`;

  await sendEmail({
    to: cfg.notificationEmail,
    subject: `🔔 Nytt møte: ${b.name} (${b.company || 'Privat'}) - ${b.date} kl. ${b.hostTime} (Manila)`,
    html: hostHtml,
    icsContent
  });
}

async function sendBookingConfirmedEmails(b) {
  const cfg = loadEmailConfig();
  const icsContent = buildIcsCalendarEvent(b);
  const gcalUrl = getGoogleCalendarUrl(b);

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: #34d399; margin-top: 0;">✓ Møte bekreftet av AIAPPSY</h2>
    <p>Ditt møte med Pål Juritzen er bekreftet for <strong>${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})</strong>.</p>
    <p>Møtelenke: <a href="${b.meetUrl}" style="color: #6366f1; font-weight: bold;">${b.meetUrl}</a></p>
    <div style="margin-top: 20px;">
      <a href="${gcalUrl}" style="background: #4285f4; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        📅 Oppdater Google Kalender
      </a>
    </div>
  </div>`;

  await sendEmail({
    to: b.email,
    subject: `✓ Bekreftet: Møte med AIAPPSY (${b.date} kl. ${b.time})`,
    html,
    icsContent
  });
}

async function sendMeetingReminderEmails(b, type = '24h') {
  const cfg = loadEmailConfig();
  const gcalUrl = getGoogleCalendarUrl(b);
  const is1h = type === '1h' || type === 'manual';

  const visitorSubject = is1h 
    ? `🚨 Starter om 1 time: Ditt møte med AIAPPSY (kl. ${b.time}) - Bli med her`
    : `⏰ Påminnelse: Vårt AI-møte er i morgen kl. ${b.time} (${b.clientTimeZone || 'Oslo'})`;

  const hostSubject = is1h
    ? `🚨 Starter om 1 time: Møte med ${b.name} (kl. ${b.hostTime} Manila / ${b.time} Oslo)`
    : `⏰ Påminnelse: Møte med ${b.name} i morgen kl. ${b.hostTime} (Manila)`;

  const visitorHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 32px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <span style="background: ${is1h ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${is1h ? '#f87171' : '#fbbf24'}; border: 1px solid ${is1h ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">
      ${is1h ? '🚨 STARTER OM 1 TIME' : '⏰ PÅMINNELSE: MØTE I MORGEN'}
    </span>
    <h1 style="color: #ffffff; font-size: 22px; margin: 14px 0 8px;">Ditt møte med AIAPPSY nærmer seg</h1>
    <p style="color: #94a3b8; font-size: 15px; margin: 0 0 20px;">
      Tidspunkt: <strong>${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})</strong>
    </p>

    <div style="background: #131d35; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0 0 14px; font-size: 15px; color: #e2e8f0;">Bli med direkte via Google Meet:</p>
      <a href="${b.meetUrl}" style="background: #10b981; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 900; font-size: 16px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
        🎥 Åpne Google Meet Videomøte nå
      </a>
      <p style="margin: 12px 0 0; font-size: 13px; color: #64748b;">Møtelenke: ${b.meetUrl}</p>
    </div>

    <div style="text-align: center;">
      <a href="${gcalUrl}" style="color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600;">
        📅 Se eller oppdater hendelsen i Google Kalender →
      </a>
    </div>
  </div>`;

  const hostHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 24px 20px; border-radius: 12px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
    <h2 style="color: ${is1h ? '#f87171' : '#fbbf24'}; margin-top: 0;">${is1h ? '🚨 Starter om 1 time' : '⏰ Møte i morgen'}: ${b.name}</h2>
    <p>Klient: <strong>${b.name}</strong> (${b.company || 'Privat'}) &lt;${b.email}&gt;</p>
    <p>Manila-tid: <strong>${b.hostDate || b.date} kl. ${b.hostTime || ''} (${b.hostTimeZone || 'Asia/Manila'})</strong><br>
       Klient-tid: <strong>${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})</strong></p>
    <div style="margin: 20px 0;">
      <a href="${b.meetUrl}" style="background: #10b981; color: #ffffff; padding: 12px 20px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">
        🎥 Bli med i Google Meet (${b.meetUrl})
      </a>
    </div>
  </div>`;

  await Promise.all([
    sendEmail({ to: b.email, subject: visitorSubject, html: visitorHtml, isPing: true }),
    sendEmail({ to: cfg.notificationEmail, subject: hostSubject, html: hostHtml, isPing: true })
  ]);
}

// Background Reminder Cron: Runs every 10 minutes
function checkAndSendMeetingReminders() {
  try {
    const bookings = loadBookings();
    const now = Date.now();
    let updated = false;

    for (const b of bookings) {
      if (b.status === 'cancelled') continue;

      let startUtc = null;
      if (b.utcIso) {
        startUtc = new Date(b.utcIso).getTime();
      } else {
        const tz = b.clientTimeZone || 'Europe/Oslo';
        startUtc = zonedDateTimeToUtc(b.date, b.time, tz).getTime();
      }

      const msDiff = startUtc - now;
      const hoursDiff = msDiff / (1000 * 60 * 60);

      if (!b.remindersSent) b.remindersSent = {};

      // 24-timers påminnelse (trigges mellom 22 og 26 timer før start)
      if (hoursDiff >= 22 && hoursDiff <= 26 && !b.remindersSent.h24) {
        console.log(`[Auto-Reminder] Sender 24t påminnelse for møte ${b.id} (${b.name})`);
        sendMeetingReminderEmails(b, '24h').catch(e => console.error(e));
        b.remindersSent.h24 = new Date().toISOString();
        updated = true;
      }

      // 1-times urgent ping (trigges mellom 0.5 og 1.5 timer før start)
      if (hoursDiff >= 0.5 && hoursDiff <= 1.5 && !b.remindersSent.h1) {
        console.log(`[Auto-Reminder] Sender 1t urgent ping for møte ${b.id} (${b.name})`);
        sendMeetingReminderEmails(b, '1h').catch(e => console.error(e));
        b.remindersSent.h1 = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      saveBookings(bookings);
    }
  } catch (err) {
    console.error('Feil i påminnelsesmotor:', err.message);
  }
}

// Start cron-intervaller
setInterval(checkAndSendMeetingReminders, 10 * 60 * 1000);
setTimeout(checkAndSendMeetingReminders, 4000);

// API: Get Email Settings (Admin protected)
app.get('/api/settings/email', requireAdminAuth, (req, res) => {
  const cfg = loadEmailConfig();
  const obj = {
    enabled: cfg.enabled,
    smtpHost: cfg.smtpHost,
    smtpPort: cfg.smtpPort,
    smtpSecure: cfg.smtpSecure,
    smtpUser: cfg.smtpUser,
    smtpPass: cfg.smtpPass ? '••••••••••••••••' : '',
    smtpPassConfigured: !!cfg.smtpPass,
    notificationEmail: cfg.notificationEmail,
    notifyHostEmail: cfg.notificationEmail,
    autoRemindersEnabled: cfg.enabled,
    senderName: cfg.senderName
  };
  res.json({
    success: true,
    email: obj,
    config: obj
  });
});

// API: Save Email Settings (Admin protected)
app.post('/api/settings/email', requireAdminAuth, (req, res) => {
  const {
    enabled,
    autoRemindersEnabled,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    notificationEmail,
    notifyHostEmail,
    senderName
  } = req.body || {};

  const updates = {};
  if (enabled !== undefined) updates.enabled = !!enabled;
  if (autoRemindersEnabled !== undefined) updates.enabled = !!autoRemindersEnabled;
  if (smtpHost !== undefined && smtpHost.trim() !== '') updates.smtpHost = smtpHost.trim();
  if (smtpPort !== undefined) updates.smtpPort = parseInt(smtpPort, 10);
  if (smtpSecure !== undefined) updates.smtpSecure = !!smtpSecure;
  if (smtpUser !== undefined && smtpUser.trim() !== '') updates.smtpUser = smtpUser.trim().toLowerCase();

  // Strip whitespace if user pasted 16-character Google App Password with spaces ("abcd efgh ijkl mnop")
  if (smtpPass !== undefined) {
    const cleanPass = smtpPass.replace(/\s+/g, '');
    if (cleanPass !== '' && !cleanPass.includes('••')) {
      updates.smtpPass = cleanPass;
    }
  }

  const effectiveNotify = notificationEmail || notifyHostEmail;
  if (effectiveNotify !== undefined && effectiveNotify.trim() !== '') {
    updates.notificationEmail = effectiveNotify.trim();
  }
  if (senderName !== undefined && senderName.trim() !== '') {
    updates.senderName = senderName.trim();
  }

  const saved = saveEmailConfig(updates);
  const obj = {
    enabled: saved.enabled,
    smtpHost: saved.smtpHost,
    smtpPort: saved.smtpPort,
    smtpSecure: saved.smtpSecure,
    smtpUser: saved.smtpUser,
    smtpPassConfigured: !!saved.smtpPass,
    notificationEmail: saved.notificationEmail,
    notifyHostEmail: saved.notificationEmail,
    autoRemindersEnabled: saved.enabled,
    senderName: saved.senderName
  };

  res.json({
    success: true,
    message: 'E-postinnstillinger er lagret!',
    email: obj,
    config: obj
  });
});

// API: Test Email Dispatch (Admin protected)
app.post('/api/test-email', requireAdminAuth, async (req, res) => {
  const { targetEmail, email } = req.body || {};
  const cfg = loadEmailConfig();
  const recipient = (targetEmail || email || cfg.notificationEmail || cfg.smtpUser || 'paljuritzen@gmail.com').trim();

  if (!cfg.smtpPass) {
    return res.status(400).json({
      success: false,
      error: 'Gmail App-passord mangler! Vennligst lim inn ditt 16-tegns Google App Password i feltet og klikk "Lagre E-postoppsett" først.'
    });
  }

  try {
    const result = await sendEmail({
      to: recipient,
      subject: `🧪 Test e-post fra AIAPPSY Meeting Engine (${new Date().toLocaleTimeString('no-NO')})`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 26px; background: #0b0f19; color: #fff; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #1e293b; line-height: 1.6;">
        <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700;">✓ TEST VELLYKKET</span>
        <h2 style="color: #ffffff; margin: 16px 0 8px;">AIAPPSY E-postmotor fungerer utmerket!</h2>
        <p style="color: #cbd5e1; margin: 0 0 16px;">Dette er en bekreftelse på at din Gmail SMTP-tilkobling, Google Kalender-invitasjoner og automatiske møtepåminnelser er 100 % operative.</p>
        <div style="background: #131d35; padding: 14px; border-radius: 8px; font-size: 13px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.06);">
          <div style="margin-bottom: 4px;">Avsender: <strong style="color: #38bdf8;">${cfg.smtpUser}</strong></div>
          <div style="margin-bottom: 4px;">Mottaker: <strong style="color: #a78bfa;">${recipient}</strong></div>
          <div>Tidspunkt: <strong>${new Date().toISOString()}</strong></div>
        </div>
      </div>`
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Feil ved sending via Gmail SMTP.'
      });
    }

    res.json({
      success: true,
      recipient,
      result,
      message: `Test e-post og Google Kalender-oppsett ble sendt via Gmail SMTP til ${recipient}!`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ============================================================================
// PAYMENTS & BILLING HUB (PAYPAL & STRIPE MULTI-GATEWAY ENGINE)
// ============================================================================
const PAYMENTS_FILE = path.join(__dirname, 'payments.json');

const DEFAULT_PAYMENTS_CONFIG = {
  gateways: {
    paypal: {
      enabled: true,
      mode: 'sandbox',
      clientId: '',
      clientSecret: '',
      defaultCurrency: 'NOK',
      webhookId: ''
    },
    stripe: {
      enabled: false,
      mode: 'test',
      publishableKey: '',
      secretKey: '',
      webhookSecret: '',
      defaultCurrency: 'NOK'
    }
  },
  apps: {
    upworkz: {
      name: 'Upworkz',
      enabled: true,
      price: 299,
      currency: 'NOK',
      billingType: 'monthly',
      planName: 'Upworkz Pro',
      acceptedMethods: ['paypal', 'stripe']
    },
    hubzoo: {
      name: 'Hubzoo',
      enabled: false,
      internalOnly: true,
      price: 499,
      currency: 'NOK',
      billingType: 'monthly',
      planName: 'Hubzoo SMB',
      acceptedMethods: ['paypal', 'stripe']
    },
    subsentry: {
      name: 'SubSentry',
      enabled: true,
      price: 199,
      currency: 'NOK',
      billingType: 'monthly',
      planName: 'SubSentry Shield',
      acceptedMethods: ['paypal', 'stripe']
    },
    maxmotion: {
      name: 'MaxMotion AI',
      enabled: true,
      price: 799,
      currency: 'NOK',
      billingType: 'monthly',
      planName: 'MaxMotion Creator',
      acceptedMethods: ['paypal', 'stripe']
    },
    'aistudio-crm': {
      name: 'AI Studio CRM',
      enabled: true,
      price: 1490,
      currency: 'NOK',
      billingType: 'monthly',
      planName: 'AI Studio CRM',
      acceptedMethods: ['paypal', 'stripe']
    },
    'custom-agent': {
      name: 'Turnkey Custom AI Agent',
      enabled: true,
      price: 17800,
      currency: 'NOK',
      billingType: 'one-time',
      planName: 'Turnkey Custom AI Agent',
      acceptedMethods: ['paypal', 'stripe']
    }
  },
  transactions: []
};

function loadPaymentsConfig() {
  try {
    if (fs.existsSync(PAYMENTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
      return {
        gateways: { ...DEFAULT_PAYMENTS_CONFIG.gateways, ...(parsed.gateways || {}) },
        apps: { ...DEFAULT_PAYMENTS_CONFIG.apps, ...(parsed.apps || {}) },
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : []
      };
    }
  } catch (e) {
    console.error('Feil ved lesing av payments.json:', e.message);
  }
  return { ...DEFAULT_PAYMENTS_CONFIG };
}

function savePaymentsConfig(cfg) {
  try {
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Feil ved lagring av payments.json:', e.message);
    return false;
  }
}

// GET /api/payments/settings (Admin-protected: Full config with secrets)
app.get('/api/payments/settings', requireAdminAuth, (req, res) => {
  const cfg = loadPaymentsConfig();
  res.json({ success: true, payments: cfg });
});

// POST /api/payments/settings (Admin-protected: Update gateways and app pricing)
app.post('/api/payments/settings', requireAdminAuth, (req, res) => {
  const { gateways, apps } = req.body || {};
  const current = loadPaymentsConfig();

  if (gateways) {
    if (gateways.paypal) {
      current.gateways.paypal = {
        ...current.gateways.paypal,
        ...gateways.paypal,
        enabled: typeof gateways.paypal.enabled === 'boolean' ? gateways.paypal.enabled : current.gateways.paypal.enabled,
        mode: gateways.paypal.mode === 'live' ? 'live' : 'sandbox',
        clientId: (gateways.paypal.clientId || '').trim(),
        clientSecret: gateways.paypal.clientSecret !== undefined ? gateways.paypal.clientSecret.trim() : current.gateways.paypal.clientSecret,
        defaultCurrency: gateways.paypal.defaultCurrency || 'NOK'
      };
    }
    if (gateways.stripe) {
      current.gateways.stripe = {
        ...current.gateways.stripe,
        ...gateways.stripe,
        enabled: typeof gateways.stripe.enabled === 'boolean' ? gateways.stripe.enabled : current.gateways.stripe.enabled,
        mode: gateways.stripe.mode === 'live' ? 'live' : 'test',
        publishableKey: (gateways.stripe.publishableKey || '').trim(),
        secretKey: gateways.stripe.secretKey !== undefined ? gateways.stripe.secretKey.trim() : current.gateways.stripe.secretKey,
        webhookSecret: (gateways.stripe.webhookSecret || '').trim(),
        defaultCurrency: gateways.stripe.defaultCurrency || 'NOK'
      };
    }
  }

  if (apps && typeof apps === 'object') {
    Object.keys(apps).forEach(appKey => {
      if (current.apps[appKey]) {
        current.apps[appKey] = {
          ...current.apps[appKey],
          ...apps[appKey],
          price_nok: apps[appKey].price_nok !== undefined ? (parseFloat(apps[appKey].price_nok) || 0) : current.apps[appKey].price_nok,
          price_usd: apps[appKey].price_usd !== undefined ? (parseFloat(apps[appKey].price_usd) || 0) : current.apps[appKey].price_usd,
          price: typeof apps[appKey].price === 'number' ? apps[appKey].price : (parseFloat(apps[appKey].price) || current.apps[appKey].price),
          enabled: typeof apps[appKey].enabled === 'boolean' ? apps[appKey].enabled : current.apps[appKey].enabled,
          acceptedMethods: Array.isArray(apps[appKey].acceptedMethods) ? apps[appKey].acceptedMethods : current.apps[appKey].acceptedMethods
        };
      } else {
        current.apps[appKey] = apps[appKey];
      }
    });
  }

  current.updatedAt = new Date().toISOString();
  savePaymentsConfig(current);

  console.log('[Payments Hub] Konfigurasjon oppdatert. PayPal aktiv:', current.gateways.paypal.enabled, 'Stripe aktiv:', current.gateways.stripe.enabled);
  res.json({ success: true, message: 'Betalingsinnstillinger lagret!', payments: current });
});

// GET /api/payments/public-config (Public: Returns only enabled gateways and public keys, NO secrets)
app.get('/api/payments/public-config', (req, res) => {
  const cfg = loadPaymentsConfig();
  const publicGateways = {};

  if (cfg.gateways.paypal && cfg.gateways.paypal.enabled) {
    publicGateways.paypal = {
      enabled: true,
      mode: cfg.gateways.paypal.mode,
      clientId: cfg.gateways.paypal.clientId,
      defaultCurrency: cfg.gateways.paypal.defaultCurrency
    };
  } else {
    publicGateways.paypal = { enabled: false };
  }

  if (cfg.gateways.stripe && cfg.gateways.stripe.enabled) {
    publicGateways.stripe = {
      enabled: true,
      mode: cfg.gateways.stripe.mode,
      publishableKey: cfg.gateways.stripe.publishableKey,
      defaultCurrency: cfg.gateways.stripe.defaultCurrency
    };
  } else {
    publicGateways.stripe = { enabled: false };
  }

  // Filter only enabled apps for checkout with dual currency (NOK/USD)
  const activeApps = {};
  Object.keys(cfg.apps || {}).forEach(k => {
    if (cfg.apps[k] && cfg.apps[k].enabled) {
      const a = cfg.apps[k];
      activeApps[k] = {
        name: a.name,
        price_nok: a.price_nok || a.price || 299,
        price_usd: a.price_usd || Math.round((a.price_nok || a.price || 299) / 10),
        billingType: a.billingType || 'monthly',
        planName_no: a.planName_no || a.planName || (a.name + ' Pro'),
        planName_en: a.planName_en || a.planName || (a.name + ' Pro'),
        title_no: a.title_no || a.name,
        title_en: a.title_en || a.name,
        desc_no: a.desc_no || '',
        desc_en: a.desc_en || '',
        icon: a.icon || '⚡',
        acceptedMethods: a.acceptedMethods || ['paypal', 'stripe']
      };
    }
  });

  res.json({
    success: true,
    gateways: publicGateways,
    apps: activeApps
  });
});

// POST /api/payments/create-order (Public: Initiate payment order)
app.post('/api/payments/create-order', (req, res) => {
  const { appKey, method, customAmount, currency, customerEmail, customerName } = req.body || {};
  const cfg = loadPaymentsConfig();

  const selectedMethod = (method || 'paypal').toLowerCase();
  const gateway = cfg.gateways[selectedMethod];

  if (!gateway || !gateway.enabled) {
    return res.status(400).json({
      success: false,
      error: `Betalingsmetoden ${selectedMethod.toUpperCase()} er for øyeblikket ikke aktivert.`
    });
  }

  let amount = 0;
  let curr = (currency || 'NOK').toUpperCase();
  if (!['NOK', 'USD', 'EUR'].includes(curr)) curr = 'NOK';
  let appName = 'AIAPPSY Tilgang';
  let billingType = 'monthly';

  if (appKey && cfg.apps[appKey]) {
    const a = cfg.apps[appKey];
    appName = a.name;
    billingType = a.billingType || 'monthly';
    let basePrice = 299;
    if (curr === 'USD') {
      basePrice = a.price_usd || Math.round((a.price_nok || a.price || 299) / 10);
    } else if (curr === 'EUR') {
      basePrice = Math.round((a.price_usd || 29) * 0.95);
    } else {
      basePrice = a.price_nok || a.price || 299;
      curr = 'NOK';
    }

    if (customAmount !== undefined && !isNaN(parseFloat(customAmount))) {
      amount = Math.max(0, Math.min(basePrice, parseFloat(customAmount)));
    } else {
      amount = basePrice;
    }
  } else if (customAmount && parseFloat(customAmount) > 0) {
    amount = parseFloat(customAmount);
  } else {
    return res.status(400).json({ success: false, error: 'Ugyldig app eller beløp.' });
  }

  const orderId = selectedMethod + '_ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  res.json({
    success: true,
    orderId,
    method: selectedMethod,
    mode: gateway.mode,
    amount,
    currency: curr,
    appName,
    customerEmail: customerEmail || '',
    customerName: customerName || '',
    message: `Ordre opprettet for ${appName} (${amount} ${curr})`
  });
});

// POST /api/payments/capture-order (Public: Confirm and record completed payment)
app.post('/api/payments/capture-order', (req, res) => {
  const { orderId, method, appKey, amount, currency, customerEmail, customerName, details } = req.body || {};
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Ordre-ID er påkrevd.' });
  }

  const cfg = loadPaymentsConfig();
  const selectedMethod = (method || 'paypal').toLowerCase();

  const txn = {
    id: 'txn_' + Date.now(),
    orderId,
    method: selectedMethod,
    appKey: appKey || 'general',
    appName: (cfg.apps[appKey] && cfg.apps[appKey].name) || appKey || 'Custom Purchase',
    customerEmail: (customerEmail || (details && details.payer && details.payer.email_address) || 'kunde@ukjent.no').trim(),
    customerName: (customerName || (details && details.payer && details.payer.name && (details.payer.name.given_name + ' ' + details.payer.name.surname)) || 'Kunde').trim(),
    amount: parseFloat(amount) || (cfg.apps[appKey] && cfg.apps[appKey].price) || 0,
    currency: currency || (cfg.apps[appKey] && cfg.apps[appKey].currency) || 'NOK',
    status: 'COMPLETED',
    details: details || {},
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(cfg.transactions)) cfg.transactions = [];
  cfg.transactions.unshift(txn);
  savePaymentsConfig(cfg);

  // Sync to CRM Leads
  try {
    const leads = typeof loadLeadsSafe === 'function' ? loadLeadsSafe() : [];
    const existing = leads.find(l => l.email && l.email.toLowerCase() === txn.customerEmail.toLowerCase());
    if (existing) {
      existing.status = 'won';
      if (!existing.notes) existing.notes = [];
      existing.notes.unshift({
        id: 'note_' + Date.now(),
        text: `Betaling fullført via ${txn.method.toUpperCase()}: ${txn.amount} ${txn.currency} for ${txn.appName} (Ordre: ${txn.orderId})`,
        createdAt: new Date().toISOString()
      });
      existing.updatedAt = new Date().toISOString();
      if (typeof saveLeadsSafe === 'function') saveLeadsSafe(leads);
    } else {
      const newLead = {
        id: 'lead_' + Date.now(),
        name: txn.customerName,
        email: txn.customerEmail,
        projectType: `Kunde: ${txn.appName} (${txn.amount} ${txn.currency})`,
        message: `Gjennomført kjøp via ${txn.method.toUpperCase()} for ${txn.appName}. Transaksjon: ${txn.id}`,
        createdAt: new Date().toISOString(),
        status: 'won',
        notes: [{
          id: 'note_' + Date.now(),
          text: `Kjøpte tilgang via ${txn.method.toUpperCase()} (Ordre: ${txn.orderId})`,
          createdAt: new Date().toISOString()
        }],
        communications: []
      };
      leads.unshift(newLead);
      if (typeof saveLeadsSafe === 'function') saveLeadsSafe(leads);
    }
  } catch(err) {
    console.error('Feil ved CRM-kobling av transaksjon:', err.message);
  }

  console.log(`[Payments Hub] Betaling fullført: ${txn.customerName} <${txn.customerEmail}> - ${txn.amount} ${txn.currency} via ${txn.method.toUpperCase()}`);
  res.json({ success: true, message: 'Betaling registrert!', transaction: txn });
});

// POST /api/payments/webhook (Webhook receiver for PayPal and Stripe)
app.post('/api/payments/webhook', (req, res) => {
  const event = req.body || {};
  console.log('[Payments Webhook Mottatt]', event.event_type || event.type || 'Event');
  res.json({ received: true });
});

// ============================================================================
// TRACKING & ANALYTICS SETTINGS
// ============================================================================
const TRACKING_FILE = path.join(__dirname, 'tracking.json');

function loadTrackingConfig() {
  try {
    if (fs.existsSync(TRACKING_FILE)) {
      return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
    }
  } catch(e) {}
  return { ga4_id: '', clarity_id: '' };
}

function saveTrackingConfig(cfg) {
  try {
    fs.writeFileSync(TRACKING_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch(e) {
    return false;
  }
}

// GET tracking config (Public for client injection)
app.get('/api/settings/tracking', (req, res) => {
  res.json({ success: true, tracking: loadTrackingConfig() });
});

// POST save tracking config (Admin protected)
app.post('/api/settings/tracking', requireAdminAuth, (req, res) => {
  const { ga4_id, clarity_id } = req.body || {};
  const cfg = {
    ga4_id: (ga4_id || '').trim(),
    clarity_id: (clarity_id || '').trim(),
    updatedAt: new Date().toISOString()
  };
  saveTrackingConfig(cfg);
  res.json({ success: true, message: 'Sporingsinnstillinger lagret!', tracking: cfg });
});


app.get('/api/auth-check', (req, res) => {
  const customHeader = req.headers['x-admin-password'];
  const authHeader = req.headers['authorization'];
  let pwd = customHeader;
  if (!pwd && authHeader) pwd = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (pwd === ADMIN_PASSWORD) {
    return res.json({ success: true, authorized: true });
  }
  return res.status(401).json({ success: false, authorized: false, error: 'Ugyldig passord' });
});


// API: Hent alle lenker
app.get('/api/links', (req, res) => {
  const links = loadLinks();
  const settings = loadSettings();
  res.json({
    success: true,
    links,
    activeDomain: settings.activeDomain,
    domains: settings.domains,
    count: Object.keys(links).length
  });
});

// API: Opprett eller oppdater lenke (støtter både /api/links og /api/shorten)
function handleCreateOrShortenLink(req, res) {
  const body = req.body || {};
  let { slug, customSlug, url, targetUrl, domain } = body;
  const inputUrl = (url || targetUrl || '').trim();
  let cleanSlug = (slug || customSlug || '').trim().toLowerCase().replace(/^\/+/, '').replace(/[^a-z0-9-_]/g, '');

  if (!inputUrl) {
    return res.status(400).json({ success: false, error: 'Mål-adresse (url) kreves.' });
  }

  let cleanUrl = inputUrl;
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  const links = loadLinks();

  // Generer tilfeldig 5-tegns slug dersom ingen er oppgitt
  if (!cleanSlug) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    do {
      cleanSlug = '';
      for (let i = 0; i < 5; i++) {
        cleanSlug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (links[cleanSlug]);
  }

  const reserved = [
    'api', 'health', 'public', 'assets', 'favicon.ico', 'settings', 'admin', 
    'domains', 'studio', 'custom-development', 'custom-development.html', 
    'portfolio', 'portfolio.html', 'apps', 'articles', 'sitemap.xml', 'robots.txt',
    'generator', 'generator.html'
  ];
  if (reserved.includes(cleanSlug)) {
    return res.status(400).json({ success: false, error: `Kortnavnet "${cleanSlug}" er reservert av systemet.` });
  }

  const settings = typeof loadSettings === 'function' ? loadSettings() : { activeDomain: 'aiappsy.com' };
  const selectedDomain = domain || settings.activeDomain || 'aiappsy.com';

  const isNew = !links[cleanSlug];
  links[cleanSlug] = {
    url: cleanUrl,
    domain: selectedDomain,
    clicks: links[cleanSlug] ? links[cleanSlug].clicks : 0,
    createdAt: links[cleanSlug] ? links[cleanSlug].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveLinks(links, cleanSlug);

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.get('host') || selectedDomain || 'aiappsy.com';
  const shortUrl = `${protocol}://${host}/${cleanSlug}`;

  return res.json({
    success: true,
    message: isNew ? `Kortlenke /${cleanSlug} opprettet!` : `Kortlenke /${cleanSlug} oppdatert!`,
    slug: cleanSlug,
    shortUrl: shortUrl,
    destination: cleanUrl,
    clicks: links[cleanSlug].clicks,
    item: links[cleanSlug]
  });
}

app.post('/api/links', handleCreateOrShortenLink);
app.post('/api/shorten', handleCreateOrShortenLink);

// API: Oppdater spesifikk lenke
app.put('/api/links/:slug', (req, res) => {
  const targetSlug = (req.params.slug || '').trim().toLowerCase().replace(/^\/+/, '');
  const { url, domain } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'Måladresse (url) kreves.' });
  }

  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  const links = loadLinks();
  const settings = loadSettings();
  const existing = links[targetSlug] || {};

  links[targetSlug] = {
    url: cleanUrl,
    domain: domain || existing.domain || settings.activeDomain || 'aiappsy.com',
    clicks: existing.clicks || 0,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveLinks(links, targetSlug);
  res.json({
    success: true,
    message: `Kortlenke /${targetSlug} ble oppdatert!`,
    slug: targetSlug,
    item: links[targetSlug]
  });
});

// API: Slett en lenke
app.delete('/api/links/:slug', (req, res) => {
  const slug = req.params.slug.trim().toLowerCase();
  const links = loadLinks();
  if (!links[slug]) {
    return res.status(404).json({ success: false, error: `Kortlenke /${slug} finnes ikke.` });
  }

  delete links[slug];
  saveLinks(links, slug);
  res.json({ success: true, message: `Kortlenke /${slug} ble slettet.` });
});

// API: Hent domener
app.get('/api/domains', (req, res) => {
  const settings = loadSettings();
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const cloudRunUrl = `${proto}://${host}`;

  res.json({
    success: true,
    activeDomain: settings.activeDomain,
    domains: settings.domains,
    cloudRunUrl,
    serviceName: process.env.CLOUD_RUN_SERVICE || 'aiappsy-link-engine',
    region: process.env.CLOUD_RUN_REGION || 'us-west1'
  });
});

// API: Legg til domene
app.post('/api/domains', (req, res) => {
  const { domain, label, setAsDefault } = req.body;
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ success: false, error: 'Vennligst oppgi et gyldig domenenavn.' });
  }

  const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!cleanDomain || cleanDomain.length < 3 || !cleanDomain.includes('.')) {
    return res.status(400).json({ success: false, error: 'Ugyldig domeneformat. Eksempel: go.aiappsy.no eller mittdomene.no' });
  }

  const settings = loadSettings();
  const existing = settings.domains.find(d => d.domain === cleanDomain);
  const entry = parseDomainEntry(cleanDomain, label, !!setAsDefault);

  if (existing) {
    existing.label = entry.label;
    if (setAsDefault) {
      settings.domains.forEach(d => d.isDefault = false);
      existing.isDefault = true;
      settings.activeDomain = cleanDomain;
    }
  } else {
    if (setAsDefault) {
      settings.domains.forEach(d => d.isDefault = false);
      settings.activeDomain = cleanDomain;
    }
    settings.domains.push(entry);
  }

  saveSettings(settings);
  res.json({
    success: true,
    message: `Domenet ${cleanDomain} er lagret og klart til bruk!`,
    domain: entry,
    activeDomain: settings.activeDomain,
    domains: settings.domains
  });
});

// API: Sett standard domene
app.put('/api/domains/default', (req, res) => {
  const { defaultDomain } = req.body;
  if (!defaultDomain) {
    return res.status(400).json({ success: false, error: 'Ingen domene oppgitt.' });
  }

  const clean = defaultDomain.trim().toLowerCase();
  const settings = loadSettings();
  const match = settings.domains.find(d => d.domain === clean);
  if (!match) {
    return res.status(404).json({ success: false, error: `Domenet ${clean} finnes ikke i listen.` });
  }

  settings.domains.forEach(d => d.isDefault = (d.domain === clean));
  settings.activeDomain = clean;
  saveSettings(settings);

  res.json({
    success: true,
    message: `Standard domene er nå satt til ${clean}`,
    activeDomain: clean,
    domains: settings.domains
  });
});

// API: Slett domene
app.delete('/api/domains/:domain', (req, res) => {
  const targetDomain = req.params.domain.trim().toLowerCase();
  const settings = loadSettings();

  if (settings.domains.length <= 1) {
    return res.status(400).json({ success: false, error: 'Kan ikke slette det eneste gjenværende domenet.' });
  }

  const idx = settings.domains.findIndex(d => d.domain === targetDomain);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: `Domenet ${targetDomain} ble ikke funnet.` });
  }

  settings.domains.splice(idx, 1);
  if (settings.activeDomain === targetDomain) {
    settings.activeDomain = settings.domains[0].domain;
    settings.domains[0].isDefault = true;
  }

  saveSettings(settings);
  res.json({
    success: true,
    message: `Domenet ${targetDomain} ble fjernet`,
    activeDomain: settings.activeDomain,
    domains: settings.domains
  });
});

// API: Hent innstillinger og miljøverdier
app.get('/api/settings', (req, res) => {
  const settings = loadSettings();
  res.json({
    success: true,
    settings
  });
});

// API: Oppdater innstillinger og miljøverdier
app.post('/api/settings', (req, res) => {
  const { serviceName, region, cloudRunUrl, customer, dns, activeDomain } = req.body;
  const settings = loadSettings();

  if (serviceName) settings.serviceName = serviceName.trim();
  if (region) settings.region = region.trim();
  if (cloudRunUrl) settings.cloudRunUrl = cloudRunUrl.trim();
  if (activeDomain) settings.activeDomain = activeDomain.trim();
  if (customer && typeof customer === 'object') {
    settings.customer = { ...settings.customer, ...customer };
  }
  if (dns && typeof dns === 'object') {
    settings.dns = { ...settings.dns, ...dns };
  }

  saveSettings(settings);
  res.json({
    success: true,
    message: 'Systeminnstillinger og verdier er oppdatert og lagret!',
    settings
  });
});

// API: System info
app.get('/api/info', (req, res) => {
  const settings = loadSettings();
  const links = loadLinks();
  res.json({
    service: 'AIAppsy Link Engine',
    version: '1.0.0',
    platform: 'Google Cloud Run',
    region: process.env.CLOUD_RUN_REGION || 'us-west1',
    activeDomain: settings.activeDomain,
    totalLinks: Object.keys(links).length,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// API: Diagnose domene og SSL status
app.get('/api/diagnose-domain', async (req, res) => {
  const dns = require('dns').promises;
  const https = require('https');
  const domain = (req.query.domain || 'aiappsy.com').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  try {
    const aRecords = await dns.resolve4(domain).catch(() => []);
    const cnameRecords = await dns.resolveCname(domain).catch(() => []);

    const httpsStatus = await new Promise((resolve) => {
      const request = https.request(`https://${domain}/`, {
        method: 'HEAD',
        timeout: 2500,
        rejectUnauthorized: false
      }, (resp) => {
        resolve({ connected: true, statusCode: resp.statusCode });
      });
      request.on('error', (err) => {
        resolve({ connected: false, error: err.message, code: err.code });
      });
      request.on('timeout', () => {
        request.destroy();
        resolve({ connected: false, error: 'Tilkobling tidsavbrutt', code: 'ETIMEDOUT' });
      });
      request.end();
    });

    res.json({
      success: true,
      domain,
      aRecords,
      cnameRecords,
      httpsStatus,
      isWorking: httpsStatus.connected,
      help: httpsStatus.connected 
        ? 'Domenet svarer på HTTPS og er operativt!' 
        : `Domenet ${domain} avslutter tilkoblingen (${httpsStatus.error || httpsStatus.code}). Dette forårsaker ERR_CONNECTION_CLOSED i nettleseren inntil Google Cloud Run domain mapping og SSL-sertifikat er ferdig utstedt i Google Cloud Console.`
    });
  } catch (err) {
    res.json({ success: false, domain, error: err.message });
  }
});


// API: Test/Inspiser en kortlenke uten ekstern nettleser-omdirigering
app.get('/api/test-link/:slug', (req, res) => {
  let rawSlug = (req.params.slug || '').trim().replace(/^\/+|\/+$/g, '');
  try { rawSlug = decodeURIComponent(rawSlug); } catch (e) {}
  const slug = rawSlug.toLowerCase();

  const links = loadLinks();
  const item = links[slug];

  if (item && item.url) {
    // Inkrementer klikk
    item.clicks = (item.clicks || 0) + 1;
    item.lastClickedAt = new Date().toISOString();
    saveLinks(links, slug);

    return res.json({
      success: true,
      found: true,
      slug,
      targetUrl: item.url,
      domain: item.domain,
      clicks: item.clicks,
      httpStatus: 302,
      timestamp: new Date().toISOString()
    });
  }

  return res.status(404).json({
    success: false,
    found: false,
    slug,
    error: `Kortlenken /${slug} ble ikke funnet i systemet.`
  });
});

// ============================================================================
// ADMIN AI ASSISTANT & PROACTIVE ACTION ENGINE (COPILOT)
// ============================================================================

// Helper: Call Google Gemini REST API if key is present
function callGeminiApi(apiKey, systemInstruction, userPrompt, history = []) {
  return new Promise((resolve, reject) => {
    const contents = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.content) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    const payload = JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'Gemini API Feil'));
          }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            resolve(text);
          } else {
            resolve('Beklager, mottok ikke noe svar fra Gemini.');
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Tidsavbrudd mot Gemini API'));
    });
    req.write(payload);
    req.end();
  });
}

// GET /api/assistant/insights (Admin protected)
app.get('/api/assistant/insights', requireAdminAuth, (req, res) => {
  try {
    const links = typeof loadLinks === 'function' ? loadLinks() : {};
    const linksList = Object.keys(links);
    let totalClicks = 0;
    linksList.forEach(k => { totalClicks += (links[k].clicks || 0); });

    const campaign = typeof loadCampaign === 'function' ? loadCampaign() : {};
    const bookings = typeof loadBookings === 'function' ? loadBookings() : [];
    const vouchers = typeof loadVouchers === 'function' ? loadVouchers() : [];
    const leads = typeof loadLeadsSafe === 'function' ? loadLeadsSafe() : [];
    const tracking = typeof loadTrackingConfig === 'function' ? loadTrackingConfig() : {};
    const payments = typeof loadPaymentsConfig === 'function' ? loadPaymentsConfig() : DEFAULT_PAYMENTS_CONFIG;

    const uncontactedLeads = leads.filter(l => !l.status || l.status === 'new' || l.status === 'received');
    const activeVouchers = vouchers.filter(v => v.active !== false);
    const pendingBookings = bookings.filter(b => b.status === 'pending');

    const insights = [];

    // 1. Leads
    if (uncontactedLeads.length > 0) {
      insights.push({
        id: 'uncontacted_leads',
        level: 'warning',
        category: 'crm',
        title: `${uncontactedLeads.length} ubehandlede henvendelser krever oppfølging`,
        message: `Siste henvendelse: ${uncontactedLeads[0].name || uncontactedLeads[0].email} (${uncontactedLeads[0].projectType || 'Forespørsel'}). Å svare raskt øker vinnersjansen dramatisk.`,
        actionLabel: 'Åpne Leads & CRM',
        actionPayload: { type: 'open_tab', tab: 'leads' }
      });
    } else {
      insights.push({
        id: 'leads_clean',
        level: 'tip',
        category: 'crm',
        title: 'Alle henvendelser er besvart!',
        message: 'Ingen ubehandlede henvendelser i pipeline akkurat nå. Utmerket kundeservice!',
        actionLabel: 'Se leads-arkiv',
        actionPayload: { type: 'open_tab', tab: 'leads' }
      });
    }

    // 2. Kampanje
    if (!campaign.enabled) {
      insights.push({
        id: 'campaign_disabled',
        level: 'tip',
        category: 'campaign',
        title: 'Ingen aktiv lanseringskampanje på nettsiden',
        message: 'En synlig rabattbanner med 25 % tidsbegrenset rabatt kan øke konvertering på SaaS-appene betydelig.',
        actionLabel: 'Aktiver lanseringsbanner (25% avslag)',
        actionPayload: {
          type: 'update_campaign',
          params: {
            enabled: true,
            headline_no: '🚀 Lanseringstilbud: Få 25% rabatt på alle Pro-abonnementer denne uken!',
            headline_en: '🚀 Launch Offer: Get 25% off all Pro subscriptions this week!',
            cta_text_no: 'Utforsk appene',
            cta_text_en: 'Explore apps',
            cta_url: '/apps/upworkz.html',
            badge_text_no: 'TIDLIG TILGANG',
            badge_text_en: 'EARLY ACCESS',
            discount_percent: 25
          }
        }
      });
    }

    // 3. Betalinger & Gateways
    const isPaypalSandbox = payments.gateways && payments.gateways.paypal && payments.gateways.paypal.mode === 'sandbox';
    if (isPaypalSandbox) {
      insights.push({
        id: 'paypal_sandbox',
        level: 'info',
        category: 'payments',
        title: 'PayPal er satt i Sandbox (Testmodus)',
        message: 'Kunder belastes ikke reelt. Husk å bytte til "Live" før offisiell markedsføring starter.',
        actionLabel: 'Gå til betalingsinnstillinger',
        actionPayload: { type: 'open_tab', tab: 'payments' }
      });
    }

    // 4. Rabattkoder
    if (activeVouchers.length === 0) {
      insights.push({
        id: 'no_vouchers',
        level: 'warning',
        category: 'vouchers',
        title: 'Ingen aktive rabattkoder funnet',
        message: 'Opprett en velkomstrabatt (f.eks. VELKOMMEN20 med 20% rabatt) for å stimulere tidlige bestillinger.',
        actionLabel: 'Opprett VELKOMMEN20 (20%)',
        actionPayload: {
          type: 'create_voucher',
          params: {
            code: 'VELKOMMEN20',
            discountType: 'percent',
            discountValue: 20,
            active: true,
            notes: 'Opprettet automatisk av AI-assistenten'
          }
        }
      });
    }

    // 5. Møtebooking
    if (pendingBookings.length > 0) {
      insights.push({
        id: 'pending_bookings',
        level: 'warning',
        category: 'bookings',
        title: `${pendingBookings.length} ventende møtebooking(er)`,
        message: `Møteforespørsel registrert fra ${pendingBookings[0].name} (${pendingBookings[0].date} kl. ${pendingBookings[0].time}).`,
        actionLabel: 'Bekreft eller håndter møter',
        actionPayload: { type: 'open_tab', tab: 'bookings' }
      });
    }

    // 6. Sporing
    if (!tracking.ga4_id && !tracking.clarity_id) {
      insights.push({
        id: 'missing_tracking',
        level: 'tip',
        category: 'tracking',
        title: 'Webanalyse er ikke aktivert',
        message: 'Legg inn Google Analytics 4 (G-XXXX) eller Microsoft Clarity for å spore besøkende på nettsiden.',
        actionLabel: 'Sett opp sporing',
        actionPayload: { type: 'open_tab', tab: 'tracking' }
      });
    }

    return res.json({
      success: true,
      stats: {
        totalLinks: linksList.length,
        totalClicks,
        campaignActive: !!campaign.enabled,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        totalVouchers: vouchers.length,
        activeVouchers: activeVouchers.length,
        totalLeads: leads.length,
        uncontactedLeads: uncontactedLeads.length,
        paypalMode: payments.gateways && payments.gateways.paypal ? payments.gateways.paypal.mode : 'unknown',
        hasTracking: !!(tracking.ga4_id || tracking.clarity_id)
      },
      insights
    });
  } catch (err) {
    console.error('Feil i assistant insights:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/execute-action (Admin protected)
app.post('/api/assistant/execute-action', requireAdminAuth, async (req, res) => {
  const { type, params = {} } = req.body || {};
  if (!type) {
    return res.status(400).json({ success: false, error: 'Mangler handlingstype (type).' });
  }

  try {
    switch (type) {
      case 'create_voucher': {
        const code = (params.code || 'RABATT' + Math.floor(Math.random()*100)).toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
        const discountType = params.discountType === 'fixed' ? 'fixed' : 'percent';
        const discountValue = parseFloat(params.discountValue) || 10;
        let vouchers = typeof loadVouchers === 'function' ? loadVouchers() : [];
        vouchers = vouchers.filter(v => v.code !== code);
        const newVoucher = {
          code,
          discountType,
          discountValue,
          active: params.active !== false,
          expiryDate: params.expiryDate || null,
          usageLimit: parseInt(params.usageLimit) || null,
          usedCount: 0,
          notes: params.notes || 'Opprettet av AI-assistenten',
          createdAt: new Date().toISOString()
        };
        vouchers.unshift(newVoucher);
        saveVouchers(vouchers);
        return res.json({
          success: true,
          action: 'create_voucher',
          message: `Rabattkoden '${code}' (${discountValue}${discountType === 'percent' ? '%' : ' kr'} avslag) er nå opprettet og aktiv!`,
          voucher: newVoucher
        });
      }

      case 'update_campaign': {
        let campaign = typeof loadCampaign === 'function' ? loadCampaign() : {};
        campaign = { ...campaign, ...params, updatedAt: new Date().toISOString() };
        saveCampaign(campaign);
        return res.json({
          success: true,
          action: 'update_campaign',
          message: `Kampanjebanneret er oppdatert og ${campaign.enabled ? 'AKTIVERT' : 'DEAKTIVERT'}!`,
          campaign
        });
      }

      case 'shorten_link': {
        const url = (params.url || '').trim();
        if (!url) return res.status(400).json({ success: false, error: 'Mangler URL for kortlenke.' });
        const slug = (params.customSlug || params.slug || ('ai' + Math.floor(Math.random()*10000))).toLowerCase().trim();
        const links = loadLinks();
        links[slug] = {
          url,
          createdAt: new Date().toISOString(),
          clicks: 0,
          domain: params.domain || 'aiappsy.com'
        };
        saveLinks(links, slug);
        return res.json({
          success: true,
          action: 'shorten_link',
          message: `Kortlenken https://aiappsy.com/${slug} -> ${url} er opprettet!`,
          shortUrl: `https://aiappsy.com/${slug}`,
          slug,
          targetUrl: url
        });
      }

      case 'update_app_price': {
        const appKey = (params.appKey || '').toLowerCase().trim();
        if (!appKey) return res.status(400).json({ success: false, error: 'Mangler app-nøkkel (f.eks. upworkz).' });
        const price_nok = parseFloat(params.price_nok !== undefined ? params.price_nok : params.price);
        const price_usd = parseFloat(params.price_usd);
        const cfg = loadPaymentsConfig();
        if (!cfg.apps) cfg.apps = {};
        if (!cfg.apps[appKey]) cfg.apps[appKey] = {};
        if (!isNaN(price_nok)) {
          cfg.apps[appKey].price_nok = price_nok;
          cfg.apps[appKey].price = price_nok;
        }
        if (!isNaN(price_usd)) {
          cfg.apps[appKey].price_usd = price_usd;
        }
        savePaymentsConfig(cfg);
        return res.json({
          success: true,
          action: 'update_app_price',
          message: `Prisen for '${appKey}' er oppdatert til kr ${cfg.apps[appKey].price_nok},- NOK og $${cfg.apps[appKey].price_usd || ''} USD!`,
          app: cfg.apps[appKey]
        });
      }

      case 'update_lead_status': {
        const { leadId, status, note } = params;
        if (!leadId) return res.status(400).json({ success: false, error: 'Mangler leadId.' });
        const leads = loadLeadsSafe();
        const idx = leads.findIndex(l => l.id === leadId);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Fant ikke henvendelse med oppgitt ID.' });
        if (status) leads[idx].status = status;
        if (note) {
          if (!leads[idx].notes) leads[idx].notes = [];
          leads[idx].notes.push({ text: note, createdAt: new Date().toISOString() });
        }
        saveLeadsSafe(leads);
        return res.json({
          success: true,
          action: 'update_lead_status',
          message: `Lead '${leads[idx].name || leads[idx].email}' har nå status '${status || leads[idx].status}'.`,
          lead: leads[idx]
        });
      }

      case 'update_tracking': {
        let tr = typeof loadTrackingConfig === 'function' ? loadTrackingConfig() : {};
        if (params.ga4_id !== undefined) tr.ga4_id = params.ga4_id;
        if (params.clarity_id !== undefined) tr.clarity_id = params.clarity_id;
        saveTrackingConfig(tr);
        return res.json({
          success: true,
          action: 'update_tracking',
          message: 'Sporingsinnstillinger er lagret!',
          tracking: tr
        });
      }

      default:
        return res.status(400).json({ success: false, error: `Ukjent handlingstype: ${type}` });
    }
  } catch (err) {
    console.error('Feil ved kjøring av assistant action:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/chat (Admin protected)
app.post('/api/assistant/chat', requireAdminAuth, async (req, res) => {
  const { message = '', history = [], geminiApiKey = '' } = req.body || {};
  const query = message.trim();
  if (!query) {
    return res.status(400).json({ success: false, error: 'Mangler meldingstekst.' });
  }

  const effectiveGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

  try {
    // 1. SEMANTIC INTENT PARSER & ACTION DETECTOR
    const qLower = query.toLowerCase();

    // Intent: Opprett rabattkode
    if ((qLower.includes('rabatt') || qLower.includes('voucher') || qLower.includes('kupong')) && 
        (qLower.includes('lag') || qLower.includes('opprett') || qLower.includes('ny') || qLower.includes('generer') || qLower.includes('sett'))) {
      
      const valMatch = qLower.match(/(\d+)\s*(%|prosent|kr)?/i);
      const val = valMatch ? parseInt(valMatch[1]) : 20;
      const isKr = valMatch && valMatch[2] && (valMatch[2].toLowerCase() === 'kr');
      const discountType = isKr ? 'fixed' : 'percent';

      // Finn kodenavn
      let codeName = '';
      const namedMatch = query.match(/\b(?:som\s+heter|heter|kalt|kodenavn)\s+([A-Za-z0-9_-]+)/i) ||
                         query.match(/\bkode\s+([A-Za-z0-9_-]+)/i);
      if (namedMatch && !['på', 'paa', 'for', 'med', 'til', 'en', 'et'].includes(namedMatch[1].toLowerCase())) {
        codeName = namedMatch[1];
      } else {
        // Let etter ord med store bokstaver eller alfanumeriske koder
        const tokens = query.split(/\s+/);
        for (const tok of tokens) {
          const cleanTok = tok.replace(/[^A-Za-z0-9_-]/g, '');
          if (cleanTok.length >= 3 && !['rabatt', 'rabattkode', 'voucher', 'prosent', 'opprett', 'lag', 'med', 'for', 'paa', 'på', 'til'].includes(cleanTok.toLowerCase()) && !cleanTok.match(/^\d+$/)) {
            codeName = cleanTok;
            break;
          }
        }
      }
      const code = (codeName || ('RABATT' + Math.floor(Math.random()*100))).toUpperCase().trim();

      let vouchers = typeof loadVouchers === 'function' ? loadVouchers() : [];
      vouchers = vouchers.filter(v => v.code !== code);
      const newVoucher = {
        code,
        discountType,
        discountValue: val,
        active: true,
        notes: 'Opprettet via AI Copilot chat',
        createdAt: new Date().toISOString()
      };
      vouchers.unshift(newVoucher);
      saveVouchers(vouchers);

      return res.json({
        success: true,
        reply: `Jeg har opprettet rabattkoden **${code}** med **${val}${discountType === 'percent' ? ' %' : ' kr'} rabatt** for deg! Koden er umiddelbart aktiv i kassen (\`/checkout.html\`).`,
        actionTaken: {
          type: 'create_voucher',
          data: newVoucher
        }
      });
    }

    // Intent: Kampanjebanner aktivering/deaktivering
    if (qLower.includes('kampanje') || qLower.includes('banner')) {
      if (qLower.includes('aktiver') || qLower.includes('slå på') || qLower.includes('start') || qLower.includes('enable')) {
        let campaign = typeof loadCampaign === 'function' ? loadCampaign() : {};
        campaign.enabled = true;
        saveCampaign(campaign);
        return res.json({
          success: true,
          reply: `🚀 **Kampanjebanneret er nå aktivert!** Besøkende på forsiden og app-sidene vil nå se kunngjøringsbanneret ditt øverst.`,
          actionTaken: { type: 'update_campaign', data: campaign }
        });
      }
      if (qLower.includes('deaktiver') || qLower.includes('slå av') || qLower.includes('stopp') || qLower.includes('disable')) {
        let campaign = typeof loadCampaign === 'function' ? loadCampaign() : {};
        campaign.enabled = false;
        saveCampaign(campaign);
        return res.json({
          success: true,
          reply: `⏸️ **Kampanjebanneret er nå deaktivert.** Banneret skjules for besøkende.`,
          actionTaken: { type: 'update_campaign', data: campaign }
        });
      }
    }

    // Intent: Endre pris på en app
    const priceMatch = qLower.match(/(?:sett|endre|oppdater)\s+pris(?:en)?\s+(?:på|for)?\s*([a-z0-9_-]+)\s+til\s+(\d+)\s*(?:nok|kr)?(?:\s+og\s+(\d+)\s*(?:usd|\$)?)?/i);
    if (priceMatch) {
      const appKey = priceMatch[1].toLowerCase();
      const nokPrice = parseInt(priceMatch[2]);
      const usdPrice = priceMatch[3] ? parseInt(priceMatch[3]) : Math.round(nokPrice / 10);
      const cfg = loadPaymentsConfig();
      if (cfg.apps && cfg.apps[appKey]) {
        cfg.apps[appKey].price_nok = nokPrice;
        cfg.apps[appKey].price = nokPrice;
        if (usdPrice) cfg.apps[appKey].price_usd = usdPrice;
        savePaymentsConfig(cfg);
        return res.json({
          success: true,
          reply: `💳 **Prisen for ${cfg.apps[appKey].name || appKey} er oppdatert:**\n- **Norsk pris:** kr ${nokPrice},- / mnd\n- **Internasjonal pris:** $${usdPrice}.00 USD / mo\n\nPrisen er umiddelbart synlig i kasseportalen for nye abonnenter.`,
          actionTaken: { type: 'update_app_price', data: cfg.apps[appKey] }
        });
      }
    }

    // Intent: Forkort lenke
    const shortenMatch = qLower.match(/(?:forkort|lag\s+lenke|kortlenke)\s+(?:for\s+)?(https?:\/\/[^\s]+)(?:\s+(?:med\s+slug|slug)\s+([a-z0-9_-]+))?/i);
    if (shortenMatch) {
      const targetUrl = shortenMatch[1].trim();
      const slug = (shortenMatch[2] || ('ai' + Math.floor(Math.random()*10000))).toLowerCase().trim();
      const links = loadLinks();
      links[slug] = {
        url: targetUrl,
        createdAt: new Date().toISOString(),
        clicks: 0,
        domain: 'aiappsy.com'
      };
      saveLinks(links, slug);
      return res.json({
        success: true,
        reply: `🔗 **Kortlenke opprettet!**\n- **Kort URL:** https://aiappsy.com/${slug}\n- **Mål:** ${targetUrl}\n\nKlikktelling og 302-omdirigering er aktiv.`,
        actionTaken: { type: 'shorten_link', data: { slug, url: targetUrl } }
      });
    }

    // Intent: Helsesjekk / Status oversikt
    if (qLower.includes('status') || qLower.includes('oversikt') || qLower.includes('helsesjekk') || qLower.includes('audit')) {
      const links = typeof loadLinks === 'function' ? loadLinks() : {};
      const leads = typeof loadLeadsSafe === 'function' ? loadLeadsSafe() : [];
      const bookings = typeof loadBookings === 'function' ? loadBookings() : [];
      const vouchers = typeof loadVouchers === 'function' ? loadVouchers() : [];
      const campaign = typeof loadCampaign === 'function' ? loadCampaign() : {};
      const payments = typeof loadPaymentsConfig === 'function' ? loadPaymentsConfig() : DEFAULT_PAYMENTS_CONFIG;
      const uncontacted = leads.filter(l => !l.status || l.status === 'new' || l.status === 'received').length;

      return res.json({
        success: true,
        reply: `📊 **Systemstatus & Nøkkeltall:**\n\n` +
               `• **Kortlenker:** ${Object.keys(links).length} aktive lenker\n` +
               `• **Leads i CRM:** ${leads.length} totalt (${uncontacted} venter på oppfølging)\n` +
               `• **Møtebookinger:** ${bookings.length} registrert\n` +
               `• **Rabattkoder:** ${vouchers.filter(v => v.active !== false).length} aktive koder\n` +
               `• **Kampanjebanner:** ${campaign.enabled ? '🟢 AKTIVT' : '⚪ Ikke aktivt'}\n` +
               `• **PayPal Gateway:** ${payments.gateways?.paypal?.enabled ? '🟢 På' : '🔴 Av'} (${payments.gateways?.paypal?.mode || 'sandbox'})\n\n` +
               (uncontacted > 0 ? `⚠️ *Tips: Du har ${uncontacted} lead(s) som venter på tilbakemelding!*` : `✅ *Alt ser bra ut i systemet!*`),
        actionTaken: null
      });
    }

    // 2. ADVANCED GENERATIVE AI (Gemini) ELLER BUILT-IN KNOWLEDGE BASE
    if (effectiveGeminiKey) {
      const systemInstruction = `Du er AIAppsy Admin Copilot, en ekspert AI-assistent for eieren og administratoren av AIAppsy (https://aiappsy.com).
Du har full kontroll og innsikt over alle administrative funksjoner:
1. Kortlenker og omdirigeringer (slugs, klikksporing, 302 redirects)
2. Markedsføringskampanjer og dynamisk bannermodal (overskrifter på norsk/engelsk, tidsbegrensede rabatter)
3. Møtebooking og kalender (strategimøter, Google Meet-lenker)
4. Rabattkoder og vouchers (prosent/fast kronebeløp, utløpsdatoer, kassevalidering)
5. Artikler, SEO og publisering (genererer automatisk HTML, sitemap.xml oppdatering og sitemap-pinging til Google og Bing)
6. B2B Tilbudsbygger (interaktiv modulpriser, PDF-tilbudsgenerering for nettside-agenter, WhatsApp, RAG og Voice AI)
7. Leads & CRM (kundestatus: ny, kontaktet, tilbud sendt, vunnet, tapt, notater)
8. Sporing & Webanalyse (Google Analytics 4, Microsoft Clarity)
9. Betalinger & Finans (PayPal og Stripe, dual currency NOK og USD for månedlige SaaS-abonnementer).
De 7 porteføljeappene er:
- Upworkz (AI-anbudsarkitekt, kr 299/mnd / $29/mo)
- Hubzoo (Mobiltilbud & CRM, kr 499/mnd / $49/mo)
- SubSentry (Abonnementsvakt, kr 199/mnd / $19/mo)
- MaxMotion AI (Videostudio, kr 799/mnd / $79/mo)
- MediaBunny (WASM-mediebehandling, kr 149/mnd / $14/mo)
- AppSave (Rabatt-utfylling SaaS, kr 99/mnd / $9/mo)
- Manus AI Studio (Bok- og forfatterstudio, kr 599/mnd / $59/mo)
- Skreddersydd AI-agent (engangsleveranse, kr 17 800 / $1 690).

Vær proaktiv, hjelpsom, presis og profesjonell. Gi konkrete svar, anbefalinger og forslag til handlinger. Svar på norsk dersom brukeren skriver norsk.`;

      try {
        const geminiReply = await callGeminiApi(effectiveGeminiKey, systemInstruction, query, history);
        return res.json({
          success: true,
          reply: geminiReply,
          poweredBy: 'gemini-2.5-flash',
          actionTaken: null
        });
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to built-in KB:', geminiErr.message);
      }
    }

    // Built-in intelligent fallback reply
    let kbReply = `Jeg er din **AIAppsy Admin Copilot**. Jeg har full oversikt over alle systemer i kontrollpanelet og kan utføre handlinger direkte for deg!\n\n` +
      `**Hva jeg kan gjøre for deg akkurat nå:**\n` +
      `1. 🏷️ **Rabattkoder:** Skriv *"Lag rabattkode SOMMER20 på 20%"* så oppretter jeg den direkte.\n` +
      `2. 🚀 **Kampanje:** Skriv *"Aktiver kampanjebanner"* for å slå på lanseringsbanneret.\n` +
      `3. 💳 **Priser:** Skriv *"Sett pris på upworkz til 349 nok"* for å justere abonnementsprisen.\n` +
      `4. 🔗 **Kortlenker:** Skriv *"Forkort https://lenke.no med slug min"* for å lage en kortlenke.\n` +
      `5. 📊 **Status:** Skriv *"Status"* for en umiddelbar gjennomgang av leads, bookinger og betalinger.\n\n` +
      `*Tips: Du kan også legge inn din egen Gemini API-nøkkel i Copilot-innstillingene for å aktivere full generativ AI for artikkelskriving, e-postsvar og markedsføringstekster.*`;

    return res.json({
      success: true,
      reply: kbReply,
      poweredBy: 'builtin-action-engine',
      actionTaken: null
    });
  } catch (err) {
    console.error('Feil i assistant chat:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 302 Redirection Engine for short links
app.get('/:slug', (req, res, next) => {
  let rawSlug = (req.params.slug || '').trim().replace(/^\/+|\/+$/g, '');
  try {
    rawSlug = decodeURIComponent(rawSlug);
  } catch (e) {}

  if (!rawSlug) {
    return next();
  }

  const slug = rawSlug.toLowerCase();

  // Ignorer kun faktiske statiske ressurs-filendelser og systemruter
  const staticExtensions = ['.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.css', '.js', '.map', '.json', '.txt', '.xml'];
  const isStaticFile = staticExtensions.some(ext => slug.endsWith(ext));
  const reservedSlugs = [
    'api', 'health', 'public', 'assets', 'favicon.ico', 'admin', 
    'studio', 'custom-development', 'custom-dev', 'portfolio', 
    'apps', 'articles', 'sitemap.xml', 'robots.txt'
  ];
  if (isStaticFile || reservedSlugs.includes(slug)) {
    return next();
  }

  const links = loadLinks();
  const item = links[slug];

  if (item && item.url) {
    // Inkrementer klikkteller
    item.clicks = (item.clicks || 0) + 1;
    item.lastClickedAt = new Date().toISOString();
    saveLinks(links, slug);

    // Videresend query parameters dersom de finnes i forespørselen (f.eks. ?ref=e-post)
    let targetUrl = item.url;
    const qIndex = req.originalUrl.indexOf('?');
    if (qIndex !== -1) {
      const qs = req.originalUrl.substring(qIndex + 1);
      if (qs) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
      }
    }

    console.log(`[302 Redirect Engine] /${slug} -> ${targetUrl} (Total klikk: ${item.clicks})`);

    // Dual redirection: Både HTTP 302 Location-header og HTML Meta-Refresh / JS location.replace
    res.status(302);
    res.set('Location', targetUrl);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.send(`<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <title>Omdirigerer...</title>
  <meta http-equiv="refresh" content="0; url=${encodeURI(targetUrl)}">
  <script>window.location.replace(${JSON.stringify(targetUrl)});</script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
  <div style="background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; text-align: center;">
    <div style="font-size: 20px; font-weight: 800; color: #38bdf8; margin-bottom: 12px;">⚡ AIAppsy Link Engine</div>
    <div style="font-size: 15px; color: #94a3b8; margin-bottom: 16px;">Omdirigerer deg automatisk til:</div>
    <div style="font-family: monospace; background: #0f172a; border: 1px solid #334155; padding: 10px 14px; border-radius: 6px; color: #38bdf8; word-break: break-all; margin-bottom: 20px; font-size: 13px;">${encodeURI(targetUrl)}</div>
    <a href="${encodeURI(targetUrl)}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 20px; border-radius: 6px; font-size: 14px;">Klikk her om du ikke sendes videre</a>
  </div>
</body>
</html>`);
  }

  // 404 Not Found layout hvis slug ikke finnes
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="no">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>404 - Kortlenke ikke funnet | AIAppsy</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { font-size: 24px; font-weight: 800; color: #38bdf8; margin-bottom: 20px; }
        h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px 0; color: #ffffff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }
        .slug-box { font-family: monospace; background: #0f172a; border: 1px solid #334155; padding: 8px 14px; border-radius: 6px; color: #f43f5e; font-size: 15px; display: inline-block; margin-bottom: 24px; }
        .btn { display: inline-flex; align-items: center; justify-content: center; background: #0284c7; color: #ffffff; text-decoration: none; font-weight: 600; padding: 10px 20px; border-radius: 6px; font-size: 14px; }
        .btn:hover { background: #0369a1; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">⚡ AIAppsy Link Engine</div>
        <div class="slug-box">/${slug}</div>
        <h1>Kortlenken finnes ikke</h1>
        <p>Denne omdirigeringen er enten utløpt, slettet eller ikke opprettet ennå.</p>
        <a href="/" class="btn">Gå til Kontrollpanelet</a>
      </div>
    </body>
    </html>
  `);
});

// Serve root index.html
app.get('*', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  const rootIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(rootIndex)) {
    return res.sendFile(rootIndex);
  }
  res.send('AIAppsy Link Engine is active.');
});


// ============================================================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[AIAppsy Link Engine] Kjører på port ${PORT}`);
});
