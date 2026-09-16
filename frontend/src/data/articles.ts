import { Article } from '../types/landing';

export const ARTICLES: Article[] = [
  {
    id: 'revenue-telemetry',
    slug: 'real-time-revenue-telemetry',
    title: 'Real-Time Revenue Telemetry',
    excerpt:
      'Stream live MRR, ARR, and net revenue retention directly from Stripe and banking APIs with zero pipeline latency.',
    svgType: 'python',
  },
  {
    id: 'cohort-retention',
    slug: 'predictive-cohort-retention',
    title: 'Predictive Cohort Retention',
    excerpt:
      'Analyze churn velocity, customer lifetime value, and expansion curves with automated AI variance forecasting.',
    svgType: 'roadmap',
  },
  {
    id: 'whatsapp-dunning',
    slug: 'automated-whatsapp-dunning',
    title: 'Automated WhatsApp Dunning',
    excerpt:
      'Trigger conversational payment reminders for overdue invoices automatically when accounts receivable thresholds cross.',
    svgType: 'context',
  },
  {
    id: 'workspace-rooms',
    slug: 'hierarchical-workspace-rooms',
    title: 'Hierarchical Workspace Rooms',
    excerpt:
      'Structure organizational metrics across engineering, growth, sales, and executive boards with granular RBAC permissions.',
    svgType: 'rooms',
  },
  {
    id: 'morning-brief',
    slug: 'executive-morning-analyst-note',
    title: 'Executive Morning Analyst Note',
    excerpt:
      'Receive daily synthesized intelligence briefs detailing top movements, anomalies, and operational priorities.',
    svgType: 'analyst',
  },
];
