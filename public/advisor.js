// ============================================================================
// EXPERT AI WHITELABEL ADVISOR ENGINE (Bilingual: English & Norwegian)
// Persona: Always positive, encouraging, deeply knowledgeable on all 7 apps,
// market opportunities, monetization math, and BizBox whitelabel tiers.
// Pricing Policy: Always explains that exact pricing depends on the chosen tier 
// and whether any custom work is required, so it needs to be discussed.
// ============================================================================

(function () {
  let advisorLang = localStorage.getItem('ai_showcase_lang') || 'en';

  const KNOWLEDGE_EN = {
    apps: {
      hubzoo: {
        name: "Hubzoo",
        tagline: "Autonomous Sales Partner & CRM for SMBs",
        market: "Contractors, plumbers, electricians, marketing consultants, and SMB service providers who lose 60%+ of sales simply because they are too busy on-site to reply to leads immediately.",
        whitelabelPotential: "Enormous recurring B2B retention! Agencies charge $49-$149/mo per client. At just 40 tradesmen clients, that generates ~$3,500/mo in pure recurring revenue with virtually zero churn because it directly wins them jobs.",
        keyFeatures: "60-second mobile quote creator, multi-channel auto follow-ups across WhatsApp/SMS/Email, and direct accounting sync with Tripletex and Fiken.",
        encouragement: "Hubzoo is one of the highest-converting SaaS offerings you can launch because it directly puts money into business owners' pockets from day one!"
      },
      maxmotion: {
        name: "MaxMotion AI",
        tagline: "Multi-Model Generative Video Production Studio",
        market: "E-commerce brands, creative ad agencies, TikTok/Reels marketing shops, and content creators needing high-volume commercial video without studio costs.",
        whitelabelPotential: "Video is the fastest-growing digital asset class. Whitelabel operators can bundle this as a proprietary video generation portal charging $99-$299/mo per seat or offering high-margin credits.",
        keyFeatures: "Unified prompt orchestration across Wan 2.1, Kling 1.5 Pro, Minimax, and Seedance 2.0 with prompt enhancement and shot sequencing.",
        encouragement: "You are stepping into a multi-billion dollar generative video market. Having an all-in-one studio with all 4 top models gives you an incredible competitive moat over single-model tools!"
      },
      mediabunny: {
        name: "MediaBunny",
        tagline: "AI Media, Audio & Video Processing Suite",
        market: "Podcasters, video editors, social media agencies, and digital creators needing instant media preparation without cloud lag or expensive desktop suites.",
        whitelabelPotential: "Massive margin advantage! Because background removal and audio normalization execute on-device using WebAssembly, your cloud compute server cost is virtually zero, meaning near 100% gross profit margins for operators.",
        keyFeatures: "Client-side WASM background removal, EBU R128 audio normalization, CRF intelligent video compression, and BunnyBot automation assistant.",
        encouragement: "The cost efficiency of MediaBunny is unmatched. You can offer competitive pricing while keeping almost every single dollar of subscription revenue!"
      },
      subsentry: {
        name: "SubSentry",
        tagline: "Subscription Watchdog & Dark Pattern Shield",
        market: "Freelancers, remote workers, SMB finance teams, and modern consumers struggling with creeping software subscription costs and deceptive cancellation traps.",
        whitelabelPotential: "High viral appeal! Consumer & B2B finance tools have exceptional organic word-of-mouth. Position it as an executive financial perk or agency cost-reduction service.",
        keyFeatures: "Bank webhook transaction monitoring, renewal countdown alerts, 1-click legal cancellation scripts, and dark-pattern friction bypass.",
        encouragement: "People love tools that immediately save them money! Showing an operator or client that SubSentry eliminated $150/mo in zombie software makes this an effortless sell!"
      },
      appsave: {
        name: "AppSave",
        tagline: "'Honey' for SaaS & AI Tooling Discounts",
        market: "Bootstrappers, startup founders, AI engineers, and agencies who spend thousands every month on SaaS stacks and want verified active discount codes.",
        whitelabelPotential: "Dual monetization stream: monetize both monthly premium platform access AND lucrative affiliate commission kickbacks from major SaaS directories!",
        keyFeatures: "Chrome Manifest V3 browser extension for checkout auto-fill, verified crowdsourced deal engine, and personalized stack coupon alerts.",
        encouragement: "AppSave has that irresistible viral browser extension flywheel. It delivers instant gratitude every time a user saves $50 at checkout!"
      },
      upworkz: {
        name: "Upworkz",
        tagline: "Autonomous Upwork Proposal Architect & Deal Closer",
        market: "Top-tier freelancers, development agencies, copywriters, and consulting teams fighting to win high-budget freelance contracts on Upwork and freelance marketplaces.",
        whitelabelPotential: "High willingness-to-pay! A freelancer winning just one additional $3,000 project will gladly pay $99/mo for Upworkz all year round.",
        keyFeatures: "Gemini 2.5 proposal analysis, 220-character hook optimization, automatic gotcha question auditing, and portfolio attachment matcher.",
        encouragement: "Winning deals on freelance marketplaces is a numbers and speed game. Upworkz empowers freelancers to bid with elite quality in seconds!"
      },
      manus: {
        name: "Manus AI Studio",
        tagline: "Autonomous Generalist Action Agent & Studio",
        market: "Venture-backed startups, analysts, software teams, and executive operators seeking autonomous agents that do not just chat, but actually execute multi-step computer tasks.",
        whitelabelPotential: "Premium enterprise pricing power! Autonomous agents command $199-$999/mo enterprise contracts when packaged as an autonomous research or workflow assistant.",
        keyFeatures: "Autonomous web research, headless browser navigation, isolated MicroVM code execution, and persistent memory across sessions.",
        encouragement: "Autonomous computer-use agents represent the cutting frontier of AI. Operating your own branded action agent studio positions you at the very forefront of the industry!"
      }
    }
  };

  const KNOWLEDGE_NO = {
    apps: {
      hubzoo: {
        name: "Hubzoo",
        tagline: "Autonom salgsassistent & CRM for håndverkere og SMB",
        market: "Håndverkere, snekkere, rørleggere, elektrikere og konsulenter som taper 60 %+ av oppdragene rett og slett fordi de er opptatt ute i felt og svarer for sent.",
        whitelabelPotential: "Ekstremt høy kundelojalitet! Norske byråer kan ta 690 – 1 490 kr/mnd per kunde. Med kun 40 lokale bedriftskunder gir det over 35 000 kr i faste månedlige inntekter (MRR).",
        keyFeatures: "60-sekunders mobilt pristilbud, automatiske påminnelser på SMS/e-post/WhatsApp og toveis integrasjon mot Fiken og Tripletex.",
        encouragement: "Hubzoo er et av de enkleste SaaS-produktene å selge i Norge, fordi det direkte skaffer kunden nye oppdrag fra dag én!"
      },
      maxmotion: {
        name: "MaxMotion AI",
        tagline: "Multi-modell generativt videostudio",
        market: "Markedsførere, nettbutikker, innholdsskapere og reklamebyråer som trenger store volum av høykvalitets produkt- og annonsevideoer uten dyre filmsett.",
        whitelabelPotential: "Video er det raskest voksende medieformatet. Som operatør kan du tilby et eget videostudio for 990 – 2 490 kr/mnd per kunde eller selge videokreditter med solide marginer.",
        keyFeatures: "Multi-modell orkestrering over Wan 2.1, Kling 1.5 Pro og Minimax, kinematisk kamerastyring og automatisk bilde-til-video.",
        encouragement: "Du går rett inn i et eksploderende marked. Å kunne tilby 3 av verdens råeste videomodeller i ett verktøy gir deg et massivt forsprang!"
      },
      mediabunny: {
        name: "MediaBunny",
        tagline: "Lynraskt nettleserbasert medie- og lydstudio",
        market: "Podkastere, videoredigerere, mediebyråer og innholdsprodusenter som trenger umiddelbar klargjøring av filer uten ventetid eller dyre desktop-programmer.",
        whitelabelPotential: "Nesten 100 % bruttofortjeneste! Fordi all tung bilde- og lydbehandling skjer direkte på brukerens maskin via WebAssembly, har du tilnærmet null kroner i server- og skyutgifter.",
        keyFeatures: "Lokal WASM bakgrunnsfjerning, EBU R128 kringkastingsstandard lydnormalisering, CRF videokomprimering og BunnyBot AI-assistent.",
        encouragement: "Kostnadseffektiviteten i MediaBunny er helt unik i SaaS-verdenen. Hver eneste abonnementskrone går rett i lomma på operatøren!"
      },
      subsentry: {
        name: "SubSentry",
        tagline: "Abonnementsvakt og forbrukerskjold",
        market: "Frilansere, privatpersoner og bedrifter som mister oversikten over løpende abonnementskostnader og sliter med sleipe oppsigelsesfeller.",
        whitelabelPotential: "Høy viralitet og folkelig appell! Perfekt som medlemsfordel eller abonnementstjeneste til 79 – 149 kr/mnd med minimal churn.",
        keyFeatures: "Automatisk abonnementsdetektiv, fornyelsesvarsler, 1-klikks juridiske oppsigelsesbrev og omgåelse av skjulte oppsigelsesmenyer.",
        encouragement: "Folk elsker verktøy som direkte sparer dem penger! Å vise kunden at SubSentry sparte dem for 1 500 kr i unødvendige trekk gjør salget lekende lett."
      },
      appsave: {
        name: "AppSave",
        tagline: "'Honey' for SaaS og AI-programvare",
        market: "Gründere, utviklere, studenter og bedrifter som bruker tusenvis av kroner på programvare og verktøy hver måned.",
        whitelabelPotential: "Dobbel inntektsstrøm: Ta betalt for VIP-tilgang til eksklusive koder, samtidig som du mottar opptil 30 % affiliate-kickbacks på kjøpene som gjøres!",
        keyFeatures: "Chrome Manifest V3 utvidelse for automatisk kodesjekk i kassen, verifisert rabattdatabase og AI-testing av gyldige koder.",
        encouragement: "AppSave har den råeste organiske veksteffekten. Brukerne sparer penger med ett klikk og tipser umiddelbart kolleger og venner!"
      },
      upworkz: {
        name: "Upworkz",
        tagline: "Autonom tilbudsarkitekt for frilansere",
        market: "Dyktige frilansere, konsulenter og spesialistbyråer som kjemper om høyt betalte oppdrag på Upwork og globale plattformer.",
        whitelabelPotential: "Enorm betalingsvilje! En frilanser som lander et oppdrag til 30 000 kr betaler gladelig 490 – 990 kr/mnd for Upworkz hele året.",
        keyFeatures: "Gemini 2.5 resonnering, optimalisering av de første 220 tegnene (kroken) og automatisk avsløring av oppdragsgivers kontrollspørsmål.",
        encouragement: "Å vinne oppdrag handler om sekunder og spisskompetanse. Upworkz gjør at frilanseren fremstår som den ubestridte eksperten hver gang!"
      },
      manus: {
        name: "Manus AI Studio",
        tagline: "Autonom generalist- og handlingsagent",
        market: "Vekstselskaper, analyseselskaper og ledere som trenger en digital kollega som faktisk utfører komplekse data- og web-oppgaver selvstendig.",
        whitelabelPotential: "Enterprise-prising: Bedriftskunder betaler gjerne 2 500 – 10 000 kr/mnd for en autonom agent som sparer dem for hundrevis av arbeidstimer.",
        keyFeatures: "Flerstegs web-research, hodeløs nettlesernavigasjon, isolerte MicroVM-kjøremiljøer og vedvarende minne.",
        encouragement: "Autonome agenter er fremtidens programvare. Å tilby dette under din egen merkevare plasserer deg helt i forkant av teknologiskiftet!"
      }
    }
  };

  const POSITIVE_OPENERS_EN = [
    "That is a brilliant question! ",
    "I love where your head is at! ",
    "What a fantastic strategic angle! ",
    "You are tapping into an incredible opportunity here! ",
    "Awesome insight! Let's break down the tremendous potential: "
  ];

  const POSITIVE_OPENERS_NO = [
    "Det er et glimrende spørsmål! ",
    "Fantastisk strategisk tankegang! ",
    "Her treffer du en utrolig spennende markedsmulighet! ",
    "Veldig godt tenkt! La oss se på det enorme potensialet: ",
    "Herlig initiativ! Dette er en kjempesjanse for den rette operatøren: "
  ];

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateAdvisorResponse(query) {
    const q = query.toLowerCase();
    const isNo = advisorLang === 'no';
    const K = isNo ? KNOWLEDGE_NO : KNOWLEDGE_EN;
    const openers = isNo ? POSITIVE_OPENERS_NO : POSITIVE_OPENERS_EN;

    // Pricing & Technical Ability Questions
    if (q.includes("pris") || q.includes("koster") || q.includes("kostnad") || q.includes("price") || q.includes("cost") || q.includes("how much") || q.includes("fee") || q.includes("rate") || q.includes("quote") || q.includes("teknisk") || q.includes("koding") || q.includes("skill") || q.includes("support")) {
      if (isNo) {
        return pickRandom(openers) + "Når det gjelder pris og lisensiering, **vil det avhenge av hvilken modell du velger og om du trenger noe skreddersøm eller spesielle integrasjoner, så dette tar vi en prat om sammen!**\n\n" +
          "Og her er det aller beste: **Du trenger overhodet INGEN teknisk kompetanse, kodeferdigheter eller SaaS-erfaring.** Vi tar oss av 100 % bak kulissene — inkludert skydrift, databaser, 24/7 teknisk support og kontinuerlige AI-oppgraderinger!\n\n" +
          "🎁 **Dette er ALLTID inkludert i alle whitelabel-pakker**:\n" +
          "• **100 % Whitelabel**: Din egen logo, dine farger og din profil.\n" +
          "• **Eget domene**: Kjører ferdig oppsatt på ditt eget domene (f.eks. app.dittbyra.no) med SSL.\n" +
          "• **Dedikerte konsulenttimer**: Egne utvikler- og bistandstimer er alltid inkludert for å tilpasse tekst, branding og oppsett til din lansering.\n" +
          "• **Full teknisk drift**: Serverdrift, sikkerhet og AI-motorer administreres av oss.\n\n" +
          "💡 **Tilleggsmoduler til svært rimelige priser**:\n" +
          "Skulle du ønske spesialbygde integrasjoner mot andre systemer eller unike moduler på sikt, er tilleggsfunksjoner tilgjengelig til svært forutsigbare og rimelige priser.\n\n" +
          "Vil du at jeg skal åpne **lisens- og forespørselsskjemaet** for deg nå, så kan vi se på et oppsett tilpasset dine mål?";
      } else {
        return pickRandom(openers) + "When it comes to pricing, **it will depend on what tier you choose and if there is any custom work required, so it needs to be discussed together!**\n\n" +
          "Here is the best part — **you need absolutely NO technical ability, coding skills, or experience.** We take care of everything behind the scenes, including all technical support, cloud hosting, databases, and AI model evolution!\n\n" +
          "🎁 **What is ALWAYS Included in Every Whitelabel Package**:\n" +
          "• **100% Whitelabel Branding**: Your logo, branding, and identity.\n" +
          "• **Your Custom Domain**: Fully configured on your chosen domain (e.g. app.yourcompany.com) with SSL.\n" +
          "• **Dedicated Custom Hours**: Extra custom development hours are always included to personalize workflows, copywriting, or settings for your launch.\n" +
          "• **Behind-The-Scenes Tech Management**: Full cloud hosting, 24/7 technical support, security, and edge deployments are 100% handled for you.\n\n" +
          "💡 **Add-Ons at Very Reasonable Prices**:\n" +
          "If you ever want extra custom integrations, special industry connections, or tailored features down the line, add-ons are available at very reasonable and accessible prices!\n\n" +
          "Would you like me to open the **Whitelabel Licensing Request form** so we can discuss the ideal tier and custom hours for your launch?";
      }
    }

    // Templates (50+ offline maler - kun ved forespørsel)
    if (q.includes("template") || q.includes("mal") || q.includes("maler") || q.includes("andre apper") || q.includes("other apps") || q.includes("skreddersøm") || q.includes("custom")) {
      if (isNo) {
        return pickRandom(openers) + "Finner du ingen apper av interesse blant de som vises her? **Vi har over 50 andre maler som for øyeblikket ikke ligger på nett.**\n\n" +
          "Disse ligger ikke fritt tilgjengelig, men **kan settes opp og tilpasses etter dine nøyaktige krav på kort tid**, slik at du får akkurat det du ønsker å skape!\n\n" +
          "Som alltid gjelder våre faste garantier:\n" +
          "• **Null teknisk kompetanse nødvendig**: Vi tar hånd om alt det tekniske, inkludert drift, hosting, eget domene og teknisk support.\n" +
          "• **100 % din egen merkevare**: Tilpasses med din logo og din profil.\n" +
          "• **Skreddersøm på kort tid**: Vi setter opp arkitekturen nøyaktig slik du vil ha den.\n\n" +
          "For å få tilgang til eller høre mer om disse malene må man sende en forespørsel. Vil du at jeg skal åpne **forespørselsskjemaet for maler** nå, så kan du fortelle hva du ønsker å skape?";
      } else {
        return pickRandom(openers) + "If you cannot find any apps of interest among those displayed, **we have more than 50 other templates that are not currently online!**\n\n" +
          "These templates are not publicly browsable, but **they can be set up with your own requirements in a short time to accommodate exactly what you want to create.**\n\n" +
          "Our standard turnkey promises always apply:\n" +
          "• **Zero technical ability needed**: We handle everything behind the scenes, including hosting, servers, custom domain, and full tech support.\n" +
          "• **100% Turnkey Whitelabel**: Delivered under your company branding.\n" +
          "• **Fast turnaround**: Configured to your exact specifications in days.\n\n" +
          "To access or learn more about these templates, you simply need to inquire. Would you like me to open the **Templates Inquiry Form** so you can describe what you want to create?";
      }
    }

    // Agenturer.no / Agentur / Forhandler
    if (q.includes("agentur") || q.includes("agenturer") || q.includes("forhandler") || q.includes("partner") || q.includes("distribusjon")) {
      if (isNo) {
        return pickRandom(openers) + "Så fantastisk at du fant oss via **Agenturer.no** (eller vurderer et agentur/forhandlerskap)!\n\n" +
          "Dette er en skreddersydd mulighet for deg som vil representere moderne KI-verktøy for det norske eller nordiske markedet:\n" +
          "• **100 % nøkkelferdig agentur / white-label**: Du kan opptre som lisenshaver eller forhandler under ditt eget merkenavn, eller distribuere løsningene til din eksisterende kundebase.\n" +
          "• **Ingen teknisk erfaring påkrevd**: Vi drifter servere, skymiljøer, databaser, oppdateringer og teknisk support 100 % for deg.\n" +
          "• **Solid inntjening (MRR)**: Du beholder opptil 100 % av de faste månedlige abonnementsinntektene.\n" +
          "• **Eget domene og tilpasningstimer inkludert**: Alt settes opp klart på din egen adresse (f.eks. app.dinbedrift.no), med inkluderte konsulenttimer til tilpasning.\n\n" +
          "Vil du at jeg skal åpne **lisens- og agenturskjemaet** nå, så kan vi se på den mest lønnsomme modellen for deg?";
      } else {
        return pickRandom(openers) + "Fantastic that you discovered us via **Agenturer.no** (or are exploring an agency / reseller partnership)!\n\n" +
          "This is an incredible opportunity to operate and distribute cutting-edge AI SaaS platforms in your market:\n" +
          "• **100% Turnkey Whitelabel Agency**: Rebrand completely under your own company name or sell into your existing client network.\n" +
          "• **Zero Technical Experience Needed**: We manage all cloud hosting, databases, technical support, and AI model upgrades for you.\n" +
          "• **High Recurring Profit Margins**: Keep up to 100% of the recurring monthly subscription revenue (MRR).\n" +
          "• **Custom Domain & Onboarding Hours Included**: Configured on your domain with included developer hours for customization.\n\n" +
          "Would you like me to open the **Licensing & Agency Request Form** so we can discuss the optimal partnership structure for you?";
      }
    }

    // Hubzoo
    if (q.includes("hubzoo") || q.includes("hubzoo") || q.includes("crm") || q.includes("salg") || q.includes("sales") || q.includes("håndverk") || q.includes("fiken") || q.includes("tripletex") || q.includes("quote")) {
      const a = K.apps.hubzoo;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** er en fantastisk løsning for håndverkere og servicenæringen!\n\n" +
          "🎯 **Markedsmulighet**: " + a.market + "\n\n" +
          "💰 **Inntjeningspotensial**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Kjernefordeler**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Vil du at jeg skal åpne lisensskjemaet for Hubzoo?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** is a total game-changer for service businesses and trades!\n\n" +
          "🎯 **Market Opportunity**: " + a.market + "\n\n" +
          "💰 **Whitelabel Potential**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Core Highlights**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Would you like me to open the inquiry form for Hubzoo?";
      }
    }

    // MaxMotion
    if (q.includes("maxmotion") || q.includes("video") || q.includes("wan") || q.includes("kling") || q.includes("minimax")) {
      const a = K.apps.maxmotion;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** plasserer deg midt i smørøyet for generativ video!\n\n" +
          "🎯 **Målgruppe**: " + a.market + "\n\n" +
          "💰 **Inntjeningspotensial**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Teknisk forsprang**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Vil du se nærmere på forretningsmodellen for MaxMotion AI?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** places you right at the crest of the generative video revolution!\n\n" +
          "🎯 **Target Market**: " + a.market + "\n\n" +
          "💰 **Whitelabel Potential**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Multi-Model Edge**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Would you like to explore the licensing model for MaxMotion AI?";
      }
    }

    // MediaBunny
    if (q.includes("mediabunny") || q.includes("audio") || q.includes("lyd") || q.includes("wasm") || q.includes("bakgrunn") || q.includes("bunny")) {
      const a = K.apps.mediabunny;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** er et teknologisk mesterverk innen nettleserprosessering!\n\n" +
          "🎯 **Målgruppe**: " + a.market + "\n\n" +
          "💰 **Operatørmarginer**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Kjerneteknologi**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Skal vi ta en prat om hvordan du kan lansere MediaBunny som ditt eget verktøy?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** is an absolute marvel of modern web engineering!\n\n" +
          "🎯 **Target Audience**: " + a.market + "\n\n" +
          "💰 **Operator Margins**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Key Tech**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Would you like to discuss launching MediaBunny under your brand?";
      }
    }

    // SubSentry
    if (q.includes("subsentry") || q.includes("abonnement") || q.includes("subscription") || q.includes("cancel") || q.includes("oppsig")) {
      const a = K.apps.subsentry;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** løser et av de mest irriterende hverdagsproblemene for folk og bedrifter!\n\n" +
          "🎯 **Markedsbehov**: " + a.market + "\n\n" +
          "💰 **Operatørpotensial**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Nøkkelfunksjoner**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Vil du ta en kikk på whitelabel-prospektet for SubSentry?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** solves one of the most relatable pain points in the modern economy!\n\n" +
          "🎯 **Market Demand**: " + a.market + "\n\n" +
          "💰 **Whitelabel Potential**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Key Capabilities**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Would you like to review the licensing prospectus for SubSentry?";
      }
    }

    // AppSave
    if (q.includes("appsave") || q.includes("rabatt") || q.includes("discount") || q.includes("coupon") || q.includes("honey") || q.includes("extension")) {
      const a = K.apps.appsave;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** er konstruert for lynrask og viral vekst!\n\n" +
          "🎯 **Målgruppe**: " + a.market + "\n\n" +
          "💰 **Inntektsmodell**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Kjernefordeler**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Ønsker du mer informasjon om å drifte AppSave som en merkevare?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** is engineered for viral, high-velocity adoption!\n\n" +
          "🎯 **Target Audience**: " + a.market + "\n\n" +
          "💰 **Revenue Model**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Key Features**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Would you like more details on operating AppSave as your brand?";
      }
    }

    // Upworkz
    if (q.includes("upwork") || q.includes("tilbud") || q.includes("søknad") || q.includes("proposal") || q.includes("freelanc")) {
      const a = K.apps.upworkz;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** er det ultimate hemmelige våpenet for å lande store kontrakter!\n\n" +
          "🎯 **Målgruppe**: " + a.market + "\n\n" +
          "💰 **Inntjeningspotensial**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Konkurransefortrinn**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Skal vi se på hvordan du kan lansere Upworkz mot frilansere og konsulenter?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** is the ultimate secret weapon for high-ticket deal making!\n\n" +
          "🎯 **Target Market**: " + a.market + "\n\n" +
          "💰 **Whitelabel Potential**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Winning Edge**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Shall we look at launching Upworkz to freelancers and consultants?";
      }
    }

    // Manus
    if (q.includes("manus") || q.includes("agent") || q.includes("autonom") || q.includes("handling")) {
      const a = K.apps.manus;
      if (isNo) {
        return pickRandom(openers) + "**" + a.name + "** setter deg helt i tet på autonome AI-handlingsagenter!\n\n" +
          "🎯 **Målgruppe**: " + a.market + "\n\n" +
          "💰 **Bedriftspotensial**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Banebrytende teknologi**: " + a.keyFeatures + "\n\n" +
          "💡 *Hvorfor du vil lykkes*: " + a.encouragement + "\n\n" +
          "Vil du ta en titt på bedriftslisensene for Manus AI Studio?";
      } else {
        return pickRandom(openers) + "**" + a.name + "** puts you at the absolute forefront of enterprise autonomous AI!\n\n" +
          "🎯 **Target Market**: " + a.market + "\n\n" +
          "💰 **Whitelabel Potential**: " + a.whitelabelPotential + "\n\n" +
          "⚡ **Cutting-Edge Tech**: " + a.keyFeatures + "\n\n" +
          "💡 *Why you'll succeed*: " + a.encouragement + "\n\n" +
          "Would you like to explore enterprise licensing for Manus AI Studio?";
      }
    }

    // Default High-Energy Advisor Guide
    if (isNo) {
      return pickRandom(openers) + "Jeg er din dedikerte AI Whitelabel-rådgiver, og jeg er her for å hjelpe deg i gang med en lønnsom programvarebedrift!\n\n" +
        "Vi har 7 produksjonstestede AI-plattformer klare til utrulling under din merkevare:\n" +
        "• **Hubzoo** — Salgsassistent for håndverkere (60s tilbud på mobilen & Fiken/Tripletex)\n" +
        "• **MaxMotion AI** — Multi-modell generativt videostudio\n" +
        "• **MediaBunny** — Klientside medie- og lydsuite med nær 100 % fortjeneste\n" +
        "• **SubSentry** — Abonnementsvakt og 1-klikks oppsigelse\n" +
        "• **AppSave** — 'Honey' for SaaS-rabatter og affiliate-inntekter\n" +
        "• **Upworkz** — AI-tilbudsarkitekt for store frilansoppdrag\n" +
        "• **Manus AI Studio** — Autonom datamaskinagent for bedrifter\n\n" +
        "Husk at du trenger **null tekniske forkunnskaper** — vi ordner all hosting, support og eget domene. Hvilken bransje eller kundegruppe ønsker du å satse på?";
    } else {
      return pickRandom(openers) + "I am your dedicated AI Whitelabel Advisor, and I am thrilled to help you build an extraordinary software business!\n\n" +
        "We have 7 battle-tested AI platforms ready for your brand:\n" +
        "• **Hubzoo** — SMB Sales Agent & 60s Quotes\n" +
        "• **MaxMotion AI** — Multi-Model Generative Video Studio\n" +
        "• **MediaBunny** — Zero-cloud-cost on-device media suite\n" +
        "• **SubSentry** — Subscription watchdog & cancellation shield\n" +
        "• **AppSave** — Honey-style SaaS discount extension\n" +
        "• **Upworkz** — AI proposal closing architect\n" +
        "• **Manus AI Studio** — Autonomous action agent\n\n" +
        "Remember: you need **zero technical knowledge** — we take care of all servers, tech support, custom domain, and included development hours. What audience would you love to target?";
    }
  }

  // Setup UI Widget
  function initAdvisorUI() {
    let fab = document.getElementById('advisor-fab-trigger');
    if (!fab) {
      fab = document.createElement('button');
      fab.className = 'advisor-floating-btn';
      fab.id = 'advisor-fab-trigger';
      document.body.appendChild(fab);
    }
    updateFabText();

    let chatWin = document.getElementById('advisor-chat-window');
    if (!chatWin) {
      chatWin = document.createElement('div');
      chatWin.className = 'advisor-chat-window';
      chatWin.id = 'advisor-chat-window';
      document.body.appendChild(chatWin);
    }
    renderChatWindowContent(chatWin);

    window.updateAdvisorLanguage = function (newLang) {
      advisorLang = newLang;
      updateFabText();
      renderChatWindowContent(chatWin);
    };
  }

  function updateFabText() {
    const fab = document.getElementById('advisor-fab-trigger');
    if (!fab) return;
    const isNo = advisorLang === 'no';
    fab.innerHTML = `
      <span class="advisor-badge-pulse">✨</span>
      <span>${isNo ? 'AI Whitelabel-Rådgiver' : 'AI Whitelabel Advisor'}</span>
    `;
  }

  function renderChatWindowContent(chatWin) {
    const isNo = advisorLang === 'no';
    chatWin.innerHTML = `
      <div class="advisor-chat-header">
        <div class="advisor-header-info">
          <div class="advisor-avatar">🤖</div>
          <div class="advisor-title-text">
            <h4>${isNo ? 'Whitelabel Vekstrådgiver' : 'Whitelabel Growth Advisor'}</h4>
            <p>${isNo ? 'Alltid påkoblet · Ekspert på SaaS' : 'Always Online · Expert AI Guidance'}</p>
          </div>
        </div>
        <button class="advisor-close-btn" id="advisor-close-btn" title="Lukk">✕</button>
      </div>

      <div class="advisor-chat-messages" id="advisor-messages-box">
        <div class="advisor-msg agent">
          <div class="advisor-bubble">
            <p><strong>${isNo ? 'Velkommen! Så gøy at du sjekker ut porteføljen vår. 🚀' : 'Welcome! I\'m thrilled you\'re exploring our portfolio. 🚀'}</strong></p>
            <p>${isNo ? 'Jeg kjenner alle de 7 SaaS-appene, lisensmodellene i BizBox, og hvordan du kan bygge solide månedlige inntekter — helt uten kodekunnskap.' : 'I am trained on all 7 of our SaaS platforms, the BizBox licensing models, and monetization strategies for agencies and operators.'}</p>
            <p>${isNo ? 'Hva kan jeg hjelpe deg med å utforske i dag?' : 'How can I help you discover the perfect software business to launch today?'}</p>
          </div>
          <span class="advisor-msg-time">${isNo ? 'Akkurat nå' : 'Just now'}</span>
        </div>
      </div>

      <div class="advisor-chips-container">
        <button class="advisor-chip-btn" data-query="${isNo ? 'Må jeg kunne koding eller teknikk?' : 'Do I need technical skills?'}">${isNo ? '🛠️ Null teknisk krav' : '🛠️ Zero Tech Skills Needed'}</button>
        <button class="advisor-chip-btn" data-query="${isNo ? 'Hva koster lisensene og hva følger med?' : 'How does licensing pricing work?'}">${isNo ? '💰 Priser & Hva som inngår' : '💰 Licensing Pricing'}</button>
        <button class="advisor-chip-btn" data-query="${isNo ? 'Fortell om Hubzoo for håndverkere' : 'Tell me about Hubzoo'}">${isNo ? '⚡ Hubzoo' : '⚡ Hubzoo Opportunity'}</button>
        <button class="advisor-chip-btn" data-query="${isNo ? 'Hvordan fungerer Leie-til-eie?' : 'How does Lease-to-Own work?'}">${isNo ? '🔑 Leie-til-eie' : '🔑 Lease-to-Own'}</button>
        <button class="advisor-chip-btn" data-query="${isNo ? 'Hvor mye kan jeg tjene?' : 'How much MRR can I generate?'}">${isNo ? '📈 Inntektskalkyle' : '📈 Revenue Math'}</button>
      </div>

      <div class="advisor-chat-input-bar">
        <input type="text" id="advisor-user-input" class="advisor-input-field" placeholder="${isNo ? 'Still spørsmål om apper, priser eller marked...' : 'Ask about pricing, custom work, or market potential...'}" />
        <button id="advisor-send-btn" class="advisor-send-btn" title="Send">➤</button>
      </div>
    `;

    // Wire up events
    const fab = document.getElementById('advisor-fab-trigger');
    const closeBtn = document.getElementById('advisor-close-btn');
    const inputField = document.getElementById('advisor-user-input');
    const sendBtn = document.getElementById('advisor-send-btn');
    const msgBox = document.getElementById('advisor-messages-box');
    const chips = chatWin.querySelectorAll('.advisor-chip-btn');

    function toggleChat(open) {
      if (open !== undefined) {
        if (open) chatWin.classList.add('open');
        else chatWin.classList.remove('open');
      } else {
        chatWin.classList.toggle('open');
      }
      if (chatWin.classList.contains('open')) {
        setTimeout(() => inputField.focus(), 200);
      }
    }

    fab.onclick = () => toggleChat(true);
    closeBtn.onclick = () => toggleChat(false);

    function appendMessage(sender, text) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'advisor-msg ' + sender;
      
      const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br/>');

      msgDiv.innerHTML = `
        <div class="advisor-bubble">
          <p>${formattedText}</p>
        </div>
        <span class="advisor-msg-time">${advisorLang === 'no' ? 'Akkurat nå' : 'Just now'}</span>
      `;
      msgBox.appendChild(msgDiv);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    function handleSend(userText) {
      const text = userText || inputField.value.trim();
      if (!text) return;

      appendMessage('user', text);
      if (!userText) inputField.value = '';

      setTimeout(() => {
        const reply = generateAdvisorResponse(text);
        appendMessage('agent', reply);
      }, 350);
    }

    sendBtn.onclick = () => handleSend();
    inputField.onkeydown = (e) => {
      if (e.key === 'Enter') handleSend();
    };

    chips.forEach(chip => {
      chip.onclick = () => handleSend(chip.dataset.query);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvisorUI);
  } else {
    initAdvisorUI();
  }
})();
