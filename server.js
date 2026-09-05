const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'links.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Default preloaded links
const DEFAULT_LINKS = {
  "apps": {
    "url": "https://saasapps-ai-studio-910579541086.us-west1.run.app",
    "createdAt": new Date().toISOString(),
    "clicks": 0
  },
  "hubzoo": {
    "url": "https://hubzoo.ai.studio",
    "createdAt": new Date().toISOString(),
    "clicks": 0
  },
  "maxmotion": {
    "url": "https://maxmotion.ai.studio",
    "createdAt": new Date().toISOString(),
    "clicks": 0
  },
  "agentur": {
    "url": "https://saasapps-ai-studio-910579541086.us-west1.run.app?ref=agenturer.no",
    "createdAt": new Date().toISOString(),
    "clicks": 0
  }
};

function loadLinks() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading links file:', err);
  }
  saveLinks(DEFAULT_LINKS);
  return { ...DEFAULT_LINKS };
}

function saveLinks(links) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(links, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing links file:', err);
  }
}

// Generate random 5-char slug if custom not given
function generateSlug() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let slug = '';
  for (let i = 0; i < 5; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// API: List all links
app.get('/api/links', (req, res) => {
  const links = loadLinks();
  res.json({ success: true, links });
});

// API: Create short link
app.post('/api/shorten', (req, res) => {
  let { url, customSlug } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const links = loadLinks();
  let slug = customSlug ? customSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') : '';

  if (!slug) {
    do {
      slug = generateSlug();
    } while (links[slug]);
  }

  // Check reserved routes
  const reserved = ['api', 'public', 'assets', 'favicon.ico', 'index.html'];
  if (reserved.includes(slug)) {
    return res.status(400).json({ success: false, error: 'That custom slug is reserved. Choose another.' });
  }

  links[slug] = {
    url,
    createdAt: new Date().toISOString(),
    clicks: links[slug] ? links[slug].clicks : 0
  };

  saveLinks(links);

  const shortUrl = `${req.protocol}://${req.get('host')}/${slug}`;
  res.json({ success: true, slug, shortUrl, destination: url, clicks: links[slug].clicks });
});

// API: Delete short link
app.delete('/api/links/:slug', (req, res) => {
  const { slug } = req.params;
  const links = loadLinks();
  if (links[slug]) {
    delete links[slug];
    saveLinks(links);
    return res.json({ success: true, message: 'Link deleted' });
  }
  res.status(404).json({ success: false, error: 'Slug not found' });
});

// REDIRECT ROUTE: /:slug
app.get('/:slug', (req, res, next) => {
  const { slug } = req.params;
  const links = loadLinks();

  if (links[slug]) {
    links[slug].clicks = (links[slug].clicks || 0) + 1;
    saveLinks(links);
    return res.redirect(302, links[slug].url);
  }

  // Not found - show friendly 404 page
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Link Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { margin: 0 0 0.5rem; font-size: 2rem; color: #f43f5e; }
          p { color: #94a3b8; line-height: 1.5; }
          a { display: inline-block; margin-top: 1.5rem; background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
          a:hover { background: #4f46e5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>404</h1>
          <p>Kortlenken <strong>/${slug}</strong> finnes ikke eller er slettet.</p>
          <a href="/">Lag ny kortlenke</a>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`URL Shortener running on http://localhost:${PORT}`);
});
