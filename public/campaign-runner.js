/**
 * AIAPPSY Dynamic Campaign Runner
 * Automatically checks /api/campaign and triggers active pop-up campaigns
 * with real-time settings configured from /admin/.
 */
(function() {
  // Prevent multiple injections
  if (window.__aiappsy_campaign_runner_loaded) return;
  window.__aiappsy_campaign_runner_loaded = true;

  // Don't show modal if on admin pages
  if (window.location.pathname.includes('/admin')) return;

  const STORAGE_KEY = 'aiappsy_campaign_dismissed';

  async function initCampaignRunner() {
    try {
      const res = await fetch('/api/campaign?_t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.campaign || !data.campaign.active) return;

      const camp = data.campaign;

      // Check if dismissed in this session or within last 24h
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
    }

    const triggerType = camp.trigger || 'exit-intent';

    if (triggerType === 'exit-intent') {
      const onMouseLeave = function(e) {
        if (e.clientY <= 15) {
          document.removeEventListener('mouseleave', onMouseLeave);
          fireModal();
        }
      };
      // Only attach after 3 seconds on page to prevent accidental early trigger
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
        filter: brightness(1.1); transform: translateY(-1px);
      }
      .a-camp-success {
        display: none; padding: 20px; text-align: center;
      }
      .a-camp-success-icon {
        font-size: 44px; margin-bottom: 12px;
      }
    `;
    document.head.appendChild(style);

    // Create Modal Elements
    const backdrop = document.createElement('div');
    backdrop.className = 'a-camp-backdrop';
    backdrop.innerHTML = `
      <div class="a-camp-card" role="dialog" aria-modal="true">
        <button class="a-camp-close" aria-label="Lukk">&times;</button>
        <div class="a-camp-content-area">
          <div class="a-camp-pill">${escapeHtml(camp.badge || '⚡ TILBUD')}</div>
          <h2 class="a-camp-title">${escapeHtml(camp.title || 'Spesialtilbud')}</h2>
          <p class="a-camp-desc">${escapeHtml(camp.subtitle || '')}</p>
          <form class="a-camp-form">
            <input type="email" class="a-camp-input" placeholder="${escapeHtml(camp.inputPlaceholder || 'Din e-postadresse...')}" required autocomplete="email" />
            <button type="submit" class="a-camp-btn">${escapeHtml(camp.ctaText || 'Motta tilbud nå →')}</button>
          </form>
        </div>
        <div class="a-camp-success">
          <div class="a-camp-success-icon">🎉</div>
          <h3 style="font-size: 20px; margin: 0 0 8px 0; color: #ffffff;">Takk! Sjekk innboksen din.</h3>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">Vi har sendt informasjonen til din e-postadresse.</p>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Trigger visible animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backdrop.classList.add('visible');
      });
    });

    function closeModal() {
      backdrop.classList.remove('visible');
      sessionStorage.setItem(STORAGE_KEY, Date.now().toString());
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCampaignRunner);
  } else {
    initCampaignRunner();
  }
})();
