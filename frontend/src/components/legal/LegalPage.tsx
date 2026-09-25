import { Link } from 'react-router-dom'
import { ReactNode } from 'react'
import { SEOHead } from '../SEOHead'

interface LegalPageProps {
  title: string
  description: string
  lastUpdated: string
  children: ReactNode
}

/** Public legal page shell (nav, heading, footer) for /privacy and /terms. */
export function LegalPage({ title, description, lastUpdated, children }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-dark-950 text-dark-100">
      <SEOHead
        title={title}
        description={description}
      />
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
        <h1 className="text-4xl font-extrabold text-foreground mb-2">{title}</h1>
        <p className="text-dark-400 mb-12">Last updated: {lastUpdated}</p>

        {children}
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
