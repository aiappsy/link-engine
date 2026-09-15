// ============================================================================
// AIAPPSY — UNIFIED PRODUCTION SERVER & REDIRECT ENGINE
// Serves the AIAPPSY Homepage, 7 App Landing Pages, Custom Dev, Articles Hub,
// and high-reliability, query-preserving URL redirection on Google Cloud Run.
// ============================================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.STUDIO_PASSWORD || 'aiappsy2026';
const DATA_FILE = path.join(__dirname, 'links.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Default preloaded links
const DEFAULT_LINKS = {
  "apps": {
    "url": "https://saasapps-ai-studio-910579541086.us-west1.run.app",
    "createdAt": "2026-09-05T01:30:42.567Z",
    "clicks": 1
  },
  "hubzoo": {
    "url": "https://hubzoo.ai.studio",
    "createdAt": "2026-09-06T02:09:26.990Z",
    "clicks": 1
  },
  "maxmotion": {
    "url": "https://maxmotion.ai.studio",
    "createdAt": "2026-09-05T01:30:42.568Z",
    "clicks": 0
  },
  "agentur": {
    "url": "https://saasapps-ai-studio-910579541086.us-west1.run.app?ref=agenturer.no",
    "createdAt": "2026-09-05T01:30:42.568Z",
    "clicks": 0
  },
  "saasapps": {
    "url": "https://saasapps-ai-studio-910579541086.us-west1.run.app",
    "createdAt": "2026-09-05T01:32:36.206Z",
    "clicks": 1
  }
};

let linksCache = null;
let saveDebounceTimer = null;

function loadLinks() {
  if (linksCache !== null) return linksCache;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      linksCache = JSON.parse(data);
      return linksCache;
    }
  } catch (err) {
    console.error('CRITICAL: Error reading links file:', err.message);
    if (linksCache) return linksCache;
  }
  // File missing or first start
  linksCache = { ...DEFAULT_LINKS };
  saveLinksAtomic(linksCache);
  return linksCache;
}

function saveLinksAtomic(links) {
  try {
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    fs.writeFileSync(tempFile, JSON.stringify(links, null, 2), 'utf8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('Error saving links atomically:', err);
  }
}

function scheduleSaveLinks() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    if (linksCache) {
      saveLinksAtomic(linksCache);
    }
  }, 400);
}

// Initialize links cache on startup
loadLinks();

// Helper: Parse Cookies
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

// Admin Authorization Middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-admin-password'];
  const cookies = parseCookies(req);
  
  let providedPassword = customHeader;
  
  if (!providedPassword && authHeader) {
    providedPassword = authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  
  if (!providedPassword && (cookies.admin_auth || cookies.studio_auth)) {
    providedPassword = cookies.admin_auth || cookies.studio_auth;
  }

  if (!providedPassword && req.query.key) {
    providedPassword = req.query.key;
  }

  if (providedPassword === ADMIN_PASSWORD) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Invalid or missing administrator password (X-Admin-Password).'
  });
}

// ============================================================================
// APP CTAs FOR ARTICLE INJECTION
// ============================================================================
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
// ADMIN & LINK ENGINE API ENDPOINTS (PROTECTED)
// ============================================================================

// Verify Password / Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.setHeader('Set-Cookie', `admin_auth=${encodeURIComponent(ADMIN_PASSWORD)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    return res.json({ success: true, token: ADMIN_PASSWORD });
  }
  return res.status(401).json({ success: false, error: 'Feil admin-passord.' });
});

// Auth Status Ping
app.get('/api/auth-check', requireAdminAuth, (req, res) => {
  res.json({ success: true, authorized: true });
});

// List All Shortlinks
app.get('/api/links', requireAdminAuth, (req, res) => {
  const links = loadLinks();
  res.json({ success: true, links });
});

// Create Shortlink
app.post('/api/shorten', requireAdminAuth, (req, res) => {
  let { url: targetUrl, customSlug } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ success: false, error: 'Mål-URL er påkrevd' });
  }

  targetUrl = targetUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const links = loadLinks();
  let slug = customSlug ? customSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') : '';

  if (!slug) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    do {
      slug = '';
      for (let i = 0; i < 5; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (links[slug]);
  }

  // Check reserved routes
  const reserved = [
    'api', 'admin', 'studio', 'public', 'assets', 'favicon.ico', 
    'index.html', 'styles.css', 'app.js', 'data.js', 'data_no.js',
    'advisor.js', 'custom-development', 'custom-development.html',
    'sitemap.xml', 'robots.txt'
  ];
  if (reserved.includes(slug)) {
    return res.status(400).json({ success: false, error: 'Dette kortnavnet er reservert av systemet.' });
  }

  links[slug] = {
    url: targetUrl,
    createdAt: new Date().toISOString(),
    clicks: links[slug] ? links[slug].clicks : 0
  };

  saveLinksAtomic(links);

  const shortUrl = `${req.protocol}://${req.get('host')}/${slug}`;
  res.json({ success: true, slug, shortUrl, destination: targetUrl, clicks: links[slug].clicks });
});

// Delete Shortlink
app.delete('/api/links/:slug', requireAdminAuth, (req, res) => {
  const { slug } = req.params;
  const links = loadLinks();
  if (links[slug]) {
    delete links[slug];
    saveLinksAtomic(links);
    return res.json({ success: true, message: 'Lenke slettet' });
  }
  res.status(404).json({ success: false, error: 'Kortlenken finnes ikke' });
});

// Publish Article
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
// ROUTING & STATIC CONTENT
// ============================================================================

// Legacy Subpath Redirect: /saasapps/* -> /*
app.use('/saasapps', (req, res, next) => {
  if (req.path && req.path !== '/' && req.path !== '') {
    return res.redirect(301, req.path);
  }
  next();
});

// Explicit Sitemap & Robots Handlers
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(PUBLIC_DIR, 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(PUBLIC_DIR, 'robots.txt'));
});

// Admin shortcut route
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin', 'index.html'));
});

// Studio shortcut route
app.get(['/studio', '/studio/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'studio.html'));
});

// Static Assets & Webpages (Serves index.html on /, custom-development, articles, apps)
app.use(express.static(PUBLIC_DIR, {
  extensions: ['html', 'htm'],
  maxAge: '1h'
}));

// ============================================================================
// LINK REDIRECT ENGINE (RUNS AFTER STATIC FILES)
// ============================================================================

// 1. Single Segment Redirect: /:slug
app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug.toLowerCase().trim();
  const links = loadLinks();

  if (links[slug]) {
    links[slug].clicks = (links[slug].clicks || 0) + 1;
    scheduleSaveLinks();

    try {
      const targetUrl = new URL(links[slug].url);
      for (const [k, v] of Object.entries(req.query)) {
        targetUrl.searchParams.set(k, v);
      }
      return res.redirect(302, targetUrl.toString());
    } catch (err) {
      let fallback = links[slug].url;
      const qIdx = req.url.indexOf('?');
      if (qIdx !== -1) {
        const qs = req.url.slice(qIdx + 1);
        fallback += (fallback.includes('?') ? '&' : '?') + qs;
      }
      return res.redirect(302, fallback);
    }
  }

  next();
});

// 2. Subpath Redirect: /:slug/* (Forwards subpaths to destination)
app.get('/:slug/*', (req, res, next) => {
  const slug = req.params.slug.toLowerCase().trim();
  const links = loadLinks();

  if (links[slug]) {
    links[slug].clicks = (links[slug].clicks || 0) + 1;
    scheduleSaveLinks();

    try {
      const subpath = req.params[0];
      const targetUrl = new URL(links[slug].url);
      targetUrl.pathname = path.posix.join(targetUrl.pathname, subpath);
      for (const [k, v] of Object.entries(req.query)) {
        targetUrl.searchParams.set(k, v);
      }
      return res.redirect(302, targetUrl.toString());
    } catch (err) {
      return res.redirect(302, links[slug].url);
    }
  }

  next();
});

// 3. Fallback 404 Page
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>404 — Page Not Found | AIAPPSY</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0b0f19; color: #f8fafc; }
          .card { background: #131d35; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 440px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { margin: 0 0 0.5rem; font-size: 2.2rem; color: #f43f5e; }
          p { color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem; }
          a { display: inline-block; background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
          a:hover { background: #4f46e5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>404</h1>
          <p>The requested page or shortlink <strong>${req.path}</strong> was not found.</p>
          <a href="/">Return to AIAPPSY Home</a>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`⚡ AIAPPSY Unified Production Server active on port ${PORT}`);
  console.log(`   • Homepage:        http://localhost:${PORT}/`);
  console.log(`   • Admin Links:     http://localhost:${PORT}/admin`);
  console.log(`   • Article Studio:  http://localhost:${PORT}/studio`);
  console.log(`======================================================`);
});
