export type ShowcaseCategory = 'd2c' | 'enterprise' | 'agency';
export type ShowcaseType = 'kpi-okr' | 'usecase' | 'article' | 'metric-idea';

export interface ShowcaseItem {
  id: string;
  slug: string;
  title: string;
  category: ShowcaseCategory;
  categoryLabel: string;
  type: ShowcaseType;
  typeLabel: string;
  excerpt: string;
  benchmark?: string;
  formula?: string;
  dataSources: string[];
  okrObjective?: string;
  keyResults?: string[];
  svgType: 'python' | 'roadmap' | 'context' | 'rooms' | 'analyst';
  details: {
    overview: string;
    whyItMatters: string;
    calculationLogic: string;
    recommendedRoom: string;
    automationHook?: string;
  };
  tags: string[];
}

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  // ==========================================
  // D2C & E-COMMERCE
  // ==========================================
  {
    id: 'd2c-contribution-margin',
    slug: 'd2c-live-contribution-margin-telemetry',
    title: 'Live Contribution Margin Telemetry',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Stream order-level net margins after real-time COGS, payment gateway fees, 3PL pick-and-pack, and ad spend allocation.',
    benchmark: 'Target > 22% Net CM3',
    formula: 'Net Revenue - COGS - Shipping - Gateway Fees - Blended Ad Spend',
    dataSources: ['Shopify', 'Stripe', 'Google Sheets', 'Meta Ads'],
    okrObjective: 'Achieve sustainable unit economics across all digital storefronts.',
    keyResults: [
      'Maintain CM3 above 22% on first orders across Google and Meta ad sets.',
      'Identify and flag loss-making SKUs within 60 seconds of checkout.',
      'Reduce blended return and restocking logistics cost by 15%.'
    ],
    svgType: 'python',
    details: {
      overview: 'Most D2C founders look at gross margin or top-line ROAS, missing hidden leaks in shipping surcharges, gateway basis points, and return provisions. This blueprint unites storefront checkout logs with ad spend to yield true contribution margin 3 (CM3) in real time.',
      whyItMatters: 'Scaling ad spend on products with negative net unit economics rapidly depletes working capital without generating enterprise value.',
      calculationLogic: 'Pulled per transaction from Shopify webhooks and mapped against COGS stored in Google Sheets or Zoho Inventory with automated hourly ad spend weighting.',
      recommendedRoom: 'D2C Executive Command / Unit Economics Room',
      automationHook: 'Auto-pause Meta ad sets when SKU contribution margin drops below 10% for 3 consecutive hours.'
    },
    tags: ['d2c', 'margin', 'roas', 'shopify', 'unit-economics', 'kpi', 'okr']
  },
  {
    id: 'd2c-whatsapp-dunning',
    slug: 'd2c-automated-whatsapp-cashflow-recovery',
    title: 'Automated WhatsApp Cashflow Recovery',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Recover abandoned high-AOV carts and pending cash-on-delivery confirmations automatically via interactive WhatsApp bots.',
    benchmark: 'Recovery Rate: 18% to 32%',
    formula: 'Recovered Revenue / Total Abandoned Value * 100',
    dataSources: ['Shopify', 'WhatsApp Business API', 'Zoho CRM'],
    okrObjective: 'Maximize checkout conversion and recover latent order pipeline.',
    keyResults: [
      'Increase COD confirmation rate to 88% prior to logistics dispatch.',
      'Recover over $45,000 monthly in abandoned carts over $150 AOV.',
      'Reduce customer service manual confirmation calls to zero.'
    ],
    svgType: 'context',
    details: {
      overview: 'Connects checkout abandonment events to instant conversational triggers. Customers receive personalized order summaries, dynamic discount tokens, and 1-click payment links.',
      whyItMatters: 'Email cart recovery rates hover below 8%. Direct messaging delivers 85%+ open rates and instant conversion lift within the first 15 minutes.',
      calculationLogic: 'Calculated by tracking unique checkout token sessions resurrected through WhatsApp direct payload URLs.',
      recommendedRoom: 'Growth & Lifecycle Automation Room',
      automationHook: 'Trigger WhatsApp interactive template 12 minutes after checkout drop-off for carts above median AOV.'
    },
    tags: ['d2c', 'whatsapp', 'recovery', 'dunning', 'conversion', 'automation']
  },
  {
    id: 'd2c-blended-mer-payback',
    slug: 'd2c-marketing-efficiency-ratio-cac-payback',
    title: 'Marketing Efficiency Ratio & 60-Day Payback',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Track blended marketing efficiency ratio (MER) alongside 30, 60, and 90-day repeat purchase cohort payback curves.',
    benchmark: 'MER > 3.8x | 60-Day Payback < 1.0x CAC',
    formula: 'Total Store Revenue / Total Marketing Ad Spend',
    dataSources: ['Shopify', 'Meta Ads', 'Google Ads', 'TikTok Ads'],
    okrObjective: 'Establish predictable marketing efficiency without over-relying on platform-attributed ROAS.',
    keyResults: [
      'Maintain blended MER above 4.0x during scaling quarters.',
      'Compress second-order customer payback from 75 days to under 45 days.',
      'Grow 90-day repurchase cohort value by 28% year-over-year.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Platform-reported ROAS in ad managers suffers from attribution inflation and post-iOS tracking gaps. MER provides single source of truth for total marketing efficiency against bank revenues.',
      whyItMatters: 'Enables leadership to scale ad budget confidently based on bank cashflow rather than skewed platform attribution.',
      calculationLogic: 'Sum of all gross platform revenue divided by sum of media spend across Meta, Google, and TikTok over rolling 7-day and 30-day windows.',
      recommendedRoom: 'Paid Growth & Acquisition Room',
      automationHook: 'Daily 08:00 AM executive brief summarizing rolling 7-day MER vs quarterly budget plan.'
    },
    tags: ['d2c', 'mer', 'cac', 'cohorts', 'attribution', 'marketing']
  },
  {
    id: 'd2c-inventory-runout-velocity',
    slug: 'd2c-predictive-stockout-working-capital',
    title: 'Predictive Stockout & Inventory Working Capital',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'Deep dive on balancing SKU velocity, lead-time buffers, and supplier MOQs to eliminate out-of-stock revenue loss.',
    benchmark: 'Stockout Rate < 1.5% | Stock Turns > 6.2x',
    formula: 'Current Available Stock / 14-Day Velocity Rate (Units/Day)',
    dataSources: ['Zoho Inventory', 'Google Sheets', 'Shopify'],
    svgType: 'roadmap',
    details: {
      overview: 'Detailed architectural walkthrough on uniting warehouse stock quantities with real-time sales velocity to calculate exact days-of-inventory-remaining per SKU.',
      whyItMatters: 'Stockouts on hero SKUs instantly tank ad algorithm learning, causing acquisition costs to spike upon restock.',
      calculationLogic: 'Moving average daily burn rate applied to available 3PL inventory minus reserved open orders.',
      recommendedRoom: 'Supply Chain & Operations Room',
      automationHook: 'Slack alert to procurement team when stock falls below supplier lead-time plus 10 days of buffer.'
    },
    tags: ['d2c', 'inventory', 'supply-chain', 'working-capital', 'article']
  },
  {
    id: 'd2c-peter-thiel-pricing-power',
    slug: 'peter-thiel-monopoly-pricing-power-d2c',
    title: 'Peter Thiel: Pricing Inelasticity & Escape Velocity',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Zero to One thesis applied to retail: Evaluating true monopoly pricing power and margin durability when switching costs insulate you from price wars.',
    benchmark: 'Volume Decay < 3.5% on +20% Price Elevation',
    formula: '((Volume_T1 - Volume_T0) / Volume_T0) / ((Price_T1 - Price_T0) / Price_T0)',
    dataSources: ['Shopify', 'Stripe', 'Google Analytics'],
    okrObjective: 'Build durable brand pricing power that escapes commodity price competition.',
    keyResults: [
      'Successfully test a 15% price increase on flagship product tier with zero drop in 60-day repurchase rate.',
      'Elevate gross margin from 62% to 74% across high-affinity brand advocates.',
      'Reduce promo discount reliance from 28% of total GMV to under 6%.'
    ],
    svgType: 'python',
    details: {
      overview: 'Peter Thiel argues in Zero to One that creative monopolists possess genuine pricing power because their product is differentiated by an order of magnitude. This blueprint audits brand elasticity to verify true defensibility.',
      whyItMatters: 'If you must discount 25% to generate volume, you are in commodity competition rather than building an enduring brand moat.',
      calculationLogic: 'Tracks cohort checkout volumes before and after price updates while controlling for ad spend variance.',
      recommendedRoom: 'Executive Strategy & Margin Defense Room',
      automationHook: 'Weekly alert flagging any SKU where volume elasticity coefficient indicates customer indifference to price hikes.'
    },
    tags: ['d2c', 'peter-thiel', 'pricing-power', 'zero-to-one', 'margins', 'kpi', 'okr']
  },
  {
    id: 'd2c-paul-graham-unscalable-onboarding',
    slug: 'paul-graham-do-things-that-dont-scale-d2c',
    title: 'Paul Graham: Unscalable Concierge Onboarding',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'YC Founder Rule: White-glove founder concierge calls for the first 500 customers to achieve unassailable 85%+ Day-30 retention before running paid ads.',
    benchmark: 'Day-30 Retention > 85% on Concierge Cohort',
    formula: 'Concierge Onboarded Users * Day-30 Repeat Purchase Rate %',
    dataSources: ['Shopify', 'Calendly', 'WhatsApp Business API'],
    okrObjective: 'Discover exact product friction vectors through direct founder-to-customer onboarding.',
    keyResults: [
      'Complete 150 one-on-one video consultations with early adopters within 60 days.',
      'Achieve 88% 30-day repurchase rate on manually onboarded cohorts.',
      'Translate qualitative interview feedback into 12 core product packaging refinements.'
    ],
    svgType: 'context',
    details: {
      overview: 'Paul Graham famously advised early startups to do things that do not scale. In commerce, having the founder personally onboard the first wave of buyers reveals unspotted friction in packaging, dosage, or usage.',
      whyItMatters: 'Optimizing ad funnels before proving extraordinary retention on a small cohort only burns capital on leaky bucket acquisition.',
      calculationLogic: 'Tagging customer orders with concierge cohort flags and comparing repeat order velocity against cold ad traffic.',
      recommendedRoom: 'Founder Ops & Customer Discovery Room',
      automationHook: 'Automated Calendly invite dispatch when VIP order value exceeds $120.'
    },
    tags: ['d2c', 'yc', 'paul-graham', 'onboarding', 'retention', 'usecase']
  },
  {
    id: 'd2c-sam-altman-100-users-love',
    slug: 'sam-altman-100-customers-who-love-you',
    title: 'Sam Altman: 100 Customers Who Genuinely Love You',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Tracking the organic referral multiplier and zero-incentive social sharing rate among your core 100 obsessive brand advocates.',
    benchmark: 'NPS Score: 90+ | Organic Word-of-Mouth K-Factor > 0.45',
    formula: 'Organic Referred Revenue / Total Customer Revenue * 100',
    dataSources: ['Shopify', 'Klaviyo', 'Google Sheets'],
    okrObjective: 'Cultivate a die-hard core of 100 brand advocates whose organic word-of-mouth drives base growth.',
    keyResults: [
      'Identify and segment 100 customers with 5+ repeat purchases and unsolicited social testimonials.',
      'Generate 40% of new customer registrations via organic customer referral links.',
      'Maintain an unconditional NPS of 92 among verified repeat purchasers.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Sam Altman observes that it is better to build something that 100 people love than something that 1,000 people merely like. This blueprint isolates customer cohorts who actively evangelize without paid incentives.',
      whyItMatters: 'True viral loops require genuine delight; paid affiliate schemes cannot substitute for organic product reverence.',
      calculationLogic: 'Monitors non-paid referral parameters and user-generated content engagement per verified purchase account.',
      recommendedRoom: 'Brand Advocacy & Community Room',
      automationHook: 'Direct SMS greeting from the founder dispatched whenever a customer leaves an unprompted 5-star photo review.'
    },
    tags: ['d2c', 'yc', 'sam-altman', 'nps', 'advocacy', 'word-of-mouth']
  },
  {
    id: 'd2c-casey-winters-growth-loops',
    slug: 'casey-winters-retention-growth-loops-d2c',
    title: 'Casey Winters: Retention Loops vs Funnel Drag',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Transitioning from linear ad funnels to self-reinforcing content and subscription replenishment loops that generate new cohort cycles automatically.',
    benchmark: 'Compounding Loop Factor > 1.30x per 45-day cycle',
    formula: 'Reinvestment Output (Orders_t+1) = Orders_t * Reorder_Rate * Viral_Referral_Rate',
    dataSources: ['Shopify', 'Klaviyo', 'PostgreSQL'],
    okrObjective: 'Build sustainable viral replenishment loops that reduce reliance on paid ad networks.',
    keyResults: [
      'Transition 42% of single-order purchasers into automated 30-day replenishment subscriptions.',
      'Achieve 1.35x reinvestment compounding across organic cohort loops.',
      'Lower blended customer acquisition cost by 30% through recipient gifting loops.'
    ],
    svgType: 'roadmap',
    details: {
      overview: 'Casey Winters (former growth lead at Pinterest & Grubhub) notes that sustainable growth comes from loops where the output of one cycle reinvests as the input of the next. In commerce, product unboxing and gifting loops drive compounding returns.',
      whyItMatters: 'Funnels require constant external media spend; loops feed themselves from satisfied user actions.',
      calculationLogic: 'Calculates the ratio of new orders initiated as direct downstream results of previous cohort activations.',
      recommendedRoom: 'Retention Architecture & Lifecycle Room',
      automationHook: 'Automated 1-click subscription activation push 7 days prior to predicted replenishment runout.'
    },
    tags: ['d2c', 'reforge', 'casey-winters', 'growth-loops', 'retention', 'usecase']
  },
  {
    id: 'd2c-andrew-chen-atomic-networks',
    slug: 'andrew-chen-atomic-network-density-commerce',
    title: 'Andrew Chen: Atomic Density in Localized Commerce',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'The Cold Start Problem: Concentrating micro-market delivery density and brand awareness to dominate zip-code clusters before national scaling.',
    benchmark: 'Zip-Code Penetration > 14% | Logistics Cost -40%',
    formula: 'Active Monthly Buyers in Zip Code / Total Target Households in Zip Code',
    dataSources: ['Shopify', 'ShipBob', 'Google Analytics'],
    svgType: 'roadmap',
    details: {
      overview: 'Andrew Chen (a16z) demonstrates in The Cold Start Problem that building hyper-dense atomic networks locally creates immediate word-of-mouth and collapses last-mile shipping costs.',
      whyItMatters: 'Thinly spreading marketing across an entire continent prevents localized brand resonance and spikes logistics overhead.',
      calculationLogic: 'Heatmaps customer address clusters from Shopify fulfillment logs and correlates them with localized Meta geo-targeted ads.',
      recommendedRoom: 'Geo-Expansion & Localized Growth Room',
      automationHook: 'Trigger localized out-of-home or micro-influencer ad campaigns when zip code orders cross 250 units/month.'
    },
    tags: ['d2c', 'a16z', 'andrew-chen', 'cold-start', 'atomic-networks', 'density', 'article']
  },
  {
    id: 'd2c-julian-shapiro-programmatic-seo',
    slug: 'julian-shapiro-programmatic-seo-commerce',
    title: 'Julian Shapiro: Programmatic SEO & Organic Moat',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Building structured programmatic comparison and ingredient pages that compound organic search traffic and reduce blended CAC.',
    benchmark: 'Organic Revenue Share > 35% | Organic CAC < 10% Paid',
    formula: 'Indexed Product Facet Pages * Impression CTR * Conversion %',
    dataSources: ['Google Search Console', 'Shopify', 'Google Analytics'],
    okrObjective: 'Capture high-intent long-tail commercial intent queries at scale.',
    keyResults: [
      'Index 1,200 programmatic comparison and solution landing pages with sub-second page loads.',
      'Grow organic search revenue from $12,000 to $85,000 monthly.',
      'Achieve top-3 rank for 450 long-tail buyer intent keywords.'
    ],
    svgType: 'context',
    details: {
      overview: 'Julian Shapiro (Demand Curve) popularized programmatic SEO frameworks where structured database attributes automatically populate high-ranking, fast-loading search landing pages.',
      whyItMatters: 'Insulates your storefront from Meta ad auction inflation and creates a zero-marginal-cost customer acquisition engine.',
      calculationLogic: 'Monitors Google Search Console API impressions and conversions per programmatic URL sub-path.',
      recommendedRoom: 'Organic Acquisition & Content Moat Room',
      automationHook: 'Automated sitemap update and Google index ping when new product variants or ingredient studies are published.'
    },
    tags: ['d2c', 'seo', 'julian-shapiro', 'demand-curve', 'organic', 'usecase']
  },
  {
    id: 'd2c-clayton-christensen-jtbd',
    slug: 'clayton-christensen-jtbd-switch-forces',
    title: 'Clayton Christensen: Jobs-To-Be-Done Switch Matrix',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'The 4 fundamental psychological forces governing customer transition: Push of current situation, Pull of new solution vs Anxiety of change and Habit.',
    benchmark: 'Switch Rate > 62% on Trial/Sample Conversions',
    formula: '(Push_Score + Pull_Score) > (Anxiety_Score + Habit_Score)',
    dataSources: ['Post-Purchase Survey', 'Shopify', 'Hotjar'],
    svgType: 'analyst',
    details: {
      overview: 'Clayton Christensen’s foundational Jobs-To-Be-Done framework explains that customers do not buy products; they hire them to make progress. This blueprint audits the psychological forces driving brand migration.',
      whyItMatters: 'Ad copy that only highlights features fails if it does not address the anxiety of changing existing daily habits.',
      calculationLogic: 'Scoring post-purchase customer survey data across the four emotional quadrants of switching behavior.',
      recommendedRoom: 'Product Marketing & Conversion Architecture Room',
      automationHook: 'Trigger dynamic landing page copy addressing specific habit objections based on incoming ad angle.'
    },
    tags: ['d2c', 'jtbd', 'clayton-christensen', 'psychology', 'conversion', 'article']
  },
  {
    id: 'd2c-jim-collins-amazon-flywheel',
    slug: 'jim-collins-amazon-commerce-flywheel',
    title: 'Jim Collins: Retail Flywheel Velocity Index',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Measuring the self-reinforcing flywheel: lower operational cost structure -> lower product pricing -> superior customer experience -> traffic scale.',
    benchmark: 'Year-over-Year Unit Fulfillment Cost Compression > 8.0%',
    formula: '(Traffic Growth * Repurchase Velocity) / Fixed Cost Per Unit',
    dataSources: ['Shopify', 'Zoho Books', 'Google Sheets'],
    okrObjective: 'Drive scale economies that permanently reduce unit operating costs.',
    keyResults: [
      'Compress warehouse pick-and-pack cost per unit by 12% through volume tiering.',
      'Reinvest fulfillment savings directly into product formulation upgrades.',
      'Achieve a 22% increase in customer lifetime value without increasing marketing budget.'
    ],
    svgType: 'python',
    details: {
      overview: 'Jim Collins describes the flywheel effect as a heavy disk that takes immense effort to push initially, but eventually builds unstoppable compounding momentum.',
      whyItMatters: 'Ensures that every operational efficiency gain directly strengthens customer value rather than getting lost in overhead.',
      calculationLogic: 'Monitors the ratio of fixed operating overhead divided by total shipped parcel volume over rolling quarterly windows.',
      recommendedRoom: 'Operations & Long-Term Flywheel Room',
      automationHook: 'Quarterly executive report tracking marginal cost savings per shipped unit.'
    },
    tags: ['d2c', 'jim-collins', 'flywheel', 'scale-economies', 'operations']
  },
  {
    id: 'd2c-involuntary-payment-recovery',
    slug: 'd2c-involuntary-payment-churn-recovery',
    title: 'Involuntary Subscription & Gateway Recovery',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Intelligent card retry schedules, network tokenization, and SMS dunning to recover 65%+ of failed recurring billing charges.',
    benchmark: 'Recovery Rate > 68% of Involuntary Payment Failures',
    formula: 'Recovered Failed Charges / Total Failed Charge Value * 100',
    dataSources: ['Stripe Billing', 'Shopify', 'WhatsApp Business API'],
    okrObjective: 'Eliminate involuntary customer churn caused by expired or declined payment cards.',
    keyResults: [
      'Recover $38,000 monthly in failed recurring replenishment subscription charges.',
      'Automate smart retry algorithms timed with consumer payday windows.',
      'Reduce involuntary subscription cancellation rate to below 1.8%.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Over 40% of subscription cancellations are not intentional; they happen because cards expire, banks trigger fraud blocks, or balance checks fail. This blueprint executes adaptive card retries and conversational recovery.',
      whyItMatters: 'Acquiring a new customer costs 5x more than recovering an existing subscriber whose card hit a temporary limit.',
      calculationLogic: 'Tracks payment error webhooks from Stripe and routes them through optimized retry schedules.',
      recommendedRoom: 'Subscription Operations & Revenue Defense Room',
      automationHook: 'Instant conversational WhatsApp message offering 1-click Apple Pay or card update link within 10 minutes of failed renewal.'
    },
    tags: ['d2c', 'stripe', 'dunning', 'subscription', 'churn', 'automation']
  },
  {
    id: 'd2c-cash-conversion-cycle',
    slug: 'd2c-cash-conversion-cycle-telemetry',
    title: 'Omnichannel Cash Conversion Cycle (CCC)',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Balancing Days Inventory Outstanding (DIO), Days Sales Outstanding (DSO), and Days Payable Outstanding (DPO) to achieve negative working capital float.',
    benchmark: 'CCC < 25 Days (Negative CCC is optimal for rapid scale)',
    formula: 'Days Inventory Outstanding + Days Sales Outstanding - Days Payable Outstanding',
    dataSources: ['Zoho Books', 'Shopify', 'Stripe'],
    okrObjective: 'Optimize supplier payment terms and inventory velocity to fund growth from cashflow.',
    keyResults: [
      'Reduce Cash Conversion Cycle from 65 days to 18 days.',
      'Negotiate Net-60 supplier payment terms with key manufacturing partners.',
      'Accelerate marketplace receivables clearance from 14 days to 48 hours.'
    ],
    svgType: 'python',
    details: {
      overview: 'A negative Cash Conversion Cycle allows a brand to collect cash from customers before paying suppliers for inventory, enabling explosive growth without dilutive venture equity.',
      whyItMatters: 'Many fast-growing commerce brands go bankrupt not from lack of demand, but because cash is locked in warehouse inventory.',
      calculationLogic: 'Calculates average inventory divided by COGS per day, plus receivables divided by daily revenue, minus payables divided by daily supply costs.',
      recommendedRoom: 'CFO Command & Working Capital Room',
      automationHook: 'Weekly alert highlighting any SKU category where inventory days exceed supplier credit windows.'
    },
    tags: ['d2c', 'cashflow', 'working-capital', 'inventory', 'cfo', 'kpi', 'okr']
  },
  {
    id: 'd2c-whale-customer-segmentation',
    slug: 'd2c-whale-customer-ltv-segmentation',
    title: '80/20 Whale Customer LTV & VIP Tiering',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Isolating the top 5% highest-spending customers who generate 40%+ of gross margin and establishing high-touch retention triggers.',
    benchmark: 'Top 5% Cohort generates > 38% of Cumulative Margin',
    formula: 'Revenue(Top 5% Cohort) / Total Customer Revenue * 100',
    dataSources: ['Shopify', 'Klaviyo', 'Google Sheets'],
    okrObjective: 'Maximize retention and annual spend of top-tier whale customers.',
    keyResults: [
      'Identify top 500 lifetime spenders and assign dedicated VIP concierge support.',
      'Achieve 96% annual retention among verified whale cohort members.',
      'Increase whale average annual order frequency from 4.2 to 7.8 orders/year.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Pareto distribution in consumer commerce is extreme: a small minority of enthusiasts generate the vast majority of cumulative profit. This blueprint surfaces top spenders for exclusive concierge experiences.',
      whyItMatters: 'Losing a customer who buys 12 times a year hurts 12x more than losing an unengaged one-time trial buyer.',
      calculationLogic: 'Ranks customer profiles by cumulative 365-day gross profit contribution.',
      recommendedRoom: 'VIP Retention & Private Client Room',
      automationHook: 'Private invite dispatch to secret product pre-release catalog whenever lifetime spend crosses $750.'
    },
    tags: ['d2c', 'ltv', 'vip', 'segmentation', 'retention', 'pareto']
  },
  {
    id: 'd2c-ad-creative-fatigue',
    slug: 'd2c-ad-creative-fatigue-velocity',
    title: 'Ad Creative Fatigue & First-Impression Ratio',
    category: 'd2c',
    categoryLabel: 'D2C & E-Commerce',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Algorithmic monitoring of frequency, outbound CTR decay, and first-time impression ratio to cycle fresh video assets before CPA spikes.',
    benchmark: 'Flag Fatigue when CTR drops > 25% or Frequency > 2.8x',
    formula: '((CTR_Day_7 - CTR_Day_1) / CTR_Day_1) * 100',
    dataSources: ['Meta Ads', 'TikTok Ads', 'Shopify'],
    okrObjective: 'Prevent ad account CPA inflation through predictive creative rotation.',
    keyResults: [
      'Detect and flag creative fatigue 48 hours before CPA exceeds target threshold.',
      'Maintain an active pipeline of 15 validated new video hooks per week.',
      'Lower blended customer acquisition cost by 18% during high-volume scaling seasons.'
    ],
    svgType: 'roadmap',
    details: {
      overview: 'Modern paid ad platforms run on creative volume. Once an ad set reaches high frequency, click-through rates decline and ad auctions penalize the account with higher CPMs.',
      whyItMatters: 'Scaling spend on fatigued creatives is the number one cause of sudden ROAS collapse.',
      calculationLogic: 'Monitors the slope of rolling 72-hour CTR alongside frequency and first-time impression percentage.',
      recommendedRoom: 'Paid Media & Creative Studio Room',
      automationHook: 'Slack alert to creative director when hero ad asset CTR decays for 3 consecutive days.'
    },
    tags: ['d2c', 'meta-ads', 'creatives', 'cpa', 'roas', 'automation']
  },

  // ==========================================
  // ENTERPRISE & B2B SAAS
  // ==========================================
  {
    id: 'enterprise-nrr-telemetry',
    slug: 'enterprise-net-revenue-retention-expansion-curves',
    title: 'Net Revenue Retention (NRR) & Expansion Matrix',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Track cohort expansion, contraction, churn, and net revenue retention across multi-tier accounts in real time.',
    benchmark: 'Top Quartile Enterprise SaaS: > 125% NRR',
    formula: '(Starting ARR + Expansion - Contraction - Churn) / Starting ARR * 100',
    dataSources: ['Stripe Billing', 'Zoho Books', 'PostgreSQL', 'HubSpot'],
    okrObjective: 'Drive enterprise account expansion and minimize revenue churn.',
    keyResults: [
      'Scale Net Revenue Retention from 112% to 128% across accounts > $50k ARR.',
      'Achieve gross revenue retention (GRR) above 95%.',
      'Identify early contraction signals 90 days before annual renewal.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Comprehensive enterprise retention matrix dissecting monthly cohorts by contract size, seat expansion, usage-based overages, and feature upsells.',
      whyItMatters: 'High NRR fuels exponential compounding ARR growth with minimal customer acquisition friction.',
      calculationLogic: 'Calculated over trailing 12-month cohort windows directly querying recurring subscription invoices and contract renewals.',
      recommendedRoom: 'Executive Board & Customer Success Room',
      automationHook: 'Trigger high-priority alert to VP of Customer Success whenever an account drops below 70% product feature adoption.'
    },
    tags: ['enterprise', 'nrr', 'saas', 'retention', 'expansion', 'kpi', 'okr']
  },
  {
    id: 'enterprise-hierarchical-rbac-rooms',
    slug: 'enterprise-hierarchical-workspace-rooms-rbac',
    title: 'Hierarchical Workspace Rooms with Granular RBAC',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Isolate financial, engineering, security, and departmental metrics into nested rooms with role-based access control.',
    benchmark: 'Audit-Ready SOC-2 Compliance',
    formula: 'Role Scope: Admin | Department Lead | Member | Auditor View',
    dataSources: ['PostgreSQL', 'Google Sheets', 'Zoho CRM', 'Stripe'],
    okrObjective: 'Enforce enterprise-grade data governance across cross-functional executive teams.',
    keyResults: [
      'Zero unauthorized data exposure across all departmental rooms.',
      'Instant 1-click provisioning of new department workspaces.',
      'Automated monthly audit access logs exported to security teams.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Allows global enterprises to structure KPI command centers into parent-child room hierarchies (e.g. Group Global -> EMEA -> Sales Ops) with strict permission walls.',
      whyItMatters: 'Prevents sensitive executive payroll and board-level margin telemetry from leaking to broad team members while keeping data unified.',
      calculationLogic: 'Evaluated at the API session gateway using cryptographically signed role tokens.',
      recommendedRoom: 'Enterprise Governance & Security Room',
      automationHook: 'Auto-sync user group permissions from corporate SAML/Okta directory.'
    },
    tags: ['enterprise', 'rbac', 'security', 'workspace', 'rooms', 'governance']
  },
  {
    id: 'enterprise-burn-multiple-magic-number',
    slug: 'enterprise-saas-magic-number-burn-multiple',
    title: 'SaaS Magic Number & Burn Multiple Telemetry',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Correlate quarterly net-new ARR against sales and marketing spend to measure capital efficiency at scale.',
    benchmark: 'Magic Number > 1.2x | Burn Multiple < 1.0x',
    formula: '(Current Q ARR - Prior Q ARR) * 4 / Prior Q S&M Expense',
    dataSources: ['Zoho Books', 'Stripe', 'Google Sheets'],
    okrObjective: 'Optimize capital efficiency for Series B through pre-IPO capital allocation.',
    keyResults: [
      'Maintain Burn Multiple below 0.85x while growing ARR over 60% YoY.',
      'Achieve Magic Number above 1.15 across mid-market and enterprise sales pods.',
      'Deliver monthly board-ready capital efficiency charts automatically.'
    ],
    svgType: 'python',
    details: {
      overview: 'The definitive benchmark for investor-grade SaaS efficiency. Unites P&L operational cash burn with quarterly revenue growth velocity.',
      whyItMatters: 'Ensures growth is generated efficiently rather than through unsustainable customer acquisition burn.',
      calculationLogic: 'Quarterly net-new annualized revenue divided by prior quarter fully-loaded sales and marketing budget.',
      recommendedRoom: 'CFO & Investor Relations Room',
      automationHook: 'Automated executive slide deck generator summarizing Magic Number trends for quarterly board meetings.'
    },
    tags: ['enterprise', 'magic-number', 'burn-multiple', 'cfo', 'investor', 'saas']
  },
  {
    id: 'enterprise-pipeline-velocity',
    slug: 'enterprise-deal-velocity-pipeline-conversion',
    title: 'Enterprise Pipeline Velocity & ACV Forecasting',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'Mathematical modeling of qualified enterprise pipeline, stage conversion probability, and sales cycle duration.',
    benchmark: 'Sales Cycle: 45 to 90 Days | Win Rate > 28%',
    formula: '(Number of Deals * Average Contract Value * Win Rate %) / Sales Cycle Length',
    dataSources: ['Zoho CRM', 'LeadSquared', 'Google Sheets'],
    svgType: 'analyst',
    details: {
      overview: 'Comprehensive architectural guide on calculating forward revenue velocity per sales pod and rep by factoring historical stage drop-off and median close days.',
      whyItMatters: 'Replaces subjective rep forecasts with algorithmic pipeline certainty for executive headcount and runway planning.',
      calculationLogic: 'Weighted stage probabilities multiplied by verified ACV and divided by average sales duration in days.',
      recommendedRoom: 'Revenue Operations (RevOps) Room',
      automationHook: 'Slack notification to CRO when deal value exceeds $100k and stalls in technical evaluation for over 14 days.'
    },
    tags: ['enterprise', 'pipeline', 'revops', 'crm', 'sales', 'article']
  },
  {
    id: 'enterprise-peter-thiel-10x-advantage',
    slug: 'peter-thiel-10x-proprietary-advantage-metric',
    title: 'Peter Thiel: 10x Proprietary Advantage Metric',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'Zero to One rule: Quantifying whether your core enterprise software workflow is an order of magnitude (10x) faster or cheaper than incumbent legacy tools.',
    benchmark: 'Core Task Speedup > 10.0x vs Legacy Incumbent',
    formula: 'Legacy Workflow Duration (Minutes) / New Platform Duration (Minutes)',
    dataSources: ['PostgreSQL', 'Datadog', 'Telemetry Logs'],
    svgType: 'python',
    details: {
      overview: 'Peter Thiel asserts that to overcome enterprise switching costs and entrenched legacy inertia, a new product must be 10x better in a specific, measurable dimension.',
      whyItMatters: 'Incremental 20% improvements get lost in procurement friction; 10x leaps create immediate executive buying mandates.',
      calculationLogic: 'Measures median execution latency of customer telemetry pipelines compared to benchmark legacy SQL queries.',
      recommendedRoom: 'Product Strategy & Architecture Room',
      automationHook: 'Automated benchmark comparison card generated for sales reps upon completing enterprise proof-of-concept.'
    },
    tags: ['enterprise', 'peter-thiel', 'zero-to-one', '10x', 'strategy', 'article']
  },
  {
    id: 'enterprise-peter-thiel-power-law',
    slug: 'peter-thiel-power-law-pareto-distribution',
    title: 'Peter Thiel: Power Law Capital & Cohort Concentration',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Auditing the extreme power law distribution where your single best customer segment or acquisition channel generates more revenue than all others combined.',
    benchmark: 'Top 1 Channel yields > 60% of Scalable Pipeline',
    formula: 'Top 5% Account ARR / Total Company ARR * 100',
    dataSources: ['Stripe', 'HubSpot', 'PostgreSQL'],
    okrObjective: 'Focus executive resources exclusively on the single highest-yielding enterprise customer tier.',
    keyResults: [
      'Concentrate outbound sales capacity on the top 5% Fortune 500 ICP profile.',
      'Achieve 72% of annual net-new ARR from the primary enterprise sales channel.',
      'Eliminate 4 underperforming low-margin long-tail marketing experiments.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'In Zero to One, Thiel highlights that the power law governs venture capital and startup channels: one channel will dominate all others combined. This blueprint isolates that power-law driver.',
      whyItMatters: 'Spreading focus equally across 10 distribution channels guarantees mediocrity; mastering the single power-law channel creates an unbeatable moat.',
      calculationLogic: 'Ranks pipeline and revenue attribution across acquisition channels and customer tiers to measure Pareto concentration.',
      recommendedRoom: 'Executive Board & Channel Strategy Room',
      automationHook: 'Quarterly power-law distribution report highlighting channel ROI divergence.'
    },
    tags: ['enterprise', 'peter-thiel', 'power-law', 'pareto', 'capital-allocation']
  },
  {
    id: 'enterprise-paul-graham-default-alive',
    slug: 'paul-graham-default-alive-dead-equation',
    title: 'Paul Graham: Default Alive vs Default Dead Equation',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'YC Founder Formula: Live runway telemetry calculating whether current revenue growth will outpace net cash burn before the bank balance reaches zero.',
    benchmark: 'Status: DEFAULT ALIVE (Runway > Breakeven by 6+ Months)',
    formula: 'Runway_Months >= Time_To_Breakeven_At_Current_MoM_Growth',
    dataSources: ['Stripe', 'Zoho Books', 'Bank Feeds'],
    okrObjective: 'Ensure the company achieves profitable breakeven without requiring emergency external capital.',
    keyResults: [
      'Maintain verifiable Default Alive status with minimum 18 months runway buffer.',
      'Sustain month-over-month ARR growth above 8.5% while holding fixed burn constant.',
      'Compress net burn multiple below 0.60x.'
    ],
    svgType: 'python',
    details: {
      overview: 'Paul Graham’s canonical essay Default Alive or Default Dead forces founders to mathematically answer whether their current trajectory leads to profitability before running out of money.',
      whyItMatters: 'Operating Default Dead forces founders to raise capital on bad terms during market contractions, risking catastrophic dilution.',
      calculationLogic: 'Simulates forward cash trajectories by compounding rolling 90-day revenue growth rates against current monthly net burn.',
      recommendedRoom: 'Founder Board & Cash Runway Room',
      automationHook: 'Immediate red-tier notification if a drop in MoM growth shifts status from Default Alive to Default Dead.'
    },
    tags: ['enterprise', 'yc', 'paul-graham', 'runway', 'cashflow', 'cfo', 'kpi', 'okr']
  },
  {
    id: 'enterprise-rahul-vohra-pmf-engine',
    slug: 'rahul-vohra-superhuman-pmf-engine',
    title: 'Rahul Vohra: Superhuman Product-Market Fit Engine',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'The 40% Very Disappointed Rule: Algorithmic user segmentation to calculate exact PMF score and identify your High-Expectation Customer (HXC).',
    benchmark: 'PMF Score: > 40% "Very Disappointed" Users',
    formula: '(Users Answering "Very Disappointed" Without Product / Total Surveyed) * 100',
    dataSources: ['In-App Survey', 'PostgreSQL', 'HubSpot'],
    okrObjective: 'Systematically measure and increase product-market fit among core high-expectation users.',
    keyResults: [
      'Elevate overall company PMF score from 32% to 54% across core target ICP.',
      'Double down engineering roadmap on what High-Expectation Customers love most.',
      'Systematically address the top 3 friction points raised by somewhat disappointed users.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Rahul Vohra (CEO of Superhuman) reverse-engineered Sean Ellis’s PMF benchmark into a systematic engine that categorizes users and optimizes product roadmaps for the core cohort who love it.',
      whyItMatters: 'Building for users who would not be disappointed if your product disappeared dilutes focus and stalls retention.',
      calculationLogic: 'Surveys active users 14 days after onboarding and segments responses by role, company size, and usage frequency.',
      recommendedRoom: 'Product Leadership & PMF Architecture Room',
      automationHook: 'Automated survey trigger sent to users who complete at least 5 core product actions in their first two weeks.'
    },
    tags: ['enterprise', 'pmf', 'superhuman', 'rahul-vohra', 'retention', 'kpi', 'okr']
  },
  {
    id: 'enterprise-dalton-caldwell-hair-on-fire',
    slug: 'dalton-caldwell-hair-on-fire-problem',
    title: 'Dalton Caldwell: Hair-on-Fire Enterprise Problem Score',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Qualifying enterprise buyer urgency: Scoring problems that executives will pay 6 figures immediately to extinguish versus nice-to-have software.',
    benchmark: 'Opportunity Close Rate > 38% within 21 Days',
    formula: '(Executive Pain Severity * Budget Authority) / Existing Alternative Satisfaction',
    dataSources: ['Zoho CRM', 'HubSpot', 'Gong Transcripts'],
    okrObjective: 'Filter pipeline strictly around existential enterprise problems.',
    keyResults: [
      'Eliminate 40% of low-urgency tire-kicker opportunities from sales pipeline.',
      'Shorten median enterprise sales cycle from 95 days to 32 days.',
      'Increase proposal-to-close conversion rate from 18% to 42%.'
    ],
    svgType: 'context',
    details: {
      overview: 'Dalton Caldwell (Managing Director at YC) advises founders to target hair-on-fire problems where the customer does not care if the product is rough around the edges as long as it solves the immediate crisis.',
      whyItMatters: 'Selling nice-to-have software results in endless committee reviews and stalled enterprise pilots.',
      calculationLogic: 'Scores inbound enterprise leads against historical close data and keyword urgency signals in discovery call notes.',
      recommendedRoom: 'Sales Qualification & Deal Triage Room',
      automationHook: 'Auto-route tier-1 urgency leads directly to founder or executive account director.'
    },
    tags: ['enterprise', 'yc', 'dalton-caldwell', 'sales', 'qualification', 'usecase']
  },
  {
    id: 'enterprise-hamilton-helmer-7-powers',
    slug: 'hamilton-helmer-7-powers-strategic-moat',
    title: 'Hamilton Helmer: 7 Powers Strategic Moat Audit',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'Quantifying the 7 fundamental barriers against competition: Scale Economies, Network Effects, Counter-Positioning, Switching Costs, Branding, Cornered Resources, and Process Power.',
    benchmark: 'Minimum 2 Active Powers with > 5-Year Durability',
    formula: 'Moat Strength Index = Sum(Power_Weight * Defensibility_Score)',
    dataSources: ['PostgreSQL', 'Stripe', 'Google Sheets'],
    svgType: 'roadmap',
    details: {
      overview: 'Hamilton Helmer’s 7 Powers is the premier strategic framework for assessing durable competitive advantage and persistent differential returns.',
      whyItMatters: 'Operational excellence only produces temporary profits; true long-term value creation requires structural strategic power.',
      calculationLogic: 'Audits business metrics across high switching costs, proprietary data assets, and counter-positioning dynamics.',
      recommendedRoom: 'Executive Board & Strategy Room',
      automationHook: 'Annual strategic moat health assessment scorecard exported for board directors.'
    },
    tags: ['enterprise', '7-powers', 'hamilton-helmer', 'strategy', 'moat', 'article']
  },
  {
    id: 'enterprise-ben-horowitz-wartime-cashout',
    slug: 'ben-horowitz-wartime-ceo-cash-out-days',
    title: 'Ben Horowitz: Wartime CEO & Cash-Out Days',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Navigating macro downturns and existential threats with uncompromising focus on survival metrics, ruthless prioritization, and critical cash-out day projections.',
    benchmark: 'Wartime Minimum: > 180 Days Zero-Revenue Runway',
    formula: 'Total Bank Cash / Zero-Revenue Daily Operational Burn Rate',
    dataSources: ['Bank Feeds', 'Zoho Books', 'Stripe'],
    okrObjective: 'Maintain extreme survival resilience and rapid decision velocity during crisis periods.',
    keyResults: [
      'Eliminate all non-essential SaaS tool overhead within 7 days.',
      'Sustain continuous 180+ days of emergency runway under stress-test scenarios.',
      'Reduce strategic decision latency from weeks to under 48 hours.'
    ],
    svgType: 'python',
    details: {
      overview: 'Ben Horowitz (The Hard Thing About Hard Things) distinguishes between Peacetime CEOs who optimize for expansion and Wartime CEOs who must make life-or-death decisions to keep the company alive.',
      whyItMatters: 'When the market turns, companies that hesitate to align burn with reality go bankrupt within months.',
      calculationLogic: 'Stress-tests cash reserves by assuming zero revenue collections and evaluating fixed baseline obligations.',
      recommendedRoom: 'Wartime Command & Treasury Defense Room',
      automationHook: 'Automated daily treasury briefing dispatched directly to the CEO.'
    },
    tags: ['enterprise', 'ben-horowitz', 'a16z', 'wartime-ceo', 'cashflow', 'runway', 'kpi', 'okr']
  },
  {
    id: 'enterprise-brian-balfour-racecar-growth',
    slug: 'brian-balfour-racecar-growth-framework',
    title: 'Brian Balfour: The Racecar Growth Framework',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'Reforge Masterclass: Systematically balancing your Growth Engine (Core Loops), Turbochargers (PR/Events), Fuel (Channels), and Aerodynamic Drag (Churn/Friction).',
    benchmark: 'Engine Loop Re-investment Rate > 65%',
    formula: 'Net Growth Acceleration = (Engine Loops * Fuel Efficiency) - Aerodynamic Drag',
    dataSources: ['PostgreSQL', 'Google Analytics', 'Stripe'],
    svgType: 'roadmap',
    details: {
      overview: 'Brian Balfour (CEO of Reforge) created the Racecar Growth Framework to help operators diagnose why growth stalls: it is rarely a lack of fuel (ad spend), but rather a broken engine loop or extreme drag (churn).',
      whyItMatters: 'Pouring fuel into a car with severe aerodynamic drag only wastes capital without increasing top speed.',
      calculationLogic: 'Correlates acquisition loop outputs against user drop-off and product onboarding friction points.',
      recommendedRoom: 'Growth Architecture & Systems Room',
      automationHook: 'Monthly growth loop health audit identifying the highest-leverage aerodynamic friction points.'
    },
    tags: ['enterprise', 'reforge', 'brian-balfour', 'racecar', 'growth-loops', 'article']
  },
  {
    id: 'enterprise-elena-verna-pql-sales',
    slug: 'elena-verna-pql-to-sql-sales-velocity',
    title: 'Elena Verna: Product-Led Sales (PQL to SQL) Gate',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Automating the exact in-app product usage thresholds that qualify free workspace accounts for enterprise sales rep outreach.',
    benchmark: 'PQL-to-SQL Conversion Rate: 28% to 42%',
    formula: 'Product Qualified Accounts / Free Active Workspaces * 100',
    dataSources: ['PostgreSQL', 'HubSpot', 'Segment'],
    okrObjective: 'Bridge product-led organic adoption into high-ACV enterprise contracts.',
    keyResults: [
      'Generate 65% of enterprise outbound pipeline from organic PQL triggers.',
      'Achieve 35% win rate on PQL-qualified enterprise sales demos.',
      'Reduce customer acquisition cost by 45% compared to cold outbound SDRs.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Elena Verna (Growth advisor to Dropbox, Miro, Amplitude) pioneered modern B2B Product-Led Sales, where sales reps only engage accounts after users have experienced meaningful in-product value.',
      whyItMatters: 'Selling to users who are already getting daily value from your software delivers dramatically higher win rates and larger initial deal sizes.',
      calculationLogic: 'Monitors workspace seat milestones, feature usage frequency, and export events to score account readiness for enterprise upgrades.',
      recommendedRoom: 'Product-Led Sales & Expansion Room',
      automationHook: 'Instant Slack notification to enterprise account executive when a free team adds their 5th team member.'
    },
    tags: ['enterprise', 'elena-verna', 'plg', 'pql', 'sales-velocity', 'kpi', 'okr']
  },
  {
    id: 'enterprise-david-sacks-cohort-triangle',
    slug: 'david-sacks-cohort-triangle-expansion',
    title: 'David Sacks: The SaaS Cohort Triangle & NRR',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Craft Ventures Framework: Visualizing annualized stacked revenue cohorts to verify negative churn and long-term expansion compounding.',
    benchmark: 'Year-3 Cohort Value > 165% of Initial Contract ARR',
    formula: 'ARR_Cohort(Year_N) / ARR_Cohort(Year_0) * 100',
    dataSources: ['Stripe Billing', 'Zoho Books', 'PostgreSQL'],
    okrObjective: 'Build compounding enterprise revenue cohorts that expand over time.',
    keyResults: [
      'Achieve negative net revenue churn across all annual enterprise cohorts.',
      'Scale Year-2 expansion ARR to 140% of Year-1 baseline.',
      'Maintain gross revenue retention above 94% across enterprise tiers.'
    ],
    svgType: 'python',
    details: {
      overview: 'David Sacks (Founding COO of PayPal, GP at Craft Ventures) emphasizes the Cohort Triangle as the single purest indicator of SaaS health: older cohorts must expand faster than churn erodes them.',
      whyItMatters: 'If older cohorts contract, growth becomes an unsustainable treadmill that collapses as scale increases.',
      calculationLogic: 'Calculates the trailing annualized revenue contribution of historical customer inception cohorts.',
      recommendedRoom: 'Board Metrics & SaaS Economics Room',
      automationHook: 'Automated cohort triangle heatmap generated for executive quarterly business reviews.'
    },
    tags: ['enterprise', 'david-sacks', 'craft-ventures', 'saas', 'cohorts', 'nrr', 'kpi', 'okr']
  },
  {
    id: 'enterprise-patrick-campbell-pricing',
    slug: 'patrick-campbell-van-westendorp-pricing',
    title: 'Patrick Campbell: Van Westendorp Price Elasticity',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Van Westendorp Price Sensitivity Meter: Discovering the point of marginal cheapness, optimal price point, and point of marginal expensiveness.',
    benchmark: 'Pricing Yield: +35% ARPU without Conversion Decay',
    formula: 'Intersection(Too Cheap, Cheap, Expensive, Too Expensive curves)',
    dataSources: ['Typeform', 'PostgreSQL', 'Stripe'],
    okrObjective: 'Align software pricing tiers directly with customer value perception.',
    keyResults: [
      'Survey 250 enterprise buyers to map exact price sensitivity thresholds.',
      'Restructure enterprise tier to incorporate value metrics (seats, events, telemetry throughput).',
      'Increase average contract value by 38% while maintaining standard win rates.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Patrick Campbell (Founder of ProfitWell) proved that pricing is the single highest-leverage growth driver, yet most software companies price arbitrarily. This blueprint uses statistical surveying to find optimal price points.',
      whyItMatters: 'Under-pricing your software signals low enterprise credibility; over-pricing without value alignment stalls the sales cycle.',
      calculationLogic: 'Plots cumulative distribution functions of surveyed price perception points to identify the indifference price point.',
      recommendedRoom: 'Monetization & Pricing Strategy Room',
      automationHook: 'Trigger monetization audit when user seat utilization consistently hits 95% of plan ceiling.'
    },
    tags: ['enterprise', 'pricing', 'profitwell', 'patrick-campbell', 'arpu', 'usecase']
  },
  {
    id: 'enterprise-charlie-munger-inversion',
    slug: 'charlie-munger-inversion-risk-audit',
    title: 'Charlie Munger: Inversion & Anti-Fragility Scorecard',
    category: 'enterprise',
    categoryLabel: 'Enterprise & B2B SaaS',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'Invert, always invert: Systematically auditing the 10 critical failure vectors that could ruin the company and building automated telemetry failsafes.',
    benchmark: '100% of Critical Ruin Vectors covered by Failsafes',
    formula: 'Verified Circuit Breakers / Total Identified Critical Vulnerabilities',
    dataSources: ['Datadog', 'AWS CloudWatch', 'Stripe', 'PostgreSQL'],
    svgType: 'roadmap',
    details: {
      overview: 'Charlie Munger famously taught that it is easier to achieve success by systematically avoiding stupidity than by seeking brilliance. This blueprint inverts company goals to map fatal risks (data loss, vendor lock-in, payroll concentration).',
      whyItMatters: 'A single catastrophic failure mode can destroy years of compounding execution.',
      calculationLogic: 'Audits multi-region database redundancy, key-person risk, and revenue concentration thresholds.',
      recommendedRoom: 'Executive Risk & Resilience Room',
      automationHook: 'Instant escalation to CTO and CEO if any single critical service reaches single-point-of-failure status.'
    },
    tags: ['enterprise', 'charlie-munger', 'inversion', 'risk-management', 'anti-fragility', 'article']
  },

  // ==========================================
  // AGENCIES & CONSULTANCIES
  // ==========================================
  {
    id: 'agency-billable-utilization-realization',
    slug: 'agency-billable-utilization-realization-rate',
    title: 'Billable Utilization & Realization Rate',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Real-time telemetry tracking client billable hours against available team capacity and effective collected hourly rates.',
    benchmark: 'Billable Utilization > 78% | Realization > 92%',
    formula: 'Billable Hours / Total Available Hours * 100 (Utilization)',
    dataSources: ['Google Sheets', 'Zoho Books', 'Stripe'],
    okrObjective: 'Maximize agency gross margins and eliminate unbilled scope creep.',
    keyResults: [
      'Maintain team-wide billable utilization above 80% without exceeding 40h standard workweeks.',
      'Achieve effective hourly realization rate above $185/hour.',
      'Eliminate unaccounted non-billable client rework.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Tracks the exact financial yield of every consultant, designer, and engineer across retainers, milestones, and time-and-materials engagements.',
      whyItMatters: 'Scope creep and idle hours are the number one cause of agency margin collapse.',
      calculationLogic: 'Logs time entries against active client retainers and computes effective collected revenue per logged hour.',
      recommendedRoom: 'Agency Operations & Resourcing Room',
      automationHook: 'Alert account directors when a project consumes 85% of budget with less than 60% of deliverables completed.'
    },
    tags: ['agency', 'utilization', 'realization', 'hours', 'margin', 'kpi', 'okr']
  },
  {
    id: 'agency-client-portal-rooms',
    slug: 'agency-multi-tenant-white-label-client-portals',
    title: 'Multi-Tenant Client Telemetry Portals',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Deliver isolated, client-branded live KPI rooms to 50+ clients without manual weekly spreadsheet exports.',
    benchmark: 'Zero Manual Reporting Overhead',
    formula: '1-Click Room Sharing with Client-Restricted Scope',
    dataSources: ['Google Sheets', 'Shopify', 'Meta Ads', 'Zoho Books'],
    okrObjective: 'Deliver automated transparency to agency retainer clients.',
    keyResults: [
      'Save over 120 monthly hours previously spent compiling manual client slide reports.',
      'Increase client contract renewal rate from 74% to 91%.',
      'Provide clients with 24/7 self-serve live marketing telemetry.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Agencies create templated rooms for ad performance, SEO growth, and revenue yield. Each client gets a secure magic-link portal branded with their logo and metrics.',
      whyItMatters: 'Builds immense trust with enterprise clients while eliminating hundreds of hours of manual slide deck preparation.',
      calculationLogic: 'Central data feeds filtered dynamically per client workspace workspace_id.',
      recommendedRoom: 'Client Executive Portal',
      automationHook: 'Scheduled Monday 09:00 AM automated email digest summarizing weekly performance metrics directly to client stakeholders.'
    },
    tags: ['agency', 'client-portal', 'reporting', 'retainer', 'automation']
  },
  {
    id: 'agency-client-concentration-risk',
    slug: 'agency-client-revenue-concentration-risk',
    title: 'Client Concentration Risk & Retainer Health',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Analyze revenue concentration by top accounts alongside average retainer lifespan and contract churn risk.',
    benchmark: 'No single client > 20% of agency revenue',
    formula: 'Top 3 Client Invoiced Revenue / Total Agency Invoiced Revenue * 100',
    dataSources: ['Zoho Books', 'Stripe', 'Google Sheets'],
    okrObjective: 'De-risk agency recurring cashflow and balance client revenue portfolio.',
    keyResults: [
      'Reduce single-client revenue concentration below 18%.',
      'Extend average retainer client lifetime from 9 months to 16 months.',
      'Maintain minimum 3-month operating reserve funded purely from recurring retainers.'
    ],
    svgType: 'python',
    details: {
      overview: 'Monitors the stability of agency revenue by auditing client weightings, payment timeliness, and contract expiration horizons.',
      whyItMatters: 'Losing an anchor client that represents 35%+ of billings can destabilize team payroll overnight.',
      calculationLogic: 'Computed across rolling 90-day billed invoices and categorized by contract renewal dates.',
      recommendedRoom: 'Managing Partner Command Center',
      automationHook: 'Warn leadership 60 days before contract expiry for any account representing more than 10% of monthly revenue.'
    },
    tags: ['agency', 'concentration', 'retainer', 'risk', 'cashflow']
  },
  {
    id: 'agency-blended-gross-margin',
    slug: 'agency-retainer-gross-margin-architecture',
    title: 'Retainer Gross Margin & Contractor Cost Architecture',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'How leading performance agencies maintain 60%+ gross margins across blended internal talent and external contractor pools.',
    benchmark: 'Agency Gross Margin: 58% to 68%',
    formula: '(Retainer Revenue - Direct Labor Cost - Direct Software Tools) / Retainer Revenue * 100',
    dataSources: ['Zoho Books', 'Google Sheets'],
    svgType: 'roadmap',
    details: {
      overview: 'Practical breakdown on setting billable rates, structuring bonus incentives, and allocating shared agency software seat costs per account.',
      whyItMatters: 'Guarantees that winning larger accounts directly translates into bottom-line owner distributions.',
      calculationLogic: 'Direct employee hourly base rate plus contractor invoices subtracted from contract billing.',
      recommendedRoom: 'Finance & Partner Equity Room',
      automationHook: 'Monthly automated margin audit comparing planned budget versus actual hours billed.'
    },
    tags: ['agency', 'margin', 'pricing', 'contractors', 'article']
  },
  {
    id: 'agency-brian-chesky-founder-mode',
    slug: 'brian-chesky-founder-mode-agency-reviews',
    title: 'Brian Chesky: Founder Mode & Zero-Matrix Reviews',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'How eliminating middle management bloat and running weekly managing-partner creative reviews unlocks elite agency execution velocity.',
    benchmark: 'Review Turnaround < 24h | Zero Matrix Handoffs',
    formula: 'Decision Latency (Hours) * Review Frequency -> 0 Bureaucratic Drag',
    dataSources: ['Google Sheets', 'Slack', 'Linear'],
    svgType: 'roadmap',
    details: {
      overview: 'Brian Chesky (CEO of Airbnb) introduced Founder Mode to describe how hands-on founders cut through bureaucratic matrix management to run direct cross-functional reviews of core creative deliverables.',
      whyItMatters: 'Agencies that rely on multiple layers of account managers dilute creative excellence and frustrate high-paying clients.',
      calculationLogic: 'Tracks milestone approval duration from internal draft completion to client sign-off.',
      recommendedRoom: 'Creative Leadership & Founder Review Room',
      automationHook: 'Automatic escalation to Managing Partner if a client milestone draft sits in internal review for over 24 hours.'
    },
    tags: ['agency', 'brian-chesky', 'founder-mode', 'leadership', 'reviews', 'article']
  },
  {
    id: 'agency-andy-grove-task-maturity',
    slug: 'andy-grove-task-relevant-maturity-agency',
    title: 'Andy Grove: Task-Relevant Maturity in Client Teams',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Calibrating partner delegation, QA review frequency, and operational leverage based on individual consultant maturity per deliverable.',
    benchmark: 'Managerial Leverage Ratio > 4.5x',
    formula: 'Managerial Output = Direct Deliverable Output + Leveraged Team Output',
    dataSources: ['Zoho Projects', 'Google Sheets', 'Slack'],
    okrObjective: 'Maximize partner managerial leverage without compromising client output quality.',
    keyResults: [
      'Scale partner billable leverage ratio to 5:1 direct team billings.',
      'Reduce partner time spent on routine QA checks by 60% through standardized runbooks.',
      'Achieve 98% on-time milestone delivery across all client project pods.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Andy Grove (Legendary CEO of Intel) detailed in High Output Management how effective managers apply high oversight to low-TRM tasks and total delegation to high-TRM tasks.',
      whyItMatters: 'Micromanaging senior consultants wastes partner time; under-supervising junior talent causes client churn.',
      calculationLogic: 'Evaluates task defect rates across consultant experience tiers to set automated approval thresholds.',
      recommendedRoom: 'Partner Leverage & Operations Room',
      automationHook: 'Automated milestone fast-track approval for consultants with 10+ consecutive 5-star deliverable ratings.'
    },
    tags: ['agency', 'andy-grove', 'management', 'okr', 'leverage', 'kpi']
  },
  {
    id: 'agency-alex-hormozi-value-equation',
    slug: 'alex-hormozi-grand-slam-offer-yield',
    title: 'Alex Hormozi: Grand Slam Offer Value Equation',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Structuring irresistible agency retainers: (Dream Outcome * Perceived Likelihood of Achievement) / (Time Delay * Effort & Sacrifice).',
    benchmark: 'Offer Value Index > 10.0 | Proposal Close Rate > 45%',
    formula: '(Dream Outcome * Perceived Likelihood) / (Time Delay * Client Effort)',
    dataSources: ['Zoho CRM', 'Stripe', 'Google Sheets'],
    okrObjective: 'Transform commoditized agency hourly pricing into high-ticket outcome-based retainers.',
    keyResults: [
      'Elevate average client upfront retainer from $5,000/mo to $18,000/mo.',
      'Increase sales call proposal close rate from 22% to 48%.',
      'Shorten time to first demonstrable client outcome from 60 days to 14 days.'
    ],
    svgType: 'python',
    details: {
      overview: 'Alex Hormozi ($100M Offers) outlines the exact math of client desire: increasing perceived certainty of outcome while driving time delay and client effort to near-zero.',
      whyItMatters: 'Clients do not want to buy hours of work; they want the fastest, lowest-effort path to guaranteed commercial outcomes.',
      calculationLogic: 'Monitors closing rate variance and average retainer size across standardized vs outcome-guaranteed proposals.',
      recommendedRoom: 'Agency Growth & Offer Architecture Room',
      automationHook: 'Automated proposal scoring audit before dispatching contract to client prospect.'
    },
    tags: ['agency', 'alex-hormozi', 'offers', 'pricing', 'conversion', 'kpi', 'okr']
  },
  {
    id: 'agency-scope-creep-margin-compression',
    slug: 'agency-scope-creep-margin-compression-telemetry',
    title: 'Scope Creep Telemetry & Margin Compression',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'kpi-okr',
    typeLabel: 'KPI & OKR',
    excerpt: 'Tracking out-of-scope client revision loops and unapproved deliverables to safeguard retainer gross margins and trigger automated change orders.',
    benchmark: 'Unbilled Scope Drift < 4.0% of Total Retainer Hours',
    formula: '((Actual Delivered Hours - Contracted Scope Hours) / Contracted Scope Hours) * 100',
    dataSources: ['Google Sheets', 'Zoho Books', 'Linear'],
    okrObjective: 'Eliminate margin erosion caused by unbilled scope expansion.',
    keyResults: [
      'Reduce unpaid client revision hours by 85%.',
      'Generate $24,000 monthly in approved supplemental scope change orders.',
      'Maintain project gross margins above 62% on all fixed-price deliverables.'
    ],
    svgType: 'analyst',
    details: {
      overview: 'Scope creep occurs gradually when client requests are completed without formal change orders, causing profitable retainers to quietly collapse into loss-makers.',
      whyItMatters: 'Unbilled work directly consumes team capacity that could otherwise service new revenue retainers.',
      calculationLogic: 'Logs task hours against contracted statement-of-work ceilings and flags discrepancies in real time.',
      recommendedRoom: 'Project Margin & Scope Governance Room',
      automationHook: 'Automatic change order draft generated and sent to account director when a project reaches 90% of allocated hours.'
    },
    tags: ['agency', 'scope-creep', 'margin', 'operations', 'retainer', 'kpi', 'okr']
  },
  {
    id: 'agency-effective-hourly-rate',
    slug: 'agency-effective-hourly-rate-yield',
    title: 'Effective Hourly Rate (EHR) Yield by Client',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'metric-idea',
    typeLabel: 'Metric Blueprint',
    excerpt: 'Uncovering the true profitability of flat-fee monthly retainers by dividing net billed revenue by total internal hours logged.',
    benchmark: 'Target EHR > $225/hour across Tier-1 Client Accounts',
    formula: 'Monthly Invoiced Retainer Amount / Total Internal Hours Logged',
    dataSources: ['Zoho Books', 'Google Sheets', 'Stripe'],
    okrObjective: 'Identify and renegotiate low-yield client accounts to maximize agency hourly return.',
    keyResults: [
      'Increase agency-wide average EHR from $135/hour to $210/hour.',
      'Renegotiate or terminate bottom 10% of clients operating below $90 EHR.',
      'Reward top-performing project pods with bonus distributions tied to EHR yield.'
    ],
    svgType: 'python',
    details: {
      overview: 'A $20,000/month retainer sounds impressive until you discover the team spent 300 hours servicing it ($66/hr). EHR provides the unvarnished truth of client account profitability.',
      whyItMatters: 'High-revenue clients with low EHR drain agency talent and destroy partner distributions.',
      calculationLogic: 'Queries total monthly invoices per client and divides by all recorded consultant hours.',
      recommendedRoom: 'Partner Profitability & Client Health Room',
      automationHook: 'Monthly EHR scorecard ranked by client account sent to managing partners.'
    },
    tags: ['agency', 'ehr', 'hourly-rate', 'profitability', 'retainer', 'metrics']
  },
  {
    id: 'agency-talent-burnout-index',
    slug: 'agency-talent-burnout-allocation-circuit-breaker',
    title: 'Talent Burnout & Over-Allocation Circuit Breaker',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Predictive workload monitoring to detect team members scheduled above 85% billable capacity for more than 2 consecutive weeks.',
    benchmark: 'Optimal Allocation Band: 72% to 82% Billable Capacity',
    formula: 'Scheduled Billable Hours / Standard Available Hours (40h) * 100',
    dataSources: ['Google Sheets', 'Zoho Projects', 'Slack'],
    okrObjective: 'Prevent top talent turnover and protect creative output quality.',
    keyResults: [
      'Zero voluntary departures of senior technical and creative leads.',
      'Maintain team billable allocation strictly within the healthy 75-80% sweet spot.',
      'Reallocate overflow hours to vetted on-demand contractor network.'
    ],
    svgType: 'context',
    details: {
      overview: 'Agency talent burnout is the primary driver of unexpected employee departures and deliverable mistakes. This blueprint establishes automated workload circuit-breakers.',
      whyItMatters: 'Replacing a senior agency lead costs 6+ months of recruitment fees and disrupts key client relationships.',
      calculationLogic: 'Aggregates forward-looking calendar allocations and historical time logs per team member.',
      recommendedRoom: 'People Ops & Team Wellbeing Room',
      automationHook: 'Alert operations director when any team member exceeds 44 scheduled hours in a single week.'
    },
    tags: ['agency', 'resourcing', 'burnout', 'operations', 'team', 'usecase']
  },
  {
    id: 'agency-client-nps-sentiment',
    slug: 'agency-client-nps-retention-sentiment',
    title: 'Client NPS & Quarterly Retention Sentiment',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'usecase',
    typeLabel: 'Use Case',
    excerpt: 'Automated executive client check-ins and Slack channel response sentiment analysis to flag churn risk 60 days before contract renewal.',
    benchmark: 'Agency Client NPS > +72 | Renewal Rate > 92%',
    formula: 'Client Sentiment Index * Milestone On-Time Delivery %',
    dataSources: ['Slack API', 'Google Forms', 'Zoho CRM'],
    okrObjective: 'Guarantee predictable retainer renewals and proactive client satisfaction.',
    keyResults: [
      'Elevate agency client NPS from +45 to +75.',
      'Detect and remediate 100% of dissatisfied client signals within 24 hours.',
      'Scale annual retainer renewal rate from 72% to 94%.'
    ],
    svgType: 'rooms',
    details: {
      overview: 'Clients rarely cancel without warning; subtle signals appear weeks earlier in slower email responses, shorter feedback, and missed meetings. This blueprint tracks client engagement velocity.',
      whyItMatters: 'Securing a retainer renewal costs a fraction of winning a new client pitch from scratch.',
      calculationLogic: 'Monitors client communication cadence, milestone approvals, and quarterly survey ratings.',
      recommendedRoom: 'Client Success & Executive Relations Room',
      automationHook: 'Flag account for urgent managing partner check-in if client response latency increases by over 200%.'
    },
    tags: ['agency', 'nps', 'client-health', 'retention', 'churn', 'usecase']
  },
  {
    id: 'agency-retainer-packaging-architecture',
    slug: 'agency-productized-service-retainer-architecture',
    title: 'Productized Service & Sprint Packaging',
    category: 'agency',
    categoryLabel: 'Agencies & Consultancies',
    type: 'article',
    typeLabel: 'Deep Dive Article',
    excerpt: 'How leading engineering and design agencies transition from custom bespoke proposals into standardized, high-margin monthly subscription sprints.',
    benchmark: 'Gross Margins > 68% | Sales Cycle < 7 Days',
    formula: 'Standardized Sprint Revenue / Total Agency Billings * 100',
    dataSources: ['Stripe', 'Google Sheets', 'Zoho Books'],
    svgType: 'roadmap',
    details: {
      overview: 'Bespoke custom proposals take weeks to write and negotiate. Productizing agency services into clear 2-week execution sprints with fixed deliverables standardizes operations and accelerates closing velocity.',
      whyItMatters: 'Eliminates weeks of unpaid proposal drafting and allows predictable resourcing of talent.',
      calculationLogic: 'Compares delivery margins and sales duration between custom statements-of-work and productized sprint subscriptions.',
      recommendedRoom: 'Productized Services & Revenue Packaging Room',
      automationHook: 'Automated Stripe subscription checkout link dispatched upon client proposal acceptance.'
    },
    tags: ['agency', 'productized-services', 'sprints', 'retainer', 'pricing', 'article']
  }
];
