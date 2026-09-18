const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const LINKS_FILE = path.join(__dirname, 'links.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const LEADS_FILE = path.join(__dirname, 'leads.json');

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
    createdAt: new Date().toISOString()
  };

  bookings.unshift(booking);
  saveBookings(bookings);

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
    message: 'Møtet er bekreftet!',
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

  if (updates.status) booking.status = updates.status;
  if (updates.date) booking.date = updates.date;
  if (updates.time) booking.time = updates.time;
  if (updates.meetUrl) booking.meetUrl = updates.meetUrl;
  if (updates.notes) booking.notes = updates.notes;
  booking.updatedAt = new Date().toISOString();

  saveBookings(bookings);
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

// GET generate .ics calendar invite (Public, Universal UTC)
app.get('/api/bookings/:id/ics', (req, res) => {
  const { id } = req.params;
  const bookings = loadBookings();
  const b = bookings.find(item => item.id === id);
  if (!b) {
    return res.status(404).send('Booking not found');
  }

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

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AIAPPSY//Meeting Scheduler//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${b.id}@aiappsy.com`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:AIAPPSY: ${b.title}`,
    `DESCRIPTION:${b.title}\\n\\nKlienttid: ${b.date} kl. ${b.time} (${b.clientTimeZone || 'Europe/Oslo'})\\nVertstid (Manila): kl. ${b.hostTime || ''} (${b.hostTimeZone || 'Asia/Manila'})\\n\\nMøtelenke: ${b.meetUrl}\\nKontakt: paljuritzen@gmail.com\\nNotater: ${b.notes || 'Ingen'}`,
    `LOCATION:${b.meetUrl}`,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=AIAPPSY Engineering:mailto:paljuritzen@gmail.com',
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${b.name}:mailto:${b.email}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="aiappsy-mote-${b.date}.ics"`);
  res.send(icsContent);
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
