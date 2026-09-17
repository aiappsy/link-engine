/**
 * AIAPPSY Dynamic Campaign Runner & Analytics Hub
 * 1. Checks /api/campaign and triggers active pop-up campaigns configured from /admin/.
 * 2. Checks /api/settings/tracking and auto-injects GA4 and Microsoft Clarity tags dynamically.
 * 3. Exposes window.aiappsyTrack(eventName, eventParams) for unified conversion tracking.
 */
(function() {
  // Prevent multiple injections
  if (window.__aiappsy_campaign_runner_loaded) return;
  window.__aiappsy_campaign_runner_loaded = true;

  // Global tracking helper
  window.aiappsyTrack = function(eventName, params) {
    params = params || {};
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      }
      if (typeof window.clarity === 'function') {
        window.clarity('event', eventName);
      }
    } catch(e) {}
  };

  // --------------------------------------------------------------------------
  // 1. DYNAMIC TRACKING & ANALYTICS LOADER
  // --------------------------------------------------------------------------
  async function initTracking() {
    try {
      const res = await fetch('/api/settings/tracking?_t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.tracking) return;

      const { ga4_id, clarity_id } = data.tracking;

      // Google Analytics 4 (gtag.js)
      if (ga4_id && ga4_id.trim() && !window.__ga4_injected) {
        window.__ga4_injected = true;
        const gScript = document.createElement('script');
        gScript.async = true;
        gScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4_id.trim());
        document.head.appendChild(gScript);

        window.dataLayer = window.dataLayer || [];
        function gtag(){ window.dataLayer.push(arguments); }
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', ga4_id.trim(), { send_page_view: true });
      }

      // Microsoft Clarity Heatmaps & Session Recording
      if (clarity_id && clarity_id.trim() && !window.__clarity_injected) {
        window.__clarity_injected = true;
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", clarity_id.trim());
      }
    } catch (e) {
      // Quiet fail
    }
  }

  // --------------------------------------------------------------------------
  // 2. DYNAMIC POP-UP CAMPAIGN ENGINE
  // --------------------------------------------------------------------------
  const STORAGE_KEY = 'aiappsy_campaign_dismissed';

  async function initCampaignRunner() {
    // Don't show modal if on admin pages
    if (window.location.pathname.includes('/admin')) return;

    try {
      const res = await fetch('/api/campaign?_t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.campaign || !data.campaign.active) return;

      const camp = data.campaign;

      // Check if dismissed in this session or within last 12h
      const dismissed = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (dismissed && (Date.now() - parseInt(dismissed, 10) < 1000 * 60 * 60 * 12)) {
        return; // Respect user preference
      }

      setupTrigger(camp);
    } catch (e) {
      // Quiet fail - never impact user experience
    }
  }

  function setupTrigger(camp) {
    let triggered = false;

    function fireModal() {
      if (triggered) return;
      triggered = true;
      renderAndShowModal(camp);
      window.aiappsyTrack('campaign_modal_view', { campaign_title: camp.title });
    }

    const triggerType = camp.trigger || 'exit-intent';

    if (triggerType === 'exit-intent') {
      const onMouseLeave = function(e) {
        if (e.clientY <= 15) {
          document.removeEventListener('mouseleave', onMouseLeave);
          fireModal();
        }
      };
      setTimeout(() => {
        document.addEventListener('mouseleave', onMouseLeave);
      }, 2500);
    } else if (triggerType === 'delay') {
      const delayMs = Math.max(2, (camp.delaySeconds || 5)) * 1000;
      setTimeout(fireModal, delayMs);
    } else if (triggerType === 'scroll') {
      const targetPercent = camp.scrollPercent || 50;
      const onScroll = function() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        if (docHeight > 0) {
          const scrolled = (scrollTop / docHeight) * 100;
          if (scrolled >= targetPercent) {
            window.removeEventListener('scroll', onScroll);
            fireModal();
          }
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  function renderAndShowModal(camp) {
    const themeColor = camp.themeColor || '#6366f1';

    // Inject styles
    const style = document.createElement('style');
    style.id = 'aiappsy-live-modal-styles';
    style.textContent = `
      .a-camp-backdrop {
        position: fixed; inset: 0; background: rgba(5, 8, 16, 0.82);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999; padding: 20px;
        opacity: 0; transition: opacity 0.3s ease;
      }
      .a-camp-backdrop.visible { opacity: 1; }
      .a-camp-card {
        background: #0f172a; color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px ${themeColor}25;
        border-radius: 20px; max-width: 500px; width: 100%;
        padding: 36px 32px; position: relative; text-align: center;
        transform: scale(0.92) translateY(10px);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .a-camp-backdrop.visible .a-camp-card {
        transform: scale(1) translateY(0);
      }
      .a-camp-close {
        position: absolute; top: 18px; right: 18px;
        background: rgba(255, 255, 255, 0.08); border: none;
        color: #94a3b8; font-size: 20px; width: 34px; height: 34px;
        border-radius: 50%; cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: all 0.15s ease;
      }
      .a-camp-close:hover {
        background: rgba(255, 255, 255, 0.18); color: #ffffff;
      }
      .a-camp-pill {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 11px; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.06em; padding: 5px 14px; border-radius: 9999px;
        background: ${themeColor}20; color: ${themeColor};
        border: 1px solid ${themeColor}50; margin-bottom: 18px;
      }
      .a-camp-title {
        font-size: 24px; font-weight: 800; line-height: 1.3;
        margin: 0 0 12px 0; color: #ffffff;
      }
      .a-camp-desc {
        font-size: 14px; color: #94a3b8; line-height: 1.6;
        margin: 0 0 24px 0;
      }
      .a-camp-form {
        display: flex; flex-direction: column; gap: 12px;
      }
      .a-camp-input {
        background: #1e293b; border: 1px solid #334155;
        color: #ffffff; padding: 14px 16px; border-radius: 10px;
        font-size: 14px; outline: none; transition: border-color 0.2s;
        text-align: center;
      }
      .a-camp-input:focus {
        border-color: ${themeColor}; box-shadow: 0 0 0 3px ${themeColor}30;
      }
      .a-camp-btn {
        background: ${themeColor}; color: #ffffff; border: none;
        padding: 14px 24px; border-radius: 10px; font-weight: 700;
        font-size: 15px; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 4px 16px ${themeColor}40;
      }
      .a-camp-btn:hover {
        opacity: 0.92; transform: translateY(-1px);
      }
      .a-camp-note {
        font-size: 12px; color: #64748b; margin-top: 14px;
      }
      .a-camp-badge-dot {
        width: 6px; height: 6px; border-radius: 50%; background: ${themeColor};
      }
    `;
    document.head.appendChild(style);

    // Create Modal Elements
    const backdrop = document.createElement('div');
    backdrop.className = 'a-camp-backdrop';
    backdrop.innerHTML = `
      <div class="a-camp-card">
        <button class="a-camp-close" aria-label="Lukk">&times;</button>
        <div class="a-camp-content-area">
          <div class="a-camp-pill">
            <span class="a-camp-badge-dot"></span>
            <span>${escapeHtml(camp.badge || 'KAMPANJE')}</span>
          </div>
          <h3 class="a-camp-title">${escapeHtml(camp.title || 'Spesialtilbud fra AIAPPSY')}</h3>
          <p class="a-camp-desc">${escapeHtml(camp.desc || 'Få personlig oppfølging og skreddersydd tilbud levert direkte til din innboks.')}</p>
          <form class="a-camp-form">
            <input type="email" class="a-camp-input" placeholder="Skriv inn din e-postadresse..." required autofocus />
            <button type="submit" class="a-camp-btn">${escapeHtml(camp.buttonText || 'Motta tilbud nå →')}</button>
          </form>
          <div class="a-camp-note">🔒 Ingen spam. Kun direkte kontakt fra senior AI-ingeniør.</div>
        </div>
        <div class="a-camp-success" style="display: none; padding: 20px 0;">
          <div style="font-size: 40px; margin-bottom: 12px;">🎉</div>
          <h3 style="font-size: 22px; font-weight: 800; margin-bottom: 8px;">Tusen takk!</h3>
          <p style="color: #94a3b8; font-size: 14px;">Vi har mottatt din forespørsel og kontakter deg straks.</p>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      backdrop.classList.add('visible');
    });

    // Close logic
    function closeModal() {
      sessionStorage.setItem(STORAGE_KEY, Date.now().toString());
      backdrop.classList.remove('visible');
      setTimeout(() => {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (style.parentNode) style.parentNode.removeChild(style);
      }, 350);
    }

    backdrop.querySelector('.a-camp-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Form submit handler
    const form = backdrop.querySelector('.a-camp-form');
    const input = backdrop.querySelector('.a-camp-input');
    const contentArea = backdrop.querySelector('.a-camp-content-area');
    const successArea = backdrop.querySelector('.a-camp-success');
    const btn = backdrop.querySelector('.a-camp-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;

      btn.disabled = true;
      btn.textContent = 'Sender...';

      try {
        await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Pop-Up Lead',
            email: email,
            projectType: 'Kampanje: ' + (camp.title || 'Generell'),
            message: 'Registrert via popup-kampanje på ' + window.location.pathname
          })
        });

        window.aiappsyTrack('campaign_lead_converted', { campaign_title: camp.title, email: email });

        contentArea.style.display = 'none';
        successArea.style.display = 'block';

        // Auto-close after 3 seconds
        setTimeout(closeModal, 3000);
      } catch (err) {
        contentArea.style.display = 'none';
        successArea.style.display = 'block';
        setTimeout(closeModal, 2500);
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function startAll() {
    initTracking();
    initCampaignRunner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAll);
  } else {
    startAll();
  }
})();
