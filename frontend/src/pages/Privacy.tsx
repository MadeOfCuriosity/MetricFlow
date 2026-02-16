import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-100">
      {/* Header */}
      <nav className="border-b border-dark-700/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2.5">
            <img src="/visualise.png" alt="Visualize" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold text-foreground">Visualize</span>
          </Link>
          <Link to="/landing" className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-dark-400 mb-12">Last updated: February 17, 2026</p>

        <div className="space-y-10 text-dark-200 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
            <p>
              Visualize ("we", "our", or "us") operates the Visualize platform (the "Service").
              This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our Service. By accessing or using the Service, you agree
              to the terms of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-semibold text-foreground mb-2">Account Information</h3>
            <p className="mb-3">
              When you create an account, we collect your name, email address, and organization
              details. If you sign up using Google OAuth, we receive your name, email, and profile
              picture from Google.
            </p>
            <h3 className="text-base font-semibold text-foreground mb-2">KPI and Business Data</h3>
            <p className="mb-3">
              You may enter business metrics, KPI definitions, data field values, and related
              information into the Service. This data is stored securely and is only accessible
              to authorized members of your organization.
            </p>
            <h3 className="text-base font-semibold text-foreground mb-2">Integration Data</h3>
            <p className="mb-3">
              When you connect third-party services (Google Sheets, Zoho CRM, Zoho Books, Zoho Sheet,
              or LeadSquared), we store encrypted OAuth tokens or API credentials to maintain your
              connections. We access only the data scopes you explicitly authorize — for example,
              read-only access to Google Sheets (<code className="text-primary-400">spreadsheets.readonly</code>).
            </p>
            <h3 className="text-base font-semibold text-foreground mb-2">Usage Data</h3>
            <p>
              We automatically collect information about how you interact with the Service,
              including pages visited, features used, and timestamps. This helps us improve the
              product.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>To provide, maintain, and improve the Service</li>
              <li>To calculate KPIs and generate AI-powered insights based on your data</li>
              <li>To sync data from connected third-party integrations on your configured schedule</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To send service-related communications (account verification, security alerts)</li>
              <li>To respond to support requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Data Storage and Security</h2>
            <p className="mb-3">
              Your data is stored in secure, encrypted databases. We employ the following security measures:
            </p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-foreground">Multi-tenant isolation:</strong> Each organization's data is logically separated and inaccessible to other organizations</li>
              <li><strong className="text-foreground">Encryption:</strong> OAuth tokens and API credentials are encrypted at rest using Fernet symmetric encryption</li>
              <li><strong className="text-foreground">Authentication:</strong> JWT-based authentication with token rotation and expiration</li>
              <li><strong className="text-foreground">Access control:</strong> Role-based permissions ensure users only access data they are authorized to view</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Third-Party Integrations</h2>
            <p className="mb-3">
              When you connect third-party services, we access data from those services on your
              behalf. We only request the minimum permissions required:
            </p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li><strong className="text-foreground">Google Sheets:</strong> Read-only access to spreadsheet data you specify</li>
              <li><strong className="text-foreground">Zoho CRM / Books / Sheet:</strong> Read access to modules and records you configure</li>
              <li><strong className="text-foreground">LeadSquared:</strong> Read access to leads and activities via API</li>
            </ul>
            <p className="mt-3">
              You can disconnect any integration at any time from your Settings page, which
              revokes our access and deletes stored credentials.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. AI-Powered Features</h2>
            <p>
              Our Service uses Google Gemini AI to generate KPI suggestions and business insights.
              When you use AI features, relevant context (such as KPI names, field names, and
              aggregated metric values) may be sent to Google's AI services for processing. We do
              not send raw personal data to AI services. Google's AI services process data according
              to their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Data Sharing</h2>
            <p>
              We do not sell, rent, or share your personal information or business data with third
              parties for marketing purposes. We may share data only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-dark-300 mt-3">
              <li>With your explicit consent</li>
              <li>To comply with legal obligations or valid legal processes</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>With service providers who assist in operating the Service (hosting, infrastructure), bound by confidentiality obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active or as needed to provide the
              Service. If you delete your account, we will delete your personal information and
              business data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-dark-300">
              <li>Access your personal data stored in the Service</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data</li>
              <li>Withdraw consent for optional data processing</li>
              <li>Disconnect third-party integrations at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Cookies</h2>
            <p>
              We use essential cookies and local storage to maintain your authentication session
              and theme preferences. We do not use tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the updated policy on this page with a revised "Last updated" date.
              Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your data, contact us at:{' '}
              <a href="mailto:privacy@visualize.io" className="text-primary-400 hover:text-primary-300 transition-colors">
                privacy@visualize.io
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700/30 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-dark-500">
            &copy; {new Date().getFullYear()} Visualize. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <Link to="/privacy" className="text-dark-400 hover:text-dark-200 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-dark-400 hover:text-dark-200 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
