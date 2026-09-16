/**
 * AIAPPSY Bilingual Engine (EN / NO)
 * Persistent language preference with zero layout shift
 */
(function() {
  function getLang() {
    try {
      var param = new URLSearchParams(window.location.search).get('lang');
      if (param === 'no' || param === 'en') {
        localStorage.setItem('aiappsy_lang', param);
        return param;
      }
      var saved = localStorage.getItem('aiappsy_lang') || localStorage.getItem('userLang');
      if (saved === 'no' || saved === 'en') return saved;
      var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (nav.indexOf('no') === 0 || nav.indexOf('nb') === 0 || nav.indexOf('nn') === 0) return 'no';
    } catch(e) {}
    return 'en';
  }

  function setLang(lang) {
    var html = document.documentElement;
    var body = document.body;
    html.setAttribute('lang', lang);
    if (html.classList) {
      html.classList.remove('lang-en', 'lang-no');
      html.classList.add('lang-' + lang);
    }
    if (body && body.classList) {
      body.classList.remove('lang-en', 'lang-no');
      body.classList.add('lang-' + lang);
    }
    var btns = document.querySelectorAll('.lang-switch-btn');
    btns.forEach(function(b) {
      var flag = b.querySelector('.lang-flag');
      var lbl = b.querySelector('.lang-label');
      if (lang === 'no') {
        if (flag) flag.textContent = '🇬🇧';
        if (lbl) lbl.textContent = 'English';
        b.setAttribute('title', 'Bytt til engelsk / Switch to English');
      } else {
        if (flag) flag.textContent = '🇳🇴';
        if (lbl) lbl.textContent = 'Norsk';
        b.setAttribute('title', 'Bytt til norsk / Switch to Norwegian');
      }
    });
    try {
      localStorage.setItem('aiappsy_lang', lang);
      localStorage.setItem('userLang', lang);
    } catch(e) {}
  }

  window.toggleAiappsyLanguage = function() {
    var current = document.documentElement.getAttribute('lang') || getLang();
    var next = current === 'no' ? 'en' : 'no';
    setLang(next);
  };

  var cur = getLang();
  document.documentElement.setAttribute('lang', cur);
  document.documentElement.classList.add('lang-' + cur);

  function wire() {
    var btns = document.querySelectorAll('.lang-switch-btn');
    btns.forEach(function(b) {
      if (!b.hasAttribute('data-wired')) {
        b.setAttribute('data-wired', 'true');
        b.addEventListener('click', function(e) {
          e.preventDefault();
          window.toggleAiappsyLanguage();
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setLang(cur);
      wire();
    });
  } else {
    setLang(cur);
    wire();
  }
})();
