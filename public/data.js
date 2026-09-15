// ============================================================================
// AI APPS PORTFOLIO - ACCURATE PRODUCT SPECIFICATIONS & WHITELABEL DATA
// Grounded strictly in real features, technical specs, and commercial models.
// ============================================================================

const APPS_DATA = [
  {
    id: "hubzoo",
    name: "Hubzoo",
    alias: "hubzoo.ai.studio",
    url: "https://hubzoo.ai.studio",
    domain: "hubzoo.ai.studio",
    category: "sales-crm",
    categoryLabel: "Sales & Autonomous CRM",
    statusBadge: "Active Production",
    statusType: "live",
    accentColor: "#10b981",
    tagline: "Your Autonomous Sales Partner: Never Lose a Deal to Slow Follow-Up",
    shortDescription: "A hands-free digital sales agent and streamlined CRM built for busy SMBs, contractors, and consultants. It captures inbound leads, drafts professional quotes in under 60 seconds, and follows up across Email, WhatsApp, and SMS automatically.",
    tags: [
      { label: "Platform Type", val: "SMB Sales Agent & CRM" },
      { label: "Follow-Up Channels", val: "Email, WhatsApp, SMS" },
      { label: "Accounting Bridge", val: "Tripletex & Fiken" },
      { label: "Licensing Model", val: "Whitelabel & Buyout Ready" }
    ],
    mockupType: "hubzoo-ui",
    deepDive: {
      headline: "The Relentless Sales Engine That Works Even When You're On The Job",
      problemSolution: `
        <p class="lead-text">
          Most small and mid-sized business owners don't lose sales because their work isn't good enough—they lose them because they're simply too busy to reply in time. When a hot inquiry arrives on Monday and you only get around to emailing a quote on Thursday evening, that prospect has almost certainly hired your competitor.
        </p>
        <p>
          <strong>Hubzoo fixes the broken speed-to-lead equation.</strong> Instead of forcing you to sit down at a laptop after a long workday, Hubzoo acts as your 24/7 digital sales assistant. It ingests new leads, prepares accurate proposals from your phone in under a minute, and nurtures every prospect with thoughtful, human-sounding follow-ups until the deal is won.
        </p>
      `,
      coreFunctions: [
        {
          title: "60-Second Mobile Quote Builder",
          icon: "⚡",
          summary: "Generate branded, customer-ready proposals directly from your smartphone while standing in front of the client.",
          details: "Eliminates late-night paperwork. Select items, adjust margins, and dispatch clean PDF or web proposals with one-tap client acceptance."
        },
        {
          title: "Autonomous Multi-Channel Follow-Up",
          icon: "🤖",
          summary: "Scheduled, context-aware touchpoints via Email, WhatsApp, and SMS that keep deals alive.",
          details: "If a client hasn't answered in 48 hours, Hubzoo sends a friendly, natural nudge. After 5 days, it checks if they have questions."
        },
        {
          title: "Nordic Accounting & ERP Bridge",
          icon: "📊",
          summary: "Direct two-way synchronization with local accounting engines like Fiken and Tripletex.",
          details: "Once a quote is approved, customer records and invoice rows flow straight into your bookkeeping software without manual re-entry."
        },
        {
          title: "Intelligent Inbound Inquiry Scanner",
          icon: "📥",
          summary: "Reads incoming emails and web forms, parses requirements, and drafts the initial response instantly.",
          details: "Powered by Gemini language intelligence to recognize project scope, timeline, and urgency, presenting you with a ready-to-send draft."
        }
      ],
      userBenefits: [
        {
          title: "Zero Lost Inquiries",
          metric: "Complete Capture",
          desc: "Every email, text, or lead form enters a clean, prioritized board where nothing falls through the cracks."
        },
        {
          title: "Reclaim Your Evenings",
          metric: "Hours Saved Weekly",
          desc: "Say goodbye to late-night quotation writing and tedious payment chasers. Your assistant runs the pipeline."
        },
        {
          title: "Faster Conversion",
          metric: "Sub-5 Min Replies",
          desc: "Responding in minutes rather than days immediately elevates your credibility and locks in eager customers."
        },
        {
          title: "Frictionless Client Signing",
          metric: "1-Tap Approval",
          desc: "Clients can approve quotes on their mobile phone with a single tap, accelerating your cash flow."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Every marketing agency, web design shop, and IT consultant has clients in the trades, professional services, and consulting who struggle with sales admin. Offering them Hubzoo under your own brand creates an irresistible high-retention monthly subscription.
          </p>
          <p>
            You control the domain, the logos, and the monthly subscription rates. You charge your clients $49 to $149/month for access to their customized sales agent, while BizBox and our underlying cloud manage hosting, AI compute, and feature upgrades behind the scenes.
          </p>
        `,
        models: [
          {
            tier: "Non-Exclusive Turnkey Whitelabel",
            price: "Setup: $1,490 + $290/mo SLA",
            features: [
              "Zero technical skill required — we manage hosting, servers & tech support",
              "100% custom branding, your logo & custom domain included",
              "Dedicated custom development hours included with your launch",
              "Keep 100% of all end-user client subscription revenue",
              "Add-ons & custom modules available at very reasonable prices"
            ]
          },
          {
            tier: "Lease-to-Own License",
            price: "From $590/mo (70% Equity Credit)",
            features: [
              "Zero technical skill required — fully managed infrastructure & support",
              "Whitelabel, domain setup & initial custom hours always included",
              "70% of every monthly payment counts toward full code buyout",
              "Affordable add-ons available anytime for custom integrations"
            ]
          },
          {
            tier: "Full Master Buyout & IP Transfer",
            price: "Valuation upon inquiry (Source Code + IP)",
            features: [
              "Complete GitHub repository & full source code IP copyright transfer",
              "Includes engineering handover, architecture walkthrough & custom hours",
              "Deploy on your own cloud or let our team handle deployment for you",
              "Zero ongoing royalties or platform fees — unlimited sub-licensing"
            ]
          }
        ],
        revenuePotential: "Turnkey recurring revenue model: at 50 local business clients paying $79/mo, you generate $3,950 MRR with zero engineering workload."
      }
    },
    techStack: {
      headline: "Engineered for Extreme Reliability & Frictionless Daily Use",
      summary: "Hubzoo is built on a resilient, modern cloud stack designed to operate silently and reliably on mobile networks, syncing effortlessly with enterprise ERPs and AI engines.",
      stackPills: ["Next.js 14 App Router", "TypeScript", "Tailwind CSS", "Gemini 2.5 Flash", "PostgreSQL / Prisma", "Stripe & Vipps", "Tripletex / Fiken Webhooks", "Vercel Edge"],
      durabilityPillars: [
        {
          title: "Fault-Tolerant Multi-Channel Webhooks",
          icon: "🛡️",
          desc: "Built with transactional queue workers and automatic exponential retry loops. If an SMS or email provider experiences downtime, the message is safely held in memory and dispatched the moment connectivity recovers."
        },
        {
          title: "Lightweight Mobile-First PWA Architecture",
          icon: "📱",
          desc: "Zero bloat. Loads in under 800ms on 4G connections. Craftsmen and contractors can open the app on job sites with spotty reception and rely on offline-ready caching."
        },
        {
          title: "Rigorous Data Isolation & Privacy",
          icon: "🔒",
          desc: "Full GDPR compliance with tenant-isolated database schemas. Client customer lists, pricing books, and confidential quotes remain strictly private with AES-256 encryption at rest."
        },
        {
          title: "Clean Accounting System Decoupling",
          icon: "⚡",
          desc: "Modular integration adapters for Nordic and international ERPs. If an external accounting API changes its spec, Hubzoo's isolated bridge updates without disrupting core CRM workflows."
        }
      ],
      continuousEvolution: `
        <p>
          The generative AI landscape shifts constantly. Hubzoo's architecture uses a decoupled prompt-and-model gateway. We continually benchmark new reasoning engines (such as the latest Gemini 2.5 and 3.x series) to increase lead extraction accuracy and reduce latency.
        </p>
        <p>
          As an operator or business user, your software stays permanently updated. Core improvements, security patches, and AI model upgrades deploy silently to the edge.
        </p>
      `
    }
  },

  {
    id: "maxmotion",
    name: "MaxMotion AI",
    alias: "maxmotion.ai.studio",
    url: "https://maxmotion.ai.studio",
    domain: "maxmotion.ai.studio",
    category: "media-video",
    categoryLabel: "Generative Video & Media",
    statusBadge: "Active Production",
    statusType: "live",
    accentColor: "#8b5cf6",
    tagline: "Next-Gen Multi-Model Generative Video Studio for Creative Directors",
    shortDescription: "A cinematic video production suite bringing the world's most powerful AI video models (Wan 2.1, Kling 1.5 Pro, Minimax Hailuo, and Seedance 2.0) into a unified workspace with timeline sequencing, prompt directives, and BYOK flexibility.",
    tags: [
      { label: "Core Engines", val: "Wan 2.1, Kling, Minimax, Seedance" },
      { label: "Asset Storage", val: "Permanent Google Cloud Storage" },
      { label: "Billing Architecture", val: "Credit Packs + BYOK (0% Fee)" },
      { label: "Licensing Model", val: "Whitelabel & Buyout Ready" }
    ],
    mockupType: "maxmotion-ui",
    deepDive: {
      headline: "Why Limit Yourself to One AI Model When You Can Command the Best of All?",
      problemSolution: `
        <p class="lead-text">
          No single AI video engine is the best at everything. Wan 2.1 produces unmatched 35mm film grain and atmospheric landscapes. Kling 1.5 Pro dominates human anatomy and physical dynamics. Minimax Hailuo captures nuanced facial micro-expressions, while Seedance unleashes high-energy action.
        </p>
        <p>
          Before MaxMotion, creators had to jump between multiple disjointed apps and juggle separate subscriptions. <strong>MaxMotion AI unites the premier video generation engines into one master canvas.</strong> Switch models with a click, sequence scenes on a timeline, and store master assets permanently without expiring links.
        </p>
      `,
      coreFunctions: [
        {
          title: "Multi-Model Orchestration Engine",
          icon: "🎬",
          summary: "Direct access to Wan 2.1, Kling 1.5 Pro, Minimax Hailuo, and Seedance 2.0 within a single workspace.",
          details: "Never be constrained by a single model's limitations. Choose the ideal camera, motion profile, and render engine for each specific scene."
        },
        {
          title: "Visual Sequencer & Storyboard",
          icon: "🎞️",
          summary: "Arrange shots into a continuous visual narrative with cuts, transitions, and audio sync.",
          details: "Move beyond isolated 5-second clips. Build complete commercial ads, trailers, and social campaigns in a multi-track sequencer."
        },
        {
          title: "Permanent Google Cloud Storage",
          icon: "☁️",
          summary: "Every render is automatically mirrored to secure, permanent cloud storage that never expires.",
          details: "Unlike platforms whose links break after 24 hours, MaxMotion keeps your raw renders and master exports safe forever with high-speed CDN delivery."
        },
        {
          title: "Flexible Billing: Credit Packs or BYOK",
          icon: "💳",
          summary: "Support for both casual credit users and enterprise creators who want to bring their own API keys.",
          details: "Casual users buy instant GPU credit packs via Stripe. Power users plug in their Fal.ai or MuAPI token for wholesale rates."
        }
      ],
      userBenefits: [
        {
          title: "Uncompromising Quality",
          metric: "4 Engines in 1",
          desc: "Always use the exact right AI engine for human faces, physical action, or atmospheric cinematography."
        },
        {
          title: "Rapid Production",
          metric: "Concept to Reel",
          desc: "Produce agency-grade commercial concepts, storyboards, and final videos in a fraction of traditional studio time."
        },
        {
          title: "Permanent Asset Access",
          metric: "Zero Broken Links",
          desc: "Share links with clients anytime with persistent, embeddable video links (/v/[id])."
        },
        {
          title: "Cost Flexibility",
          metric: "Wholesale or Packs",
          desc: "Prototype fast on Seedance Mini at 50% discount or scale up to Hollywood 8K renders."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Generative video is the fastest-growing sector in modern creative media. Agencies, production studios, and digital creators are actively looking for branded video suites they can offer their clients and internal teams.
          </p>
          <p>
            As a MaxMotion whitelabel operator, you launch a fully branded AI Video Studio. You set your own credit packages and pricing tiers, capturing healthy gross margins on pure compute arbitrage, while your customers get an elite production studio.
          </p>
        `,
        models: [
          {
            tier: "Turnkey Agency Studio Whitelabel",
            price: "Setup: $2,490 + $390/mo Hosting & SLA",
            features: [
              "Custom domain, brand colors, studio splash & logos",
              "Set your own Stripe credit pricing tiers and markup rates",
              "Automated upstream GPU routing to Fal.ai, MuAPI & Replicate",
              "Turnkey user authentication & personal asset gallery"
            ]
          },
          {
            tier: "Studio Lease-to-Own",
            price: "From $890/mo (70% Equity Credit)",
            features: [
              "Test market appetite and build your subscriber base first",
              "70% of lease fees credited directly against eventual code buyout",
              "Includes priority model updates and continuous GPU pipeline maintenance",
              "Full access to admin telemetry and token consumption metrics"
            ]
          },
          {
            tier: "Master Video Engine Buyout",
            price: "Valuation upon inquiry (Source Code + IP)",
            features: [
              "Complete codebase transfer including custom React Sequencer",
              "Proprietary multi-engine prompt optimizer and model router",
              "Zero platform revenue share or licensing fees forever",
              "Complete freedom to deploy on private GPU clusters"
            ]
          }
        ],
        revenuePotential: "Turnkey video studio monetization: resale of GPU credits and agency subscriptions with low platform maintenance."
      }
    },
    techStack: {
      headline: "High-Throughput GPU Orchestration & Resilient Media Delivery",
      summary: "Rendering generative video requires an ironclad architecture capable of asynchronous queue management, webhook retries, and high-bandwidth video streaming.",
      stackPills: ["Next.js 15", "TypeScript", "Tailwind CSS", "Fal.ai & MuAPI Gateway", "Google Cloud Storage", "Redis / BullMQ", "Stripe Connect", "Model Context Protocol (MCP)"],
      durabilityPillars: [
        {
          title: "Asynchronous Polling & Resilient Webhook Queues",
          icon: "🔄",
          desc: "AI video generation takes 30 to 180 seconds. MaxMotion uses an event-driven queue with Redis that never drops a generation job even if the user's browser closes or the upstream GPU server stutters."
        },
        {
          title: "Intelligent Multi-Provider Failover",
          icon: "🛡️",
          desc: "If one GPU provider experiences high wait times or rate limiting, the platform automatically reroutes requests to secondary upstream endpoints without user disruption."
        },
        {
          title: "Permanent Object Mirroring",
          icon: "🗄️",
          desc: "Upstream video endpoints delete files after 1–24 hours. MaxMotion's backend intercepts completed video buffers immediately and streams them to your permanent Google Cloud Storage bucket."
        },
        {
          title: "Optimized HLS & MP4 Streaming Delivery",
          icon: "⚡",
          desc: "Automated video transcoder profiles prepare outputs with optimized fast-start atoms (moov atom up front) for instant, lag-free playback on mobile, Twitter, Discord, and messaging apps."
        }
      ],
      continuousEvolution: `
        <p>
          The pace of change in generative video is rapid—new models emerge frequently. MaxMotion's modular engine abstraction treats AI video models as hot-swappable plugins.
        </p>
        <p>
          When new versions of Wan, Kling, or open-weight models drop, they are integrated within days through our universal parameter mapper. Operators and users always have access to current generation capabilities.
        </p>
      `
    }
  },

  {
    id: "mediabunny",
    name: "MediaBunny",
    alias: "mediabunny.ai.studio",
    url: "https://mediabunny.ai.studio",
    domain: "mediabunny.ai.studio",
    category: "media-video",
    categoryLabel: "AI Media Processing & Audio",
    statusBadge: "Active Production",
    statusType: "live",
    accentColor: "#f59e0b",
    tagline: "The Swiss-Army Knife for AI Media Processing, Audio & Video Optimization",
    shortDescription: "A lightning-fast, all-in-one browser media studio. Performs on-device AI background removal, studio-grade EBU R128 audio loudness normalization, CRF video compression, format conversions, and batch operations, guided by an interactive AI assistant (BunnyBot).",
    tags: [
      { label: "Image Processing", val: "On-Device AI Background Cut" },
      { label: "Audio Standard", val: "EBU R128 Normalization" },
      { label: "Video Optimization", val: "CRF Smart Compression" },
      { label: "AI Copilot", val: "BunnyBot (Gemini 3.7)" }
    ],
    mockupType: "mediabunny-ui",
    deepDive: {
      headline: "Stop Paying for 5 Different Media Converters: One Workspace Does It All",
      problemSolution: `
        <p class="lead-text">
          Digital creators, marketing teams, and developers constantly juggle clunky online converters, ad-riddled image compressors, and complicated desktop audio tools just to prepare assets for publishing.
        </p>
        <p>
          <strong>MediaBunny is the modern, ad-free media utility.</strong> It combines high-performance WebAssembly processing with cutting-edge Gemini AI to handle image backgrounds, audio loudness standards, video compression, and batch transformations—instantly and securely without uploading raw files to third-party servers.
        </p>
      `,
      coreFunctions: [
        {
          title: "On-Device AI Background Removal",
          icon: "✂️",
          summary: "Isolate subjects and export transparent PNGs or WebP files without uploading sensitive photos to third-party servers.",
          details: "Runs high-precision edge neural models directly in the browser via WebAssembly. Ideal for eCommerce product photography and marketing banners."
        },
        {
          title: "Broadcast Audio Normalization (EBU R128)",
          icon: "🎙️",
          summary: "Calibrate podcast, video, and commercial voice tracks to official streaming loudness standards (-14 LUFS to -23 LUFS).",
          details: "True-peak limiting prevents harsh digital clipping and ensures audio sounds balanced on Spotify, YouTube, and podcasts."
        },
        {
          title: "Smart CRF Video Compression",
          icon: "🗜️",
          summary: "Shrink video file sizes by up to 75% with zero perceptible loss in visual clarity.",
          details: "Optimized presets for Instagram Reels, TikTok, YouTube Shorts, and web hero backgrounds. Converts smoothly between MP4, WebM, and GIF."
        },
        {
          title: "Batch Workflows & 1-Click ZIP Exports",
          icon: "📦",
          summary: "Drop dozens of assorted files at once, apply unified resizing, format change, and compression, and download as a single archive.",
          details: "Massively accelerates agency production days, turning repetitive export clicks into a fast, single-step operation."
        }
      ],
      userBenefits: [
        {
          title: "On-Device Privacy",
          metric: "Zero Server Uploads",
          desc: "Key transformations execute locally in-browser via WebAssembly, protecting confidential client media."
        },
        {
          title: "Lightweight Web Assets",
          metric: "WebP & AVIF",
          desc: "Convert heavy JPGs and PNGs to modern formats that dramatically speed up website loading."
        },
        {
          title: "Broadcast Standards",
          metric: "Calibrated LUFS",
          desc: "Deliver clear, authoritative sound across all video and podcast distribution channels."
        },
        {
          title: "Interactive Guidance",
          metric: "BunnyBot AI",
          desc: "Ask BunnyBot anything about codecs, aspect ratios, bitrate targets, and optimal export parameters."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Every digital agency, web design company, and content studio needs clean media processing tools for their staff and clients. Rather than sending your clients to external sites full of ads and trackers, you can own the experience.
          </p>
          <p>
            White-labeling MediaBunny gives you a sticky utility that keeps users returning to your branded ecosystem. Because high-computation image and audio tasks run on client hardware via WebAssembly, your server overhead is near zero.
          </p>
        `,
        models: [
          {
            tier: "Turnkey Utility Whitelabel",
            price: "Setup: $1,290 + $190/mo Maintenance",
            features: [
              "Your custom branding, favicon, domain, and color palette",
              "Customized BunnyBot AI system prompt matching your company voice",
              "Zero ad banners or third-party links",
              "Direct Google Analytics & customer telemetry integration"
            ]
          },
          {
            tier: "Agency Lease-to-Own",
            price: "From $490/mo (70% Equity Credit)",
            features: [
              "Deploy immediately with minimal initial capital expenditure",
              "70% of lease fees build equity toward outright ownership",
              "Includes ongoing updates to WebAssembly encoders & codec profiles",
              "Priority assistance for custom codec or workflow integrations"
            ]
          },
          {
            tier: "Master Software Buyout",
            price: "Valuation upon inquiry (Source Code + IP)",
            features: [
              "Complete React & WebAssembly engine source code transfer",
              "Deploy on your own private cloud or package as an Electron desktop app",
              "Unlimited sub-licensing and commercial distribution rights",
              "No royalties or recurring licensing fees"
            ]
          }
        ],
        revenuePotential: "High-margin utility platform: low cloud compute overhead because conversions run client-side in the browser."
      }
    },
    techStack: {
      headline: "The Power of In-Browser WebAssembly & Edge Intelligence",
      summary: "MediaBunny is engineered with a hybrid client-edge philosophy: heavy audio/video transformations happen right in the user's browser via high-speed WebAssembly, backed by Gemini models for intelligent analysis.",
      stackPills: ["React 18", "TypeScript", "Tailwind CSS", "FFmpeg.wasm", "WebAssembly (WASM)", "Gemini 3.7 Flash API", "Vite Bundler", "Service Worker Cache"],
      durabilityPillars: [
        {
          title: "In-Browser WebAssembly Acceleration",
          icon: "⚡",
          desc: "Utilizes compiled C/C++ libraries (FFmpeg and specialized audio filters) running inside WebAssembly threads. This means zero server video rendering costs and near-instant processing without upload lag."
        },
        {
          title: "Zero Data Leakage Architecture",
          icon: "🛡️",
          desc: "Because media never leaves the user's local machine for core compression and conversions, enterprise clients can safely process confidential media without compliance breaches."
        },
        {
          title: "EBU R128 Mathematical Sound Engine",
          icon: "🎚️",
          desc: "Strict adherence to the ITU-R BS.1770-4 standard for loudness measurement, providing accurate integrated LUFS and true-peak dBTP limiting across any audio format."
        },
        {
          title: "Resilient Offline & PWA Capability",
          icon: "📦",
          desc: "The entire core processing toolkit can function offline once cached by service workers, making it a reliable tool for traveling creators."
        }
      ],
      continuousEvolution: `
        <p>
          Media codecs and web graphics evolve rapidly—AVIF, JPEG XL, and WebCodecs API are transforming browser performance. MediaBunny is continually updated with newly compiled WebAssembly binaries to support the most efficient compression algorithms.
        </p>
        <p>
          The embedded AI assistant (BunnyBot) is linked directly to modern Gemini Flash endpoints, ensuring it answers questions with the newest best practices for YouTube, TikTok, and web standards.
        </p>
      `
    }
  },

  {
    id: "subsentry",
    name: "SubSentry",
    alias: "subsentry.ai.studio",
    url: "https://subsentry.ai.studio",
    domain: "subsentry.ai.studio",
    category: "saas-finance",
    categoryLabel: "SaaS Protection & Subscription Telemetry",
    statusBadge: "Active Production",
    statusType: "live",
    accentColor: "#0ea5e9",
    tagline: "Subscription Watchdog, 1-Click Cancellation CMS & Deceptive Pattern Shield",
    shortDescription: "A defensive subscription intelligence platform for modern consumers and businesses. Monitors recurring SaaS spending, exposes manipulative retention tricks ('dark patterns'), provides step-by-step 1-click cancellation playbooks, and suggests high-value affiliate alternatives.",
    tags: [
      { label: "Core Feature", val: "1-Click Cancellation CMS" },
      { label: "Protection", val: "Dark Pattern Detector" },
      { label: "Revenue Engine", val: "Affiliate Alternative Switch" },
      { label: "Licensing Model", val: "Whitelabel & Buyout Ready" }
    ],
    mockupType: "subsentry-ui",
    deepDive: {
      headline: "Turn Subscription Bloat and Sneaky Price Hikes into Pure Savings",
      problemSolution: `
        <p class="lead-text">
          Companies frequently engineer convoluted cancellation funnels, hidden phone-in requirements, and sudden price increases after free trials. The average business pays for multiple subscriptions they no longer use, accumulating unnecessary monthly charges.
        </p>
        <p>
          <strong>SubSentry is a dedicated financial shield.</strong> It tracks recurring SaaS commitments, flags sneaky renewal traps before charges occur, provides step-by-step verified cancellation paths, and—when a user wants to cancel an overpriced tool—recommends modern, cost-effective alternatives.
        </p>
      `,
      coreFunctions: [
        {
          title: "Deceptive Dark Pattern Detection",
          icon: "🛡️",
          summary: "Real-time telemetry flagging manipulative checkout traps, forced annual commitments, and hidden cancellation hurdles.",
          details: "Warns users before entering credit card information on high-friction platforms, scoring merchants on subscription transparency."
        },
        {
          title: "1-Click Cancellation Playbook CMS",
          icon: "📋",
          summary: "A continuously updated database of direct cancellation links, step-by-step instructions, and legally compliant termination templates.",
          details: "Bypasses convoluted customer service mazes with direct links to hidden cancellation settings pages."
        },
        {
          title: "Intelligent Alternative Switch Engine",
          icon: "🔄",
          summary: "When a user flags a tool to cancel, SubSentry presents better, cheaper, or open-source alternatives.",
          details: "Monetized via built-in affiliate partnerships. If someone cancels an overpriced tool, SubSentry recommends a modern, cost-effective alternative."
        },
        {
          title: "AI Subscription Expert (Gemini 3.7)",
          icon: "🤖",
          summary: "An on-demand analyst that reviews contract terms, renewal clauses, and negotiate-down scripts.",
          details: "Drafts formal corporate cancellation letters under local consumer protection laws (GDPR, FTC rules)."
        }
      ],
      userBenefits: [
        {
          title: "Zero Surprise Charges",
          metric: "Renewal Alerts",
          desc: "Never let a free trial slip into an expensive annual charge with automated reminder alerts."
        },
        {
          title: "Measurable Savings",
          metric: "Reduced SaaS Bloat",
          desc: "Identify and eliminate dormant licenses across teams and personal workflows."
        },
        {
          title: "Direct Cancellation",
          metric: "Step-by-Step Paths",
          desc: "Skip agonizing support chat queues with exact click paths and direct URLs."
        },
        {
          title: "Vetted Alternatives",
          metric: "Modern Software",
          desc: "Discover alternative tools that respect user privacy and offer transparent pricing."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Subscription audit and financial wellness are high-demand areas for fintechs, accounting practices, and business media publishers. SubSentry offers a dual-engine monetization model.
          </p>
          <p>
            You can generate upfront revenue through premium subscription monitoring plans, while simultaneously capturing affiliate revenue when an active user replaces an old subscription with a recommended partner tool.
          </p>
        `,
        models: [
          {
            tier: "Fintech & Agency Whitelabel",
            price: "Setup: $1,990 + $290/mo Hosting & Rule Feeds",
            features: [
              "Custom domain, branded user dashboard, and admin control hub",
              "Route all alternative recommendations to your own affiliate partner IDs",
              "Integrated Stripe subscription billing for your end-users",
              "Continuous automated sync with the master Cancellation CMS directory"
            ]
          },
          {
            tier: "Lease-to-Own Operator License",
            price: "From $690/mo (70% Equity Credit)",
            features: [
              "Launch a turnkey SaaS watchdog portal with zero engineering overhead",
              "70% of lease payments credited toward total IP acquisition",
              "Full telemetry stream of dark patterns and user cancellation volumes",
              "Customizable email notifications and alert triggers"
            ]
          },
          {
            tier: "Full Master Platform Buyout",
            price: "Valuation upon inquiry (Source Code + IP)",
            features: [
              "Complete Next.js full-stack repository, database models, and Edge rules engine",
              "Exclusive global rights to the proprietary Cancellation Directory & CMS",
              "Zero revenue sharing on affiliate earnings or subscription fees",
              "Freedom to package as an iOS/Android native app or browser extension"
            ]
          }
        ],
        revenuePotential: "Dual monetization model: monthly consumer subscriptions combined with high-value SaaS switch affiliate commissions."
      }
    },
    techStack: {
      headline: "Resilient Edge Architecture & Real-Time Rule Distribution",
      summary: "SubSentry is designed on Next.js Edge infrastructure to deliver lightning-fast cancellation directory lookups and high-availability API feeds with zero database latency.",
      stackPills: ["Next.js 14 (App Router)", "TypeScript", "Tailwind CSS", "Prisma ORM", "Neon Serverless Postgres", "Edge Rules JSON API", "Stripe Billing Engine", "Gemini 3.7 AI Expert"],
      durabilityPillars: [
        {
          title: "Edge-Cached Cancellation CMS",
          icon: "⚡",
          desc: "The directory of service cancellation guides is statically generated at the edge with incremental regeneration (ISR), serving queries with sub-30ms global response times."
        },
        {
          title: "Decoupled Affiliate Routing Gateway",
          icon: "🔄",
          desc: "Affiliate partner links are managed dynamically through a resilient redirect handler that automatically falls back to secondary networks if an affiliate program pauses."
        },
        {
          title: "Serverless Database Scalability",
          icon: "🗄️",
          desc: "Built on serverless PostgreSQL with connection pooling. It scales automatically without requiring dedicated database server maintenance."
        },
        {
          title: "Structured Pattern Classification",
          icon: "🔍",
          desc: "Uses structured heuristic tagging aligned with international regulatory consumer protection benchmarks (FTC and EU GDPR guidelines)."
        }
      ],
      continuousEvolution: `
        <p>
          Corporate cancellation flows change frequently. SubSentry includes a centralized CMS where cancellation steps and direct links are verified and refreshed on an ongoing basis.
        </p>
        <p>
          The embedded AI App Expert leverages Gemini 3.7 Flash for context awareness, regularly updated with recent policy changes, class action settlements, and refund precedents.
        </p>
      `
    }
  },

  {
    id: "appsave",
    name: "AppSave",
    alias: "appsave.ai.studio",
    url: "https://appsave.ai.studio",
    domain: "appsave.ai.studio",
    category: "saas-finance",
    categoryLabel: "E-Commerce & SaaS Discounts",
    statusBadge: "Active Production",
    statusType: "live",
    accentColor: "#ec4899",
    tagline: "The Honey for SaaS, AI Tools & Cloud Subscriptions",
    shortDescription: "An intelligent browser extension and savings directory that automatically detects checkout pages, tests verified coupon codes, and uncovers up to 40% discounts on AI software, cloud hosting, and enterprise subscriptions.",
    tags: [
      { label: "Core Concept", val: "'Honey' for SaaS & Cloud" },
      { label: "Extension Standard", val: "Chrome Manifest V3" },
      { label: "Partner Networks", val: "Impact, PartnerStack, ShareASale" },
      { label: "Licensing Model", val: "Whitelabel & Buyout Ready" }
    ],
    mockupType: "appsave-ui",
    deepDive: {
      headline: "The Automated Savings Co-Pilot for the Exploding AI & SaaS Economy",
      problemSolution: `
        <p class="lead-text">
          Consumer coupon extensions exist for physical retail like fashion and shoes. But when developers, agencies, and businesses buy expensive software—like AI credits, hosting, and SaaS tools—they are forced to manually scour coupon sites full of expired, non-working codes.
        </p>
        <p>
          <strong>AppSave addresses software and cloud purchases specifically.</strong> As a sleek Chrome extension and web directory, it automatically detects when a user is on a SaaS checkout page, runs automated verification loops, and applies genuine working discount codes with one click.
        </p>
      `,
      coreFunctions: [
        {
          title: "Automatic Checkout DOM Detection",
          icon: "🛒",
          summary: "Listens quietly for checkout form fields across SaaS providers, injecting a sleek non-intrusive savings pill.",
          details: "Built on a shadow-DOM architecture that never conflicts with host website styles or slows down page rendering."
        },
        {
          title: "Gemini AI Promo Code Verifier",
          icon: "⚡",
          summary: "Parses software promotional announcements and partner deals, extracting valid codes and filtering expired data.",
          details: "AppSave validates expiration dates and calculates exact discount percentages automatically."
        },
        {
          title: "Curated SaaS & AI Deals Directory",
          icon: "📁",
          summary: "A high-converting discovery portal featuring vetted deals for hosting, developer tools, and AI platforms.",
          details: "Organized by clear categories: AI Models, Cloud Hosting, Design & UI, CRM, and Developer Utilities with direct deal claiming."
        },
        {
          title: "Multi-Network Affiliate Engine",
          icon: "💰",
          summary: "Seamlessly routes SaaS partnerships through Impact.com, PartnerStack, ShareASale, and direct affiliate programs.",
          details: "Captures commissions automatically without disrupting the end-user's verified discount."
        }
      ],
      userBenefits: [
        {
          title: "Direct Cost Savings",
          metric: "15% to 40% Off",
          desc: "Save money every month on regular software, developer tools, and cloud infrastructure expenses."
        },
        {
          title: "1-Click Simplicity",
          metric: "Automated Testing",
          desc: "No more manually copy-pasting dead codes from dubious websites. The extension tests codes automatically."
        },
        {
          title: "Verified Active Codes",
          metric: "Zero Expired Slop",
          desc: "Codes are verified by automated scanning to avoid wasting time on defunct promotions."
        },
        {
          title: "Free for End-Users",
          metric: "100% Free Tool",
          desc: "Transparent model: the user saves money, the software vendor gains a customer, and the operator earns affiliate fees."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Browser extensions that save users money command strong customer loyalty and commercial retention.
          </p>
          <p>
            AppSave is turnkey ready for marketing agencies, developer communities, software review portals, and cashback companies. You brand the extension with your identity, package it for the Chrome Web Store, and plug in your own affiliate network IDs to generate recurring commissions on software transactions.
          </p>
        `,
        models: [
          {
            tier: "Branded Extension & Portal Whitelabel",
            price: "Setup: $1,990 + $290/mo Directory Sync",
            features: [
              "Chrome Web Store packaged extension with your brand, logo, and store listing",
              "Full Web Directory portal deployed on your custom domain",
              "Route 100% of affiliate commissions to your PartnerStack/Impact accounts",
              "Includes automated weekly coupon database sync"
            ]
          },
          {
            tier: "Publisher Lease-to-Own",
            price: "From $690/mo (70% Equity Credit)",
            features: [
              "Rapid deployment for communities, newsletters, or tech influencers",
              "70% of lease payments credited toward outright code purchase",
              "Includes Manifest V3 compliance updates and Google Web Store maintenance",
              "Custom featured deal placements for your own agency sponsors"
            ]
          },
          {
            tier: "Full Master Buyout & Extension Code",
            price: "Valuation upon inquiry (Source Code + IP)",
            features: [
              "Complete source code for both Chrome Extension (V3) and React Web Portal",
              "Exclusive worldwide ownership with zero platform royalties",
              "Freedom to port to Firefox, Edge, Safari, and mobile browser wrappers",
              "Full rights to sub-license or sell to private equity or media houses"
            ]
          }
        ],
        revenuePotential: "Passive affiliate monetization: earn recurring commissions on high-ticket software and cloud hosting subscriptions."
      }
    },
    techStack: {
      headline: "Chrome Manifest V3 Architecture & High-Performance Coupon Scraping",
      summary: "AppSave is built to conform strictly with Google's strict Manifest V3 browser extension standards, pairing a lightweight shadow-DOM injection engine with a high-speed React discovery portal.",
      stackPills: ["Chrome Extension Manifest V3", "React 18", "TypeScript", "Tailwind CSS", "Shadow DOM Injection", "Vite Bundler", "Affiliate Routing Router", "Gemini 2.5 Code Parser"],
      durabilityPillars: [
        {
          title: "Manifest V3 Security & Longevity",
          icon: "🛡️",
          desc: "Fully compliant with Google's declarative extension security requirements. Uses background service workers with zero remote script injection, ensuring permanent approval on the Chrome Web Store."
        },
        {
          title: "Zero-Conflict Shadow DOM Styling",
          icon: "🎨",
          desc: "The checkout notification widget renders inside an isolated Shadow Root. Host website CSS can never break the popup layout, and the extension CSS never leaks into the user's checkout page."
        },
        {
          title: "Privacy-Conscious Local Storage Caching",
          icon: "🔒",
          desc: "Sensitive user browsing data is never transmitted to servers. Verified coupons are pre-cached locally, keeping data consumption and network overhead virtually non-existent."
        },
        {
          title: "Universal Affiliate Network Support",
          icon: "⚡",
          desc: "Supports all major affiliate tracking protocols (subID tracking, deep-linking, direct parameters, and postback webhooks) across Impact, CJ, Rakuten, and PartnerStack."
        }
      ],
      continuousEvolution: `
        <p>
          Browser APIs and eCommerce checkout DOM selectors update over time. AppSave features a centralized remote schema where checkout input selectors are refreshed without requiring frequent extension store updates.
        </p>
        <p>
          Our automated discount verification engine uses Gemini 2.5 Flash to scan promotional announcements across tech communities, keeping the coupon repository fresh and validated.
        </p>
      `
    }
  },

  {
    id: "upworkz",
    name: "Upworkz",
    alias: "upworkz.ai.studio",
    url: "https://upworkz.ai.studio",
    domain: "upworkz.ai.studio",
    category: "sales-crm",
    categoryLabel: "Freelance Deal Closer & Proposal Architect",
    statusBadge: "Active Production",
    statusType: "live",
    accentColor: "#22c55e",
    tagline: "Autonomous Proposal Architect & Deal Closer: Land $100+/hr Contracts While You Sleep",
    shortDescription: "An enterprise-grade client acquisition engine for freelance developers, consultants, and agencies. Converts Upwork job postings into winning 45-second proposals, monitors market feeds 24/7 with background cron alerts, identifies project gotchas before bidding, and generates Zoom interview battlecards.",
    tags: [
      { label: "Intelligence", val: "Gemini 2.5 Dual Engine" },
      { label: "Proposal Engine", val: "45-Sec Tailored Pitch" },
      { label: "Market Radar", val: "24/7 RSS Cron + Alerts" },
      { label: "Licensing Model", val: "Whitelabel & Buyout Ready" }
    ],
    mockupType: "upworkz-ui",
    deepDive: {
      headline: "Stop Wasting 45 Minutes Writing Proposals Clients Never Even Open",
      problemSolution: `
        <p class="lead-text">
          On platforms like Upwork, clients receive dozens of proposals within an hour of posting. Many freelancers make the mistake of opening with polite template greetings (which get cut off on mobile inbox previews), guessing at scope, and underpricing their bids.
        </p>
        <p>
          <strong>Upworkz transforms freelancers and agencies into authoritative closers.</strong> In 45 seconds, Gemini 2.5 Flash deconstructs the job description, crafts a punchy opening hook designed for Upwork's 220-character inbox preview, structures a 3-phase technical work breakdown, flags hidden scope risks in a private report, and prepares a battlecard for the video interview.
        </p>
      `,
      coreFunctions: [
        {
          title: "The 45-Second High-Converting Pitch Engine",
          icon: "⚡",
          summary: "Paste any job posting. The AI pulls your verified career metrics and writes an irresistible pitch with a 220-character mobile hook.",
          details: "Opens immediately with the client's core bottleneck to bypass preview truncation and prove senior domain authority in the first sentence."
        },
        {
          title: "24/7 Autonomous Market Radar & Cron",
          icon: "📡",
          summary: "Background cron monitors 12+ Upwork job categories around the clock, scoring matches and alerting your phone.",
          details: "Pre-screens postings matching your profile at 85%+. Sends instant notifications via Email or WhatsApp so you can be among the first quality proposals submitted."
        },
        {
          title: "Private Technical Gotcha & Risk Audit",
          icon: "🛡️",
          summary: "A private developer-only report exposing undocumented APIs, race conditions, and scope creep traps before you bid.",
          details: "Rates project complexity from 1 to 10 and calculates your AI-effort compression margin to maximize fixed-price profits."
        },
        {
          title: "Live Zoom Interview Simulator & Battlecard",
          icon: "🎙️",
          summary: "Generates a customized call strategy cheat sheet with defense scripts for the top 5 technical grilling questions.",
          details: "Includes 30-second opening frameworks, consultative closing questions, and ready-to-use contract negotiation scripts."
        },
        {
          title: "Executive Vector PDF & Google Docs Sync",
          icon: "📄",
          summary: "Transform raw proposals into corporate-grade Statement of Work (SOW) brochures with 1-click.",
          details: "Includes milestone roadmaps, deliverables matrices, and signature blocks that justify higher contract values."
        }
      ],
      userBenefits: [
        {
          title: "Higher Response Rates",
          metric: "Bypasses Truncation",
          desc: "Designed specifically to capture attention in the first 220 characters of client inbox previews."
        },
        {
          title: "Protected Margins",
          metric: "Pre-Bid Risk Audits",
          desc: "Defensive scope clauses stop unpaid revisions and toxic contract terms before signing."
        },
        {
          title: "First-Mover Speed",
          metric: "Rapid Notifications",
          desc: "Receive phone alerts when high-value contracts drop and submit polished proposals in minutes."
        },
        {
          title: "Corporate SOW Documents",
          metric: "1-Click PDF / Docs",
          desc: "Generate professional Statement of Work brochures that establish immediate agency authority."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Freelancers, agencies, and career bootcamps enthusiastically adopt software that directly helps them win high-value client contracts.
          </p>
          <p>
            As a whitelabel operator, you can offer this platform to your freelancer community, software engineering students, or boutique agency network under your own brand. Charge a monthly subscription ($19 to $49/mo) or bundle it with coaching programs.
          </p>
        `,
        models: [
          {
            tier: "Turnkey Freelancer Platform Whitelabel",
            price: "Setup: $1,990 + $290/mo Hosting & Cron Maintenance",
            features: [
              "Your custom branding, domain, and tailored freelancer persona library",
              "Integrated Google OAuth login and Stripe billing for monthly subscribers",
              "24/7 autonomous background job radar running on dedicated serverless workers",
              "100% of end-user subscriber revenue kept by the operator"
            ]
          },
          {
            tier: "Agency Lease-to-Own",
            price: "From $690/mo (70% Equity Credit)",
            features: [
              "Launch immediately with zero risk and build your recurring subscriber base",
              "70% of lease fees accumulate toward full buyout of the platform",
              "Continuous updates to Gemini prompt chains and Upwork RSS parsing engines",
              "Dedicated technical onboarding and prompt customization assistance"
            ]
          },
          {
            tier: "Master Software Buyout & Codebase",
            price: "Valuation upon inquiry (Source Code + IP)",
            features: [
              "Complete full-stack source code, prompt architecture, and PDF generator engine",
              "Exclusive worldwide IP rights with zero ongoing platform fees",
              "Freedom to integrate with Fiverr, Contra, Freelancer.com, or direct sales pipelines",
              "Full rights to sub-license to enterprise talent agencies"
            ]
          }
        ],
        revenuePotential: "Predictable monthly SaaS model: subscription revenue from freelancers and agencies seeking automated client acquisition tools."
      }
    },
    techStack: {
      headline: "Gemini 2.5 Dual-Intelligence Engine & Resilient Background Cron",
      summary: "Upworkz is built on a high-speed, modern stack combining Google's latest Gemini 2.5 Flash and Pro reasoning models with an autonomous background RSS stream poller and vector PDF compiler.",
      stackPills: ["Vanilla JS & Modern Web Components", "Gemini 2.5 Flash & Pro", "Marked.js Markdown", "Google Identity OAuth", "Google Docs REST API", "PrintCSS Vector PDF Engine", "Autonomous Background Cron", "Encrypted Local & Cloud Vault"],
      durabilityPillars: [
        {
          title: "Dual Gemini Reasoning Architecture",
          icon: "🧠",
          desc: "Pairs ultra-fast Gemini 2.5 Flash (for sub-1-second hook extraction) with Gemini 2.5 Pro (for deep architectural work plans and risk audits), giving users both speed and cognitive depth."
        },
        {
          title: "Autonomous 24/7 RSS Background Cron",
          icon: "📡",
          desc: "Engineered with resilient interval scheduling and exponential backoff. It continuously polls and filters RSS feeds without degrading application performance."
        },
        {
          title: "High-Fidelity Vector Print Engine",
          icon: "📄",
          desc: "Custom CSS print media rules and client-side vector synthesis allow users to generate crisp, multi-page corporate PDF proposals with typography, page breaks, and signature blocks."
        },
        {
          title: "Grounded Career Proof Injection",
          icon: "🛡️",
          desc: "Proposals inject case studies and repository links strictly from the user's encrypted local persona vault, preventing AI hallucination of nonexistent past projects."
        }
      ],
      continuousEvolution: `
        <p>
          Freelance marketplace algorithms and interface layouts update over time. Upworkz is continuously calibrated to ensure the opening hook strictly respects character truncation limits across mobile and web previews.
        </p>
        <p>
          As Google releases new Gemini reasoning iterations, the model router updates dynamically, allowing users to leverage the newest reasoning breakthroughs without altering saved templates.
        </p>
      `
    }
  },

  {
    id: "manus",
    name: "Manus AI Studio",
    alias: "manus.ai.studio",
    url: "https://manus.ai.studio",
    domain: "manus.ai.studio",
    category: "autonomous-agents",
    categoryLabel: "Autonomous Action Agents & Orchestration",
    statusBadge: "Next-Gen Agent Engine",
    statusType: "preview",
    accentColor: "#6366f1",
    tagline: "Autonomous General-Purpose Action Agent: From Idea to Complete Execution",
    shortDescription: "A next-generation autonomous AI agent that goes beyond chat to execute complex multi-step workflows in real time. It browses the web, writes and executes code, builds full-stack applications, and orchestrates tools autonomously to deliver finished business outcomes.",
    tags: [
      { label: "Execution Engine", val: "Autonomous Browser & Shell" },
      { label: "Workflow Scope", val: "Multi-Step Action Loops" },
      { label: "Development", val: "Full-Stack Software Scaffolding" },
      { label: "Licensing Model", val: "Enterprise Whitelabel Ready" }
    ],
    mockupType: "manus-ui",
    deepDive: {
      headline: "The Action Engine That Doesn't Just Give Advice—It Does The Work",
      problemSolution: `
        <p class="lead-text">
          Traditional chatbots are passive text generators: you ask a question, they write an answer, and then you still have to do all the manual work yourself. Writing code, setting up servers, researching leads, and testing software remains on your plate.
        </p>
        <p>
          <strong>Manus represents the shift to autonomous action.</strong> It is an action agent equipped with its own virtual browser, execution sandbox, and developer toolchain. Give it an objective, and Manus plans, executes, verifies, and hands you the completed deliverable.
        </p>
      `,
      coreFunctions: [
        {
          title: "Autonomous Multi-Step Action Loop",
          icon: "⚡",
          summary: "Deconstructs complex goals into structured execution steps, adapting its strategy if it hits obstacles.",
          details: "Features self-healing error recovery. If a script fails or a page changes, Manus inspects the error, rewrites the approach, and continues until completion."
        },
        {
          title: "Headless Browser & Web Control",
          icon: "🌐",
          summary: "Navigates websites, authenticates, clicks buttons, extracts unstructured data, and interacts with web applications autonomously.",
          details: "Enables automation of complex back-office workflows that lack traditional public APIs."
        },
        {
          title: "Full-Stack Development & Deployment",
          icon: "💻",
          summary: "Writes production-ready frontend and backend code, provisions databases, and deploys live web applications automatically.",
          details: "Turns natural language descriptions into live, interactive web portals with responsive layouts and working logic."
        },
        {
          title: "Multi-Agent Orchestration & Tool Use",
          icon: "🤖",
          summary: "Coordinates specialized sub-agents for concurrent research, code verification, and data synthesis.",
          details: "Ensures that each step is checked and verified before final output delivery."
        }
      ],
      userBenefits: [
        {
          title: "Completed Outcomes",
          metric: "Finished Tasks",
          desc: "Receive ready-to-use software, clean datasets, and completed tasks instead of long walls of advisory text."
        },
        {
          title: "Productivity Multiplier",
          metric: "10x Output",
          desc: "A single person can orchestrate workflows that previously required multiple researchers and analysts."
        },
        {
          title: "Plain English Control",
          metric: "Zero Syntax Required",
          desc: "Direct complex coding and data automation tasks without needing to write deployment boilerplate."
        },
        {
          title: "Unattended Operation",
          metric: "24/7 Cloud Action",
          desc: "Launch long-running multi-step tasks that execute reliably in the cloud while you focus on core strategy."
        }
      ],
      whitelabel: {
        operatorPitch: `
          <p class="operator-lead">
            Autonomous action agents are the undisputed frontier of enterprise software. Organizations are actively seeking customized agent portals to automate administrative tasks, research, and application generation.
          </p>
          <p>
            Operating a whitelabel Manus Studio instance positions your business at the forefront of this market. You can offer custom-branded autonomous agent workspaces to enterprise clients, charging monthly retainers for task execution credits and custom workflow templates.
          </p>
        `,
        models: [
          {
            tier: "Enterprise Agent Portal Whitelabel",
            price: "Custom Enterprise Setup + SLA",
            features: [
              "Custom-branded agent execution workspace with enterprise SSO",
              "Isolated customer sandboxes with dedicated compute resources",
              "Pre-configured agent toolchains and proprietary industry prompts",
              "Comprehensive usage telemetry, token quotas, and credit billing"
            ]
          },
          {
            tier: "Agency Venture Partnership",
            price: "Setup + Equity / Revenue Share",
            features: [
              "Deploy agent capabilities into your agency's existing client delivery pipeline",
              "Co-developed vertical agents (e.g. Legal Research Agent, Real Estate Analysis Agent)",
              "Priority access to upstream model releases and execution sandboxes",
              "Shared technical roadmap and custom connector development"
            ]
          },
          {
            tier: "Master Buyout & Architecture Licensing",
            price: "Valuation upon inquiry",
            features: [
              "Full agent orchestrator source code and sandbox execution infrastructure",
              "Complete freedom to deploy on private on-premise Kubernetes clusters",
              "Zero third-party vendor lock-in or licensing fees",
              "Full commercial rights to package, resell, or integrate into proprietary platforms"
            ]
          }
        ],
        revenuePotential: "Enterprise tier automation: retainer-based pricing for organizations looking to automate knowledge work at scale."
      }
    },
    techStack: {
      headline: "Sandbox Isolation, Resilient Action Loops & Model-Agnostic Core",
      summary: "Manus is built on an enterprise-grade agent orchestration framework utilizing isolated micro-containers, self-healing action loops, and dynamic model routing across the frontier of AI intelligence.",
      stackPills: ["Node.js & Python Engine", "TypeScript", "Docker / MicroVM Sandboxes", "Playwright Headless Browser", "Model Context Protocol (MCP)", "Next.js Dashboard", "Redis Task Queue", "OpenRouter / BYOK Gateway"],
      durabilityPillars: [
        {
          title: "Secure Ephemeral Container Sandboxing",
          icon: "🛡️",
          desc: "Every agent task runs in an isolated, ephemeral sandbox with strict network policies. Malicious scripts or unexpected code errors are safely contained without endangering host infrastructure."
        },
        {
          title: "Self-Correction & Error-Recovery Heuristics",
          icon: "🔄",
          desc: "Equipped with automated diagnostic loops. If an execution step returns a non-zero exit code or browser timeout, the agent analyzes the stack trace and re-plans alternative paths automatically."
        },
        {
          title: "Model-Agnostic Agent Core via MCP",
          icon: "⚡",
          desc: "Integrates the Model Context Protocol (MCP) and OpenRouter standards, allowing seamless hot-swapping between frontier reasoning models with zero code rewrites."
        },
        {
          title: "Stateful Session Persistence",
          icon: "💾",
          desc: "All terminal outputs, browser screenshots, generated code files, and conversation memories are serialized in real time, allowing tasks to pause, resume, and be audited step-by-step."
        }
      ],
      continuousEvolution: `
        <p>
          Autonomous agents require continuous adaptation as web standards, security protocols, and frontier models advance. Manus's architecture separates the high-level cognitive planner from the execution toolchain.
        </p>
        <p>
          As faster models and more capable tools emerge, the agent automatically adopts them, ensuring your workflow automation remains permanently ahead of the industry curve.
        </p>
      `
    }
  }
];

if (typeof window !== "undefined") {
  window.APPS_DATA = APPS_DATA;
}
