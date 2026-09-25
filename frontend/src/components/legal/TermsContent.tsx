export const TERMS_LAST_UPDATED = 'September 25, 2026'

/** Single source of the Terms & Conditions text — rendered on the public page and in Settings. */
export function TermsContent({ className }: { className?: string }) {
  return (
    <div className={className ?? 'space-y-10 text-dark-200 text-sm leading-relaxed'}>
      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
        <p>
          By accessing, browsing, creating an account on, or otherwise using the Visualize platform
          (&ldquo;Service&rdquo;), you agree to be bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;).
          If you do not agree to all of these Terms, you may not access or use the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
        <p>
          Visualize provides modern business telemetry, KPI computation, automated integration syncs,
          and AI-driven insights for organizations. Visualize reserves the right to modify, enhance, or
          discontinue features of the Service at any time with or without notice.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">3. Accounts &amp; Access Control</h2>
        <p className="mb-3">
          To use certain features of the Service, you must register for an account. You agree to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-dark-300">
          <li>Provide accurate, current, and complete registration credentials</li>
          <li>Maintain the security of your authentication tokens and password</li>
          <li>Promptly notify Visualize if you discover or suspect any security breach</li>
          <li>Accept responsibility for all activities that occur under your user or organization account</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">4. Customer Data &amp; Proprietary Rights</h2>
        <p className="mb-3">
          You retain all ownership, intellectual property rights, and title to the metrics, entries,
          spreadsheets, and business records you submit to Visualize (&ldquo;Customer Data&rdquo;).
        </p>
        <p>
          You grant Visualize a worldwide, non-exclusive, royalty-free license to access, process, host,
          and display Customer Data strictly to the extent necessary to operate, maintain, and provide
          the Service to your organization.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">5. Third-Party Integrations &amp; APIs</h2>
        <p>
          The Service integrates with third-party software including Google Workspace, Zoho services,
          and LeadSquared. Your use of third-party platforms is subject to their applicable terms of
          service. Visualize does not warrant or guarantee continuous uninterrupted integration with
          third-party APIs beyond our reasonable control.
        </p>
        <h3 className="text-base font-semibold text-foreground mt-4 mb-2">WhatsApp</h3>
        <ul className="list-disc list-inside space-y-2 text-dark-300">
          <li>
            The WhatsApp integration is optional. Organization admins decide whether it is enabled, and
            each user decides whether to connect their own number.
          </li>
          <li>
            You may only connect a phone number that you own or are authorized to use, and admins may only
            assign WhatsApp data entry to team members who have agreed to receive messages from Visualize.
          </li>
          <li>
            Values submitted by WhatsApp are treated exactly like values entered in the web app, including
            who entered them and when.
          </li>
          <li>
            WhatsApp is provided by Meta and your use of it is also subject to WhatsApp&rsquo;s terms. We
            don&rsquo;t guarantee delivery of any message, and your mobile carrier&rsquo;s data charges may apply.
          </li>
          <li>You can stop messages at any time by replying STOP or by disconnecting your number in Settings.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">6. Acceptable Use Policy</h2>
        <p className="mb-3">You agree not to:</p>
        <ul className="list-disc list-inside space-y-2 text-dark-300">
          <li>Use the Service for any unlawful or unauthorized purpose</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its underlying architecture</li>
          <li>Interfere with or disrupt the integrity or performance of the Service or the data contained therein</li>
          <li>Scrape, reverse engineer, decompile, or copy the proprietary algorithms of the platform</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">7. Disclaimers &amp; Limitation of Liability</h2>
        <p className="mb-3">
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind.
          Visualize does not warrant that the Service will be error-free or uninterrupted.
        </p>
        <p>
          In no event shall Visualize be liable for any indirect, incidental, special, consequential, or punitive
          damages, including loss of profits, data, or business goodwill, arising out of your access to or use of the Service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">8. Termination</h2>
        <p>
          Visualize may terminate or suspend your access to the Service immediately, without prior notice or liability,
          for any reason, including without limitation if you breach the Terms. You may cancel your account at any time
          through the organization settings.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">9. Governing Law &amp; Dispute Resolution</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws applicable to commercial software services,
          without regard to conflict of law principles.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">10. Contact Us</h2>
        <p>
          If you have questions regarding these Terms &amp; Conditions, please contact our legal team at:{' '}
          <a href="mailto:legal@visualize.io" className="text-brand hover:text-brand transition-colors">
            legal@visualize.io
          </a>
        </p>
      </section>
    </div>
  )
}
