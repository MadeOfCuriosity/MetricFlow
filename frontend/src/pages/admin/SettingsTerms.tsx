import { DocumentTextIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { TermsContent, TERMS_LAST_UPDATED } from '../../components/legal/TermsContent'

export function SettingsTerms() {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-dark-800">
        <div>
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-dark-300 stroke-[2]" />
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

      <p className="text-[11px] text-dark-400">Last updated: {TERMS_LAST_UPDATED}</p>
      <TermsContent className="space-y-6 text-dark-300 text-xs sm:text-sm leading-relaxed [&_h2]:text-sm [&_h2]:mb-2 [&_h3]:text-xs [&_h3]:mb-1" />
    </div>
  )
}
