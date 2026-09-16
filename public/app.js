// ============================================================================
// AI APPS PORTFOLIO - CONTROLLER FOR CENTERED WHITELABEL CARDS
// Full bilingual support (English & Norwegian Bokmål localized)
// ============================================================================

(function () {
  'use strict';

  // State
  let currentLang = localStorage.getItem('aiappsy_lang') || localStorage.getItem('ai_showcase_lang') || localStorage.getItem('userLang') || 'en';
  let currentCategory = 'all';
  let activeAppId = null;

  // UI Strings dictionary for interface elements
  const UI_STRINGS = {
    en: {
      flag: '🇳🇴',
      switchLabel: 'Norsk',
      headerInquiry: 'Whitelabel Licensing Guide',
      brandSubtitle: 'Turnkey SaaS Marketplace & Whitelabel Hub',
      heroTag: 'Turnkey SaaS Business Portfolio',
      heroH2: 'Own & Operate Your Own <span class="highlight">AI SaaS Business</span> This Weekend.',
      heroIntro: '<strong>Zero technical ability, coding skills, or SaaS experience needed.</strong> We take care of everything behind the scenes—including high-speed cloud hosting, database management, 24/7 technical support, and continuous frontier AI model upgrades.',
      promiseBadge: "✨ WHAT'S ALWAYS INCLUDED IN EVERY LICENSE",
      promiseP1Title: '100% Turnkey Whitelabel',
      promiseP1Desc: 'Your brand, your custom logo, and your color scheme.',
      promiseP2Title: 'Custom Domain & SSL',
      promiseP2Desc: 'Fully configured on your domain (e.g. app.yourbrand.com).',
      promiseP3Title: 'Dedicated Custom Hours Included',
      promiseP3Desc: 'Tailored onboarding, branding adjustments & prompt tuning.',
      promiseP4Title: 'Hands-Off Cloud & Tech Support',
      promiseP4Desc: 'We manage servers, databases, security patches & uptime.',
      promiseFooter: '➕ Need bespoke features or custom ERP integrations later? Flexible add-ons are available at <strong>very reasonable, transparent prices</strong>.',
      trust1: 'Zero Technical Skill Needed',
      trust2: 'Whitelabel, Domain & Custom Hours Included',
      trust3: '80% to 95% Gross Margins',
      trust4: 'Fully Managed Hosting & Tech Support',
      filterAll: 'All 7 Platforms',
      filterSales: 'Sales & CRM',
      filterMedia: 'AI Video & Media',
      filterSaas: 'SaaS & FinTech',
      filterAgents: 'Autonomous Agents',
      btnLearnMore: 'Learn More',
      btnTechStack: 'Tech Stack',
      btnLaunchApp: 'Launch App',
      btnOpenApp: 'Open App',
      tabOverview: '🌟 Executive Overview',
      tabFeatures: '⚡ Core Superpowers',
      tabBenefits: '📈 User & Business ROI',
      tabWhitelabel: '💼 Whitelabel Operator Hub',
      featuresHeading: 'Core Functions & Automated Capabilities',
      benefitsHeading: 'Tangible User & Commercial Benefits',
      operatorHeading: 'Whitelabel Operator & Monetization Potential',
      modelsHeading: 'Turnkey Ownership & Licensing Models (BizBox Framework)',
      estRevenueHeading: 'Estimated Monthly Operator Revenue',
      btnInquireLicensing: 'Inquire About Licensing',
      md2Sub: 'Durability, Cloud Infrastructure & Continuous Evolution',
      md2DurableHeading: 'Why This Platform Is Strong, Resilient & Durable',
      md2EvolHeading: '⚡ Continuous Evolution Protocol: Staying Ahead of AI',
      inquiryTitle: 'Whitelabel Licensing Request',
      inquirySubtitle: 'Select your software of interest and desired licensing tier. We will provide staging access, exact margin calculations, and turnkey launch documentation.',
      lblTargetPlatform: 'Target Platform',
      lblLicensingModel: 'Licensing Model (BizBox Framework)',
      tier1Opt: 'Tier 1: Non-Exclusive Turnkey Whitelabel (Keep 100% MRR)',
      tier2Opt: 'Tier 2: Monthly Lease with 70% Purchase Equity Credit',
      tier3Opt: 'Tier 3: Master Buyout with Full Source Code IP Transfer',
      lblNameCompany: 'Your Name & Company',
      lblWorkEmail: 'Work Email',
      lblWhereFound: 'Where did you find us?',
      templatesTab: 'Templates',
      templatesFilterBtn: 'Templates (50+)',
      templatesModalTitle: 'Templates & Custom Solutions',
      templatesModalSub: 'Over 50 other architectures available upon inquiry',
      templatesBadge: '✨ 50+ OTHER TEMPLATES AVAILABLE',
      templatesHeadline: 'Can\'t find any apps of interest? We have more than 50 other templates ready to be tailored to you.',
      templatesIntroP1: 'If you cannot find any apps of interest among the ones currently displayed, we have <strong>more than 50 other templates that are not currently online</strong>.',
      templatesIntroP2: 'These can be set up with your own requirements in a short time to accommodate exactly what you want to create.',
      tplPill1: 'Zero technical skills needed',
      tplPill2: '100% your own brand & domain',
      tplPill3: 'Fast setup to your specs',
      tplPill4: 'Hosting & tech support handled',
      tplInqTitle: 'Inquire About Our 50+ Templates',
      tplInqDesc: 'Tell us a few words about what you want to create or the industry you are targeting. We will match your requirements with our private template repository and get back to you with exact options.',
      tplBtnEnquireText: 'Enquire About Templates',
      customTemplateOpt: '📁 Templates (50+ Offline Library / Custom Build)',
      optSelectSource: 'Please select an option...',
      sourceOptions: [
        { value: '', text: 'Please select an option...', disabled: true },
        { value: 'Agenturer.no', text: 'Agenturer.no' },
        { value: 'Google / Web Search', text: 'Google / Web Search' },
        { value: 'LinkedIn', text: 'LinkedIn' },
        { value: 'Twitter / X', text: 'Twitter / X' },
        { value: 'AI Studio / Google AI Showcase', text: 'AI Studio / Google AI Showcase' },
        { value: 'Direct Referral / Recommendation', text: 'Direct Referral / Recommendation' },
        { value: 'SaaS Directory / Product Hunt', text: 'SaaS Directory / Product Hunt' },
        { value: 'Other', text: 'Other' }
      ],
      lblNotes: 'Audience or Target Launch Goals',
      phNotes: 'Tell us about your client base, existing agency traffic, or specific integrations...',
      btnSubmitInquiry: 'Request Whitelabel Prospectus',
      submittingText: 'Opening Email Client...',
      alertSent: 'Thank you! Your email client has been opened with your inquiry pre-addressed to paljuritzen@gmail.com.',
      inquireFor: 'Inquire for'
    },
    no: {
      flag: '🇬🇧',
      switchLabel: 'English',
      headerInquiry: 'Lisens- & Whitelabelguide',
      brandSubtitle: 'Nøkkelferdige SaaS-virksomheter & Whitelabel Hub',
      heroTag: 'Ferdige KI-baserte SaaS-virksomheter',
      heroH2: 'Start din egen <span class="highlight">KI-baserte SaaS-virksomhet</span> – helt uten teknisk innsikt.',
      heroIntro: 'Hvorfor bruke måneder og store summer på å utvikle programvare fra bunnen? Her overtar du ferdigtestede, operative KI-plattformer som er klare for markedet. Du setter ditt eget navn på løsningen og beholder alle kundeinntektene selv. Vi tar oss av alt det tekniske bak kulissene: drift, servere, kundestøtte og løpende modelloppdateringer.',
      promiseBadge: '✨ DETTE ER ALLTID INKLUDERT I ALLE LISENSER',
      promiseP1Title: '100% din egen merkevare',
      promiseP1Desc: 'Plattformen leveres fiks ferdig med din logo, dine farger og din profil.',
      promiseP2Title: 'Ditt eget domene & SSL',
      promiseP2Desc: 'Ferdig koblet opp på din nettadresse (f.eks. app.dinbedrift.no).',
      promiseP3Title: 'Inkluderte tilpasningstimer',
      promiseP3Desc: 'Vi bistår med oppsett, justeringer og tilpassing av systemet til din målgruppe.',
      promiseP4Title: 'Ferdig drift og teknisk support',
      promiseP4Desc: 'Null teknisk hodebry for deg — vi passer på oppetid, sikkerhet og vedlikehold.',
      promiseFooter: '➕ Trenger du spesielle integrasjoner eller funksjoner underveis? Skreddersøm og tilleggsmoduler ordner vi til <strong>svært rimelige og forutsigbare priser</strong>.',
      trust1: 'Null teknisk innsikt påkrevd',
      trust2: 'Eget domene, merkevare & tilpasningstimer inkludert',
      trust3: '80 % til 95 % bruttofortjeneste',
      trust4: 'Fullt administrert drift & teknisk kundestøtte',
      filterAll: 'Alle 7 Plattformene',
      filterSales: 'Salg & Kundedialog',
      filterMedia: 'Video & Innholdsproduksjon',
      filterSaas: 'Økonomi & Finansteknologi',
      filterAgents: 'Autonome Handlingsagenter',
      btnLearnMore: 'Les mer om løsningen',
      btnTechStack: 'Teknisk arkitektur',
      btnLaunchApp: 'Prøv løsningen',
      btnOpenApp: 'Åpne løsningen',
      tabOverview: '🌟 Oversikt & Løsning',
      tabFeatures: '⚡ Kjernefunksjoner',
      tabBenefits: '📈 Konkret Verdi for Kjøper',
      tabWhitelabel: '💼 Forretningsmodell & Inntjening',
      featuresHeading: 'Hva systemet gjør automatisk',
      benefitsHeading: 'Konkrete gevinster for bedriften som bruker det',
      operatorHeading: 'Inntjeningsmuligheter for deg som eier eller byrå',
      modelsHeading: 'Våre eier- og lisensmodeller (BizBox-rammeverket)',
      estRevenueHeading: 'Beregnet månedlig inntektspotensial',
      btnInquireLicensing: 'Ta en uforpliktende prat om lisensiering',
      md2Sub: 'Oppetid, skyinfrastruktur og kontinuerlige modelloppdateringer',
      md2DurableHeading: 'Hvorfor denne plattformen er driftssikker, robust og fremtidsrettet',
      md2EvolHeading: '⚡ Kontinuerlig teknologiutvikling: Alltid i tet på ny KI',
      inquiryTitle: 'Forespørsel om Whitelabel-samarbeid',
      inquirySubtitle: 'Velg plattformen du vil satse på og ønsket lisensform. Vi sender deg staging-tilgang, kalkyler og lanseringsmateriell.',
      lblTargetPlatform: 'Hvilken løsning vil du satse på?',
      lblLicensingModel: 'Ønsket lisens- eller eiermodell',
      tier1Opt: 'Nøkkelferdig oppstart under eget navn (Behold 100% av inntektene)',
      tier2Opt: 'Leie-til-eie modell (70% av leien godskrives fremtidig kjøp)',
      tier3Opt: 'Fullt oppkjøp av kildekode og opphavsrett',
      lblNameCompany: 'Ditt navn og eventuelt firmanavn',
      lblWorkEmail: 'Arbeids-e-post',
      lblWhereFound: 'Hvor hørte du om oss?',
      templatesTab: 'Maler',
      templatesFilterBtn: 'Maler (50+)',
      templatesModalTitle: 'Maler & Skreddersøm',
      templatesModalSub: 'Over 50 andre arkitekturer tilgjengelig ved forespørsel',
      templatesBadge: '✨ OVER 50 ANDRE MALER TILGJENGELIG',
      templatesHeadline: 'Finner du ingen apper av interesse? Vi har over 50 andre maler klare til å tilpasses deg.',
      templatesIntroP1: 'Finner du ingen apper av interesse blant de som vises her? Vi har <strong>over 50 andre maler som for øyeblikket ikke ligger på nett</strong>.',
      templatesIntroP2: 'Disse kan settes opp og tilpasses etter dine nøyaktige krav på kort tid, slik at du får akkurat det du ønsker å skape.',
      tplPill1: 'Null teknisk kompetanse nødvendig',
      tplPill2: '100 % ditt eget navn og domene',
      tplPill3: 'Raskt oppsett etter dine krav',
      tplPill4: 'Full drift & tech support inkludert',
      tplInqTitle: 'Forespørsel om våre 50+ maler',
      tplInqDesc: 'Fortell oss litt om hva du ønsker å skape eller hvilken bransje du sikter mot. Vi finner den rette malen i vårt arkiv og tar kontakt med konkrete forslag.',
      tplBtnEnquireText: 'Send forespørsel om maler',
      customTemplateOpt: '📁 Maler (50+ i arkivet / Skreddersøm)',
      optSelectSource: 'Vennligst velg et alternativ...',
      sourceOptions: [
        { value: '', text: 'Vennligst velg et alternativ...', disabled: true },
        { value: 'Agenturer.no', text: 'Agenturer.no' },
        { value: 'Google / Nettsøk', text: 'Google / Nettsøk' },
        { value: 'LinkedIn', text: 'LinkedIn' },
        { value: 'Twitter / X', text: 'Twitter / X' },
        { value: 'Direkte anbefaling / Referanse', text: 'Direkte anbefaling / Referanse' },
        { value: 'AI Studio / Google AI Showcase', text: 'AI Studio / Google AI Showcase' },
        { value: 'Bransjekatalog / Annet', text: 'Bransjekatalog / Annet' }
      ],
      lblNotes: 'Hvem er målgruppen din eller hva er lanseringsplanen?',
      phNotes: 'Fortell gjerne litt om bransjen du jobber mot, eksisterende kundebase eller spesielle ønsker...',
      btnSubmitInquiry: 'Send uforpliktende forespørsel',
      submittingText: 'Åpner e-postprogrammet ditt...',
      alertSent: 'Takk! E-postprogrammet ditt er åpnet med en ferdig utfylt forespørsel adressert til paljuritzen@gmail.com.',
      inquireFor: 'Forespørsel for'
    }
  };

  function getDataset() {
    return currentLang === 'no' ? window.APPS_DATA_NO : window.APPS_DATA;
  }

  // DOM Elements
  const cardsContainer = document.getElementById('cards-container');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const btnTopInquiry = document.getElementById('btn-top-inquiry');
  const btnLangToggle = document.getElementById('btn-lang-toggle');
  const langFlag = document.getElementById('lang-flag');
  const langLabel = document.getElementById('lang-label');

  // Modal 1: Deep Dive
  const modalDeepdive = document.getElementById('modal-deepdive');
  const btnCloseMd1 = document.getElementById('btn-close-md1');
  const md1Icon = document.getElementById('md1-icon');
  const md1Title = document.getElementById('md1-title');
  const md1Url = document.getElementById('md1-url');
  const md1DirectLink = document.getElementById('md1-direct-link');
  const md1Tabs = document.querySelectorAll('.modal-tab');
  const md1Panes = document.querySelectorAll('.modal-pane');
  const md1Headline = document.getElementById('md1-headline');
  const md1Story = document.getElementById('md1-story');
  const md1FeaturesGrid = document.getElementById('md1-features-grid');
  const md1BenefitsGrid = document.getElementById('md1-benefits-grid');
  const md1OperatorPitch = document.getElementById('md1-operator-pitch');
  const md1LicensingGrid = document.getElementById('md1-licensing-grid');
  const md1RevenueText = document.getElementById('md1-revenue-text');
  const btnModalInquireTrigger = document.getElementById('btn-modal-inquire-trigger');

  // Modal 2: Tech Stack
  const modalTechstack = document.getElementById('modal-techstack');
  const btnCloseMd2 = document.getElementById('btn-close-md2');
  const md2Title = document.getElementById('md2-title');
  const md2Headline = document.getElementById('md2-headline');
  const md2Summary = document.getElementById('md2-summary');
  const md2ChipsList = document.getElementById('md2-chips-list');
  const md2DurabilityGrid = document.getElementById('md2-durability-grid');
  const md2EvolutionText = document.getElementById('md2-evolution-text');

  // Modal: Templates Inquiry
  const modalTemplates = document.getElementById('modal-templates');
  const btnCloseTemplates = document.getElementById('btn-close-templates');
  const btnTemplatesTab = document.getElementById('btn-templates-tab');
  const filterBtnTemplates = document.getElementById('filter-btn-templates');
  const btnTemplatesEnquireNow = document.getElementById('btn-templates-enquire-now');

  // Modal 3: Inquiry
  const modalInquiry = document.getElementById('modal-inquiry');
  const btnCloseInquiry = document.getElementById('btn-close-inquiry');
  const formAppSelect = document.getElementById('form-app-select');
  const inquiryForm = document.getElementById('inquiry-form');

  function init() {
    applyLanguageUI();
    renderCards();
    setupEventListeners();
  }

  function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'no' : 'en';
    localStorage.setItem('aiappsy_lang', currentLang);
    localStorage.setItem('ai_showcase_lang', currentLang);
    localStorage.setItem('userLang', currentLang);
    applyLanguageUI();
    renderCards();
    if (window.updateAdvisorLanguage) {
      window.updateAdvisorLanguage(currentLang);
    }
  }

  function applyLanguageUI() {
    const s = UI_STRINGS[currentLang];

    document.documentElement.className = (document.documentElement.className.replace(/\blang-(no|en)\b/g, '') + ' lang-' + currentLang).trim();
    document.documentElement.setAttribute('lang', currentLang);
    
    if (langFlag) langFlag.textContent = s.flag;
    if (langLabel) langLabel.textContent = s.switchLabel;

    const brandSub = document.querySelector('.brand-meta span');
    if (brandSub) brandSub.textContent = s.brandSubtitle;

    const txtHeaderInquiry = document.getElementById('txt-header-inquiry');
    if (txtHeaderInquiry) txtHeaderInquiry.textContent = s.headerInquiry;

    const heroPill = document.querySelector('.hero-pill-tag span:last-child');
    if (heroPill) heroPill.textContent = s.heroTag;

    const heroH2 = document.querySelector('.hero-centered h2');
    if (heroH2) heroH2.innerHTML = s.heroH2;

    const heroIntro = document.querySelector('.hero-intro-text');
    if (heroIntro) heroIntro.innerHTML = s.heroIntro;

    const promiseBadge = document.querySelector('.promise-highlight-badge');
    if (promiseBadge) promiseBadge.textContent = s.promiseBadge;

    const promiseItems = document.querySelectorAll('.promise-item');
    if (promiseItems.length >= 4) {
      promiseItems[0].querySelector('strong').textContent = s.promiseP1Title;
      promiseItems[0].querySelector('p').textContent = s.promiseP1Desc;
      promiseItems[1].querySelector('strong').textContent = s.promiseP2Title;
      promiseItems[1].querySelector('p').textContent = s.promiseP2Desc;
      promiseItems[2].querySelector('strong').textContent = s.promiseP3Title;
      promiseItems[2].querySelector('p').textContent = s.promiseP3Desc;
      promiseItems[3].querySelector('strong').textContent = s.promiseP4Title;
      promiseItems[3].querySelector('p').textContent = s.promiseP4Desc;
    }

    const promiseFooter = document.querySelector('.promise-addon-footer span');
    if (promiseFooter) promiseFooter.innerHTML = s.promiseFooter;

    const trustItems = document.querySelectorAll('.trust-values-bar .trust-item');
    if (trustItems.length >= 4) {
      trustItems[0].innerHTML = '<span class="icon">✓</span> ' + s.trust1;
      trustItems[1].innerHTML = '<span class="icon">✓</span> ' + s.trust2;
      trustItems[2].innerHTML = '<span class="icon">✓</span> ' + s.trust3;
      trustItems[3].innerHTML = '<span class="icon">✓</span> ' + s.trust4;
    }

    // Filter Buttons
    const fBtns = document.querySelectorAll('.filter-btn');
    if (fBtns.length >= 5) {
      fBtns[0].textContent = s.filterAll;
      fBtns[1].textContent = s.filterSales;
      fBtns[2].textContent = s.filterMedia;
      fBtns[3].textContent = s.filterSaas;
      fBtns[4].textContent = s.filterAgents;
    }

    // Modal 1 Tabs
    const mTabs = document.querySelectorAll('.modal-tab');
    if (mTabs.length >= 4) {
      mTabs[0].textContent = s.tabOverview;
      mTabs[1].textContent = s.tabFeatures;
      mTabs[2].textContent = s.tabBenefits;
      mTabs[3].textContent = s.tabWhitelabel;
    }

    const paneFeaturesH4 = document.querySelector('#pane-features .pane-headline');
    if (paneFeaturesH4) paneFeaturesH4.textContent = s.featuresHeading;

    const paneBenefitsH4 = document.querySelector('#pane-benefits .pane-headline');
    if (paneBenefitsH4) paneBenefitsH4.textContent = s.benefitsHeading;

    const paneWhitelabelH4 = document.querySelector('#pane-whitelabel .pane-headline');
    if (paneWhitelabelH4) paneWhitelabelH4.textContent = s.operatorHeading;

    const modelsTitle = document.querySelector('#pane-whitelabel h5');
    if (modelsTitle) modelsTitle.textContent = s.modelsHeading;

    const estRevTitle = document.querySelector('.operator-calc-row h5');
    if (estRevTitle) estRevTitle.textContent = s.estRevenueHeading;

    const btnInqTrig = document.getElementById('btn-modal-inquire-trigger');
    if (btnInqTrig) btnInqTrig.textContent = s.btnInquireLicensing;

    const directLinkSpan = document.querySelector('#md1-direct-link span:first-child');
    if (directLinkSpan) directLinkSpan.textContent = s.btnOpenApp;

    // Modal 2 Headers
    const md2Sub = document.querySelector('#modal-techstack .modal-header-title p');
    if (md2Sub) md2Sub.textContent = s.md2Sub;

    const md2DurableH5 = document.querySelector('#modal-techstack h5');
    if (md2DurableH5) md2DurableH5.textContent = s.md2DurableHeading;

    const md2EvolH5 = document.querySelector('.evolution-card h5');
    if (md2EvolH5) md2EvolH5.textContent = s.md2EvolHeading;

    // Modal 3 Inquiry Form
    const inqH3 = document.querySelector('#modal-inquiry .modal-header h3');
    if (inqH3) inqH3.textContent = s.inquiryTitle;

    const inqP = document.querySelector('#modal-inquiry .modal-body p');
    if (inqP) inqP.textContent = s.inquirySubtitle;

    const formLabels = document.querySelectorAll('#inquiry-form label');
    if (formLabels.length >= 6) {
      formLabels[0].textContent = s.lblTargetPlatform;
      formLabels[1].textContent = s.lblLicensingModel;
      formLabels[2].textContent = s.lblNameCompany;
      formLabels[3].textContent = s.lblWorkEmail;
      formLabels[4].textContent = s.lblWhereFound;
      formLabels[5].textContent = s.lblNotes;
    }

    const tierSelect = document.getElementById('form-tier-select');
    if (tierSelect && tierSelect.options.length >= 3) {
      tierSelect.options[0].textContent = s.tier1Opt;
      tierSelect.options[1].textContent = s.tier2Opt;
      tierSelect.options[2].textContent = s.tier3Opt;
    }

    const sourceSelect = document.getElementById('form-source');
    if (sourceSelect && s.sourceOptions) {
      const currentVal = sourceSelect.value;
      sourceSelect.innerHTML = '';
      s.sourceOptions.forEach((opt, idx) => {
        const optEl = document.createElement('option');
        optEl.value = opt.value;
        optEl.textContent = opt.text;
        if (opt.disabled) optEl.disabled = true;
        if (opt.value === currentVal || (!currentVal && idx === 0)) {
          optEl.selected = true;
        }
        sourceSelect.appendChild(optEl);
      });
    }

    // Templates elements translation
    const txtHeaderTemplates = document.getElementById('txt-header-templates');
    if (txtHeaderTemplates) txtHeaderTemplates.textContent = s.templatesTab;

    const txtFilterTemplates = document.getElementById('txt-filter-templates');
    if (txtFilterTemplates) txtFilterTemplates.textContent = s.templatesFilterBtn;

    const tplTitle = document.getElementById('tpl-modal-title');
    if (tplTitle) tplTitle.textContent = s.templatesModalTitle;

    const tplSub = document.getElementById('tpl-modal-sub');
    if (tplSub) tplSub.textContent = s.templatesModalSub;

    const tplBadge = document.getElementById('tpl-badge');
    if (tplBadge) tplBadge.textContent = s.templatesBadge;

    const tplHeadline = document.getElementById('tpl-headline');
    if (tplHeadline) tplHeadline.textContent = s.templatesHeadline;

    const tplIntroP1 = document.getElementById('tpl-intro-p1');
    if (tplIntroP1) tplIntroP1.innerHTML = s.templatesIntroP1;

    const tplIntroP2 = document.getElementById('tpl-intro-p2');
    if (tplIntroP2) tplIntroP2.textContent = s.templatesIntroP2;

    const tplPill1 = document.getElementById('tpl-pill1');
    if (tplPill1) tplPill1.textContent = s.tplPill1;
    const tplPill2 = document.getElementById('tpl-pill2');
    if (tplPill2) tplPill2.textContent = s.tplPill2;
    const tplPill3 = document.getElementById('tpl-pill3');
    if (tplPill3) tplPill3.textContent = s.tplPill3;
    const tplPill4 = document.getElementById('tpl-pill4');
    if (tplPill4) tplPill4.textContent = s.tplPill4;

    const tplInqTitle = document.getElementById('tpl-inq-title');
    if (tplInqTitle) tplInqTitle.textContent = s.tplInqTitle;

    const tplInqDesc = document.getElementById('tpl-inq-desc');
    if (tplInqDesc) tplInqDesc.textContent = s.tplInqDesc;

    const tplBtnEnquireText = document.getElementById('tpl-btn-enquire-text');
    if (tplBtnEnquireText) tplBtnEnquireText.textContent = s.tplBtnEnquireText;

    const optTemplatesInquiry = document.getElementById('opt-templates-inquiry');
    if (optTemplatesInquiry) optTemplatesInquiry.textContent = s.customTemplateOpt;

    const notesArea = document.getElementById('form-notes');
    if (notesArea) notesArea.placeholder = s.phNotes;

    const btnSubmitInquiry = document.getElementById('btn-submit-inquiry');
    if (btnSubmitInquiry) {
      btnSubmitInquiry.querySelector('span:last-child').textContent = s.btnSubmitInquiry;
    }
  }

  // Generates authentic UI mockup preview for each app
  function renderMockupCanvas(app) {
    const isNo = currentLang === 'no';
    switch (app.id) {
      case 'hubzoo':
        return `
          <div class="app-ui-canvas">
            <div class="ui-hubzoo-pipeline">
              <div class="pipeline-col">
                <div class="pipeline-header"><span>📥</span> ${isNo ? 'Innkomne henvendelser' : 'Inbound Inquiries'}</div>
                <div class="pipeline-card-snippet">${isNo ? 'Fanges fra nettside & WhatsApp' : 'Auto-captured via WhatsApp & Web form'}</div>
              </div>
              <div class="pipeline-col">
                <div class="pipeline-header"><span>⚡</span> ${isNo ? 'Pristilbud på mobilen' : 'Mobile Quotes'}</div>
                <div class="pipeline-card-snippet">${isNo ? 'Sendes på under 60 sekunder' : 'Created & dispatched on-site in < 60s'}</div>
              </div>
              <div class="pipeline-col">
                <div class="pipeline-header"><span>🤖</span> ${isNo ? 'Automatisk oppfølging' : 'Auto Follow-Up'}</div>
                <div class="pipeline-card-snippet">${isNo ? 'Planlagte påminnelser (48t / 5d)' : 'Context-aware nudge scheduled (48h / 5d)'}</div>
              </div>
              <div class="pipeline-col">
                <div class="pipeline-header"><span>✓</span> ${isNo ? 'Godkjent & Fakturert' : 'Approved & Invoiced'}</div>
                <div class="pipeline-card-snippet">${isNo ? 'Direkte synk til Fiken & Tripletex' : 'Direct 1-click sync to Tripletex & Fiken'}</div>
              </div>
            </div>
          </div>
        `;

      case 'maxmotion':
        return `
          <div class="app-ui-canvas">
            <div class="ui-maxmotion-studio">
              <div class="studio-model-badge"><span>●</span> Wan 2.1 / Kling 1.5 Pro / Minimax</div>
              <div class="studio-prompt-preview">
                <strong>${isNo ? 'Prompt-orkestrering:' : 'Prompt Orchestration:'}</strong> "Cinematic commercial shot of luxury watch, dynamic drone camera sweep, volumetric studio lighting, 4K 60fps photorealistic render"
              </div>
            </div>
          </div>
        `;

      case 'mediabunny':
        return `
          <div class="app-ui-canvas">
            <div class="ui-mediabunny-suite">
              <div class="tool-tile"><span class="tool-icon">✂️</span> ${isNo ? 'WASM Bakgrunnsfjerning' : 'WASM Background Removal'}</div>
              <div class="tool-tile"><span class="tool-icon">🎙️</span> ${isNo ? 'EBU R128 Lydnormalisering' : 'EBU R128 Audio Normalizer'}</div>
              <div class="tool-tile"><span class="tool-icon">📦</span> ${isNo ? 'Intelligent CRF Komprimering' : 'Intelligent CRF Compressor'}</div>
              <div class="tool-tile"><span class="tool-icon">🐰</span> ${isNo ? 'BunnyBot Assistent' : 'BunnyBot Automation'}</div>
            </div>
          </div>
        `;

      case 'subsentry':
        return `
          <div class="app-ui-canvas">
            <div class="ui-subsentry-dash">
              <div class="sub-item"><span>⚡ Cloud Engine Pro</span><span class="sub-alert-tag">${isNo ? 'Fornyes om 3 dager' : 'Renewal in 3 days'}</span></div>
              <div class="sub-item"><span>🎨 Vector Icon Studio</span><span class="sub-clean-tag">${isNo ? '1-klikks oppsigelse aktiv' : '1-Click Cancellation active'}</span></div>
              <div class="sub-item"><span>📊 Analytics Cloud Plus</span><span class="sub-clean-tag">${isNo ? 'Felle omgått' : 'Dark Pattern Shielded'}</span></div>
            </div>
          </div>
        `;

      case 'appsave':
        return `
          <div class="app-ui-canvas">
            <div class="ui-appsave-browser">
              <div class="appsave-ext-banner">
                <span style="font-weight:800;">AppSave</span>
                <span class="ext-pill">${isNo ? 'Chrome Manifest V3 Aktiv' : 'Chrome Manifest V3 Active'}</span>
              </div>
              <div style="font-size:0.8rem; color:#475569; margin-top:0.4rem;">
                ${isNo ? 'Finner og tester rabattkoder automatisk ved utsjekk på SaaS- og AI-verktøy' : 'Crowdsourced discount codes validated in real-time at checkout across 500+ SaaS vendors'}
              </div>
            </div>
          </div>
        `;

      case 'upworkz':
        return `
          <div class="app-ui-canvas">
            <div class="ui-upworkz-audit">
              <div class="audit-step-pill"><span>✓</span> ${isNo ? 'Gemini 2.5 Resonnering' : 'Gemini 2.5 Tenke-Arkitektur'}</div>
              <div class="audit-step-pill"><span>✓</span> ${isNo ? '220-tegns åpningskrok optimalisert' : '220-Char Visual Hook Optimized'}</div>
              <div class="audit-step-pill"><span>✓</span> ${isNo ? 'Avslørte oppdragsgivers kontrollspørsmål' : 'Gotcha Question Detected & Answered'}</div>
            </div>
          </div>
        `;

      case 'manus':
        return `
          <div class="app-ui-canvas">
            <div class="ui-manus-agent">
              <div class="agent-step-item"><span class="step-check">✓</span> 1. ${isNo ? 'Bokdisposisjon & kapittelarkitektur (15 kapitler)' : 'Book Outline & Chapter Blueprint (15 Chapters)'}</div>
              <div class="agent-step-item"><span class="step-check">✓</span> 2. ${isNo ? 'Langformat kapittelforfatting & rød tråd' : 'Long-Form Chapter Drafting & Narrative Continuity'}</div>
              <div class="agent-step-item"><span class="step-check">✓</span> 3. ${isNo ? '1-klikks eksport til ePub, Kindle KDP & trykk-PDF' : '1-Click Export to ePub, Kindle KDP & Print PDF'}</div>
            </div>
          </div>
        `;

      default:
        return '<div class="app-ui-canvas"></div>';
    }
  }

  function renderCards() {
    cardsContainer.innerHTML = '';
    const dataset = getDataset();
    const s = UI_STRINGS[currentLang];

    const apps = currentCategory === 'all'
      ? dataset
      : dataset.filter(app => app.category === currentCategory);

    apps.forEach((app) => {
      const card = document.createElement('article');
      card.className = 'app-card';

      // Clean Browser Window Frame with Authentic UI Preview
      const browserFrameHtml = `
        <div class="card-browser-frame">
          <div class="browser-header-bar">
            <div class="browser-traffic-lights">
              <span class="traffic-light light-red"></span>
              <span class="traffic-light light-yellow"></span>
              <span class="traffic-light light-green"></span>
            </div>
            <div class="browser-url-pill">
              <span>🔒</span>
              <span>https://${app.domain}</span>
            </div>
            <span class="browser-status-tag ${app.statusType === 'preview' ? 'preview' : ''}">
              ${app.statusBadge}
            </span>
          </div>

          ${renderMockupCanvas(app)}
        </div>
      `;

      // 4 Realistic Capability Tags
      const tagsHtml = app.tags.map(t => `
        <div class="tag-item">
          <span class="tag-lbl">${t.label}</span>
          <span class="tag-val">${t.val}</span>
        </div>
      `).join('');

      card.innerHTML = `
        ${browserFrameHtml}
        
        <div class="card-content-body">
          <div class="card-category-meta">${app.categoryLabel}</div>
          
          <div class="card-title-row">
            <a href="apps/${app.id}.html" style="text-decoration: none; color: inherit;" title="Open full product guide and SEO landing page">
              <h3>${app.name} ↗</h3>
            </a>
          </div>

          <h4 class="card-tagline">${app.tagline}</h4>

          <p class="card-description">${app.shortDescription}</p>

          <!-- 4 Capability Tags -->
          <div class="card-tags-grid">
            ${tagsHtml}
          </div>

          <!-- THE 4 ACTION LINKS AT THE BOTTOM OF EACH CARD -->
          <footer class="card-actions-footer">
            <!-- Link 0: SEO Landing Page & Full Specs -->
            <a href="apps/${app.id}.html" class="btn-card-action btn-seo-page" title="Dedicated Google-Indexed Product Guide & Specs">
              <span>📄</span>
              <span>${currentLang === 'no' ? 'Produktside' : 'Product Guide'}</span>
            </a>

            <!-- Link 1: Learn More (Deep Dive Modal) -->
            <button class="btn-card-action btn-learn-more" data-action="deepdive" data-appid="${app.id}">
              <span>🔍</span>
              <span>${s.btnLearnMore}</span>
            </button>

            <!-- Link 2: Tech Stack (Tech Stack & Durability Modal) -->
            <button class="btn-card-action btn-tech-stack" data-action="techstack" data-appid="${app.id}">
              <span>⚡</span>
              <span>${s.btnTechStack}</span>
            </button>

            <!-- Link 3: Launch App (New Tab) -->
            <a href="${app.url}" target="_blank" rel="noopener noreferrer" class="btn-card-action btn-launch-app">
              <span>${s.btnLaunchApp}</span>
              <span>↗</span>
            </a>
          </footer>
        </div>
      `;

      cardsContainer.appendChild(card);
    });
  }

  // --------------------------------------------------------------------------
  // MODAL 1: DEEP DIVE
  // --------------------------------------------------------------------------
  function openDeepDiveModal(appId) {
    const dataset = getDataset();
    const app = dataset.find(a => a.id === appId);
    if (!app) return;
    activeAppId = appId;
    const s = UI_STRINGS[currentLang];

    md1Icon.textContent = app.name.slice(0, 1);
    md1Title.textContent = `${app.name} — ${s.btnLearnMore}`;
    md1Url.textContent = `https://${app.domain}`;
    md1DirectLink.href = app.url;

    md1Headline.textContent = app.deepDive.headline;
    md1Story.innerHTML = app.deepDive.problemSolution;

    md1FeaturesGrid.innerHTML = app.deepDive.coreFunctions.map(f => `
      <div class="detail-card">
        <h5><span>${f.icon}</span> <span>${f.title}</span></h5>
        <div class="detail-summary">${f.summary}</div>
        <div class="detail-desc">${f.details}</div>
      </div>
    `).join('');

    md1BenefitsGrid.innerHTML = app.deepDive.userBenefits.map(b => `
      <div class="detail-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">${b.title}</h4>
          <span style="font-size: 0.75rem; font-weight: 800; color: #166534; background: #dcfce7; padding: 2px 8px; border-radius: 999px; font-family: var(--font-mono);">${b.metric}</span>
        </div>
        <p class="detail-desc">${b.desc}</p>
      </div>
    `).join('');

    md1OperatorPitch.innerHTML = app.deepDive.whitelabel.operatorPitch;
    md1LicensingGrid.innerHTML = app.deepDive.whitelabel.models.map((m, idx) => `
      <div class="license-tier-box ${idx === 0 ? 'popular' : ''}">
        <div>
          <div class="tier-name">${m.tier}</div>
          <div class="tier-cost">${m.price}</div>
          <ul class="tier-list">
            ${m.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
        <button class="btn-card-action btn-tech-stack" style="width: 100%; font-size: 0.78rem; padding: 0.5rem;" onclick="window.requestTierInquiry('${app.id}', '${m.tier}')">
          ${s.inquireFor} ${m.tier.split(' ')[0]} ➔
        </button>
      </div>
    `).join('');

    md1RevenueText.textContent = app.deepDive.whitelabel.revenuePotential;

    activateTab('overview');

    modalDeepdive.classList.add('open');
    modalDeepdive.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDeepDiveModal() {
    modalDeepdive.classList.remove('open');
    modalDeepdive.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function activateTab(tabName) {
    md1Tabs.forEach(t => {
      if (t.dataset.tab === tabName) t.classList.add('active');
      else t.classList.remove('active');
    });

    md1Panes.forEach(p => {
      if (p.id === `pane-${tabName}`) p.classList.add('active');
      else p.classList.remove('active');
    });
  }

  // --------------------------------------------------------------------------
  // MODAL 2: TECH STACK & DURABILITY
  // --------------------------------------------------------------------------
  function openTechStackModal(appId) {
    const dataset = getDataset();
    const app = dataset.find(a => a.id === appId);
    if (!app) return;

    md2Title.textContent = `${app.name} — ${UI_STRINGS[currentLang].btnTechStack}`;
    md2Headline.textContent = app.techStack.headline;
    md2Summary.textContent = app.techStack.summary;

    md2ChipsList.innerHTML = app.techStack.stackPills.map(p => `
      <span class="tech-chip-badge">${p}</span>
    `).join('');

    md2DurabilityGrid.innerHTML = app.techStack.durabilityPillars.map(d => `
      <div class="durability-box">
        <h5><span>${d.icon}</span> <span>${d.title}</span></h5>
        <p>${d.desc}</p>
      </div>
    `).join('');

    md2EvolutionText.innerHTML = app.techStack.continuousEvolution;

    modalTechstack.classList.add('open');
    modalTechstack.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeTechStackModal() {
    modalTechstack.classList.remove('open');
    modalTechstack.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // --------------------------------------------------------------------------
  // MODAL 3: OPERATOR INQUIRY
  // --------------------------------------------------------------------------
  function openInquiryModal(targetAppId, targetTier) {
    if (targetAppId) {
      formAppSelect.value = targetAppId;
    }
    if (targetTier) {
      const tierSelect = document.getElementById('form-tier-select');
      if (tierSelect) {
        if (targetTier.toLowerCase().includes('turnkey') || targetTier.toLowerCase().includes('nøkkel')) tierSelect.value = 'turnkey';
        else if (targetTier.toLowerCase().includes('lease') || targetTier.toLowerCase().includes('leie')) tierSelect.value = 'lease';
        else if (targetTier.toLowerCase().includes('buyout') || targetTier.toLowerCase().includes('kjøp')) tierSelect.value = 'buyout';
      }
    }

    modalInquiry.classList.add('open');
    modalInquiry.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeInquiryModal() {
    modalInquiry.classList.remove('open');
    modalInquiry.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  window.requestTierInquiry = function(appId, tierName) {
    closeDeepDiveModal();
    setTimeout(() => {
      openInquiryModal(appId, tierName);
    }, 200);
  };

  // --------------------------------------------------------------------------
  // MODAL 4: TEMPLATES INQUIRY
  // --------------------------------------------------------------------------
  function openTemplatesModal() {
    const modal = document.getElementById('modal-templates');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeTemplatesModal() {
    const modal = document.getElementById('modal-templates');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  window.openTemplatesModal = openTemplatesModal;
  window.closeTemplatesModal = closeTemplatesModal;

  // --------------------------------------------------------------------------
  // EVENT LISTENERS
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    if (btnLangToggle) {
      btnLangToggle.addEventListener('click', toggleLanguage);
    }

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.cat;
        renderCards();
      });
    });

    cardsContainer.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('button[data-action]');
      if (!actionBtn) return;
      const action = actionBtn.dataset.action;
      const appId = actionBtn.dataset.appid;

      if (action === 'deepdive') {
        openDeepDiveModal(appId);
      } else if (action === 'techstack') {
        openTechStackModal(appId);
      }
    });

    btnCloseMd1.addEventListener('click', closeDeepDiveModal);
    modalDeepdive.addEventListener('click', (e) => {
      if (e.target === modalDeepdive) closeDeepDiveModal();
    });
    md1Tabs.forEach(tab => {
      tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });
    btnModalInquireTrigger.addEventListener('click', () => openInquiryModal(activeAppId));

    btnCloseMd2.addEventListener('click', closeTechStackModal);
    modalTechstack.addEventListener('click', (e) => {
      if (e.target === modalTechstack) closeTechStackModal();
    });

    // Templates Modal Listeners
    const btnTplHeader = document.getElementById('btn-templates-tab');
    if (btnTplHeader) {
      btnTplHeader.addEventListener('click', (e) => {
        e.preventDefault();
        openTemplatesModal();
      });
    }

    const btnTplFilter = document.getElementById('filter-btn-templates');
    if (btnTplFilter) {
      btnTplFilter.addEventListener('click', (e) => {
        e.preventDefault();
        openTemplatesModal();
      });
    }

    const btnCloseTpl = document.getElementById('btn-close-templates');
    if (btnCloseTpl) {
      btnCloseTpl.addEventListener('click', closeTemplatesModal);
    }

    const modalTpl = document.getElementById('modal-templates');
    if (modalTpl) {
      modalTpl.addEventListener('click', (e) => {
        if (e.target === modalTpl) closeTemplatesModal();
      });
    }

    const btnTplEnquire = document.getElementById('btn-templates-enquire-now');
    if (btnTplEnquire) {
      btnTplEnquire.addEventListener('click', (e) => {
        e.preventDefault();
        closeTemplatesModal();
        setTimeout(() => {
          openInquiryModal('templates-inquiry');
          const notesField = document.getElementById('form-notes');
          if (notesField && !notesField.value) {
            notesField.value = currentLang === 'no' 
              ? 'Forespørsel om 50+ maler. Dette ønsker jeg å skape: '
              : 'Inquiry regarding 50+ templates. What I want to create: ';
            notesField.focus();
          }
        }, 150);
      });
    }

    btnTopInquiry.addEventListener('click', () => openInquiryModal());
    btnCloseInquiry.addEventListener('click', closeInquiryModal);
    modalInquiry.addEventListener('click', (e) => {
      if (e.target === modalInquiry) closeInquiryModal();
    });

    inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const s = UI_STRINGS[currentLang];
      const submitBtn = document.getElementById('btn-submit-inquiry');
      
      const appSelect = document.getElementById('form-app-select');
      const tierSelect = document.getElementById('form-tier-select');
      const appName = appSelect.options[appSelect.selectedIndex].text;
      const tierName = tierSelect.options[tierSelect.selectedIndex].text;
      const contactName = document.getElementById('form-name').value.trim();
      const contactEmail = document.getElementById('form-email').value.trim();
      const sourceSelect = document.getElementById('form-source');
      const foundSource = sourceSelect.value || (currentLang === 'no' ? 'Ikke spesifisert' : 'Not specified');
      const notes = document.getElementById('form-notes').value.trim();

      const subject = encodeURIComponent(`Whitelabel Licensing Inquiry: ${appName} [${contactName}]`);
      const bodyLines = [
        currentLang === 'no' ? 'Forespørsel om Whitelabel-lisens' : 'Whitelabel Licensing Inquiry',
        '----------------------------------------',
        (currentLang === 'no' ? 'Valgt plattform: ' : 'Target Platform: ') + appName,
        (currentLang === 'no' ? 'Lisensmodell: ' : 'Licensing Model: ') + tierName,
        (currentLang === 'no' ? 'Navn & Selskap: ' : 'Name & Company: ') + contactName,
        (currentLang === 'no' ? 'Arbeids-e-post: ' : 'Work Email: ') + contactEmail,
        (currentLang === 'no' ? 'Hvor fant de oss: ' : 'Where they found us: ') + foundSource,
        currentLang === 'no' ? 'Målgruppe og lanseringsmål:' : 'Audience & Launch Goals:',
        notes ? notes : (currentLang === 'no' ? '(Ingen oppgitt)' : '(None provided)'),
        '----------------------------------------',
        'Sent via aiappsy.com Showcase'
      ];

      const mailtoUrl = `mailto:paljuritzen@gmail.com?subject=${subject}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

      submitBtn.querySelector('span:last-child').textContent = s.submittingText;
      submitBtn.disabled = true;

      // Post to backend API so lead is stored in database / leads.json
      fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          projectType: 'Whitelabel: ' + appName + ' (' + tierName + ')',
          message: bodyLines.join('\n')
        })
      }).catch(function(err) {
        console.warn('API inquiry fallback:', err);
      }).finally(function() {
        // Trigger the mail client as optional desktop backup
        try { window.location.href = mailtoUrl; } catch(e) {}

        setTimeout(function() {
          alert(s.alertSent);
          submitBtn.disabled = false;
          submitBtn.querySelector('span:last-child').textContent = s.btnSubmitInquiry;
          closeInquiryModal();
        }, 500);
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modalTpl = document.getElementById('modal-templates');
        if (modalTpl && modalTpl.classList.contains('open')) {
          closeTemplatesModal();
          return;
        }
        if (modalTemplates && modalTemplates.classList.contains('open')) closeTemplatesModal();
        else if (modalInquiry.classList.contains('open')) closeInquiryModal();
        else if (modalDeepdive.classList.contains('open')) closeDeepDiveModal();
        else if (modalTechstack.classList.contains('open')) closeTechStackModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
