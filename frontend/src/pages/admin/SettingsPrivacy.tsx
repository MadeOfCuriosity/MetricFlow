import { ShieldCheckIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export function SettingsPrivacy() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-emerald-400 stroke-[2]" />
            <h2 className="text-base font-bold text-foreground tracking-tight">Privacy Policy</h2>
          </div>
          <p className="text-xs text-dark-300 mt-1">
            How Visualize collects, uses, encrypts, and safeguards your organizational and business data.
          </p>
        </div>
        <Link
          to="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700/80 border border-dark-700 text-xs font-medium text-dark-200 transition-colors self-start sm:self-auto"
        >
          <span>Open Full Page</span>
          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-dark-300 leading-relaxed">
        <div className="p-4 bg-dark-950/40 border border-dark-800 rounded-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1">Status & Validity</p>
          <p className="text-foreground font-medium">Last updated: February 17, 2026 &bull; Version 2.1</p>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">1. Introduction</h3>
          <p>
            Visualize (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the Visualize platform.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our Service. By accessing or using the Service, you agree
            to the terms of this Privacy Policy.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">2. Information We Collect</h3>
          <div className="space-y-3 pl-1">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Account & Organization Data</h4>
              <p className="mt-0.5">
                When you create an account, we collect your name, email address, password hashes, and organization
                details. If you authenticate with Google OAuth, we receive your name, email address, and profile picture.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground">KPI & Business Metrics</h4>
              <p className="mt-0.5">
                Business metrics, KPI formulas, data field values, targets, and notes entered into the Service
                are encrypted and isolated per organization. Data is strictly accessible only to authorized members.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground">Integration Credentials</h4>
              <p className="mt-0.5">
                When you connect integrations (such as Google Sheets, Zoho CRM, Zoho Books, or LeadSquared),
                we store encrypted OAuth tokens and API secrets using Fernet symmetric encryption with automated token rotation.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">3. How We Use Your Information</h3>
          <ul className="list-disc list-inside space-y-1 pl-1 text-dark-300">
            <li>To provide, maintain, and calculate real-time business KPIs and dashboards</li>
            <li>To execute automated background data syncs according to your integration schedule</li>
            <li>To compute AI-powered trend analysis and automated KPI recommendations</li>
            <li>To authenticate team members and enforce role-based access permissions</li>
            <li>To deliver critical system notifications, digest alerts, and security updates</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">4. Multi-Tenant Data Security</h3>
          <p>
            We implement defense-in-depth architectural safeguards:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="p-3 bg-dark-950/30 border border-dark-800 rounded-xl">
              <span className="text-xs font-semibold text-foreground block">Logical Tenant Isolation</span>
              <span className="text-[11px] text-dark-400 mt-0.5 block">Every database query is strictly partitioned by Organization ID.</span>
            </div>
            <div className="p-3 bg-dark-950/30 border border-dark-800 rounded-xl">
              <span className="text-xs font-semibold text-foreground block">Encryption at Rest & Transit</span>
              <span className="text-[11px] text-dark-400 mt-0.5 block">TLS 1.3 for all in-transit traffic; Fernet AES encryption for stored secrets.</span>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">5. AI Intelligence & Privacy</h3>
          <p>
            When utilizing AI-assisted KPI generation and room insights, metric metadata and calculation parameters are processed via secure API endpoints. We do not use your private organizational records or confidential data to train public foundation models.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">6. Data Ownership & Retention</h3>
          <p>
            You retain 100% ownership of your business data. You may export or request complete deletion of your organization&rsquo;s account and telemetry at any time. Upon account termination, data is purged from active databases within 30 days.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">7. Contact & Data Protection Officer</h3>
          <p>
            For inquiries regarding privacy, data access requests, or regulatory compliance (GDPR/CCPA), contact our privacy team at{' '}
            <a href="mailto:privacy@visualize.io" className="text-primary-400 hover:underline">
              privacy@visualize.io
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
