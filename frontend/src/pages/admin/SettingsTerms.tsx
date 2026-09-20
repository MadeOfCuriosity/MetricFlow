import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export function SettingsTerms() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-purple-400 stroke-[2]" />
            <h2 className="text-base font-bold text-foreground tracking-tight">Terms &amp; Conditions</h2>
          </div>
          <p className="text-xs text-dark-300 mt-1">
            Rules, guidelines, and legal agreements governing the use of Visualize and associated services.
          </p>
        </div>
        <Link
          to="/terms"
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-1">Agreement Terms</p>
          <p className="text-foreground font-medium">Last updated: February 17, 2026 &bull; Effective immediately</p>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">1. Acceptance of Terms</h3>
          <p>
            By accessing, creating an account on, or otherwise using the Visualize platform (&ldquo;Service&rdquo;), you agree to be bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;). If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">2. Description of Service</h3>
          <p>
            Visualize provides automated KPI tracking, data synchronization, departmental metric visualization, and AI-powered performance intelligence for organizations. We reserve the right to improve, modify, or update features of the Service at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">3. User Accounts &amp; Security</h3>
          <ul className="list-disc list-inside space-y-1 pl-1 text-dark-300">
            <li>You must provide accurate and complete registration credentials.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials and tokens.</li>
            <li>Organization Administrators are responsible for managing access permissions, role assignments, and team member accounts within their workspace.</li>
            <li>Notify Visualize immediately of any unauthorized use or security incident.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">4. Data Ownership &amp; Customer Rights</h3>
          <p>
            You retain all rights, title, and interest in and to all data, metric inputs, and files you upload or connect to Visualize (&ldquo;Customer Data&rdquo;). You grant Visualize a limited, non-exclusive license solely to host, process, and analyze Customer Data to deliver the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">5. Third-Party Integrations</h3>
          <p>
            Our Service connects with third-party providers (e.g., Google Workspace, Zoho, LeadSquared). Your use of those third-party services is governed by their respective terms and policies. Visualize is not responsible for interruptions, data errors, or changes caused by third-party APIs.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">6. Acceptable Use Policy</h3>
          <p>
            You agree not to misuse the Service. Specifically, you agree not to:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-dark-300">
            <li>Probe, scan, or test the vulnerability of our system or network without prior authorization.</li>
            <li>Circumvent or attempt to bypass any rate limits, authentication mechanisms, or security filters.</li>
            <li>Reverse engineer, decompile, or disassemble any aspect of the software.</li>
            <li>Transmit malicious code, viruses, or spam through the platform.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">7. Limitation of Liability</h3>
          <p>
            To the maximum extent permitted by applicable law, Visualize and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenues, or data arising out of or related to your use of the Service.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">8. Termination</h3>
          <p>
            You may terminate your organization account at any time through the Settings panel. Visualize may suspend or terminate your access for violation of these Terms, with reasonable notice where practicable.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-bold text-foreground tracking-tight">9. Contact &amp; Questions</h3>
          <p>
            If you have any questions regarding these Terms &amp; Conditions, please reach out to our legal support team at{' '}
            <a href="mailto:legal@visualize.io" className="text-primary-400 hover:underline">
              legal@visualize.io
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
