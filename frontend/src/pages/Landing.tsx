import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// ─── Intersection Observer Hook ───────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1500
          const start = performance.now()
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

// ─── Icons (inline SVG to avoid dependency) ───────────────────────────────────
const Icons = {
  bolt: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
  chartBar: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
  sparkles: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  ),
  userGroup: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  ),
  link: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  ),
  shield: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  clock: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  building: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  chat: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  ),
  arrowRight: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  ),
  check: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  ),
  x: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
  play: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
    </svg>
  ),
  globe: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  calculator: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  ),
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-strong shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2.5 group">
            <img src="/visualize%20logo.png" alt="Visualize" className="w-12 h-12 lg:w-14 lg:h-14 object-contain" />
            <span className="text-xl font-bold text-foreground tracking-tight">
              Visualize
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-dark-300 hover:text-foreground transition-colors">Features</a>
            <a href="#use-cases" className="text-sm font-medium text-dark-300 hover:text-foreground transition-colors">Use Cases</a>
            <a href="#how-it-works" className="text-sm font-medium text-dark-300 hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-dark-300 hover:text-foreground transition-colors">Pricing</a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-semibold text-dark-200 hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-xl hover:opacity-90 transition-all shadow-lg hover:scale-[1.03] active:scale-[0.98]"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-dark-300 hover:text-foreground"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden glass-strong rounded-2xl mb-4 p-4 animate-fade-in">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-dark-200 hover:text-foreground hover:bg-dark-700/50 rounded-xl transition-colors">Features</a>
              <a href="#use-cases" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-dark-200 hover:text-foreground hover:bg-dark-700/50 rounded-xl transition-colors">Use Cases</a>
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-dark-200 hover:text-foreground hover:bg-dark-700/50 rounded-xl transition-colors">How It Works</a>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="px-4 py-2.5 text-sm font-medium text-dark-200 hover:text-foreground hover:bg-dark-700/50 rounded-xl transition-colors">Pricing</a>
              <hr className="border-dark-700/50" />
              <Link to="/login" className="px-4 py-2.5 text-sm font-medium text-dark-200 hover:text-foreground rounded-xl transition-colors text-center">Sign In</Link>
              <Link to="/register" className="px-4 py-2.5 text-sm font-semibold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-xl text-center">Start Free Trial</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// ─── Hero Section ─────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background grid */}
      <div className="absolute inset-0 hero-grid" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-foreground/5 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-dark-950" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[linear-gradient(to_right,rgba(138,80,255,0.15)_0%,rgba(84,57,223,0.15)_100%)] border border-[#8A50FF]/30 text-sm font-medium text-dark-200 mb-8 animate-fade-in-up backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] shadow-[0_0_10px_2px_rgba(138,80,255,0.7)] animate-pulse" />
          Build on clarity, not assumptions. It compounds.
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6 animate-fade-in-up delay-100">
          <span className="text-foreground">The KPIs You're</span>
          <br />
          <span className="text-foreground">
            Not Tracking
          </span>
          <br />
          <span className="text-foreground">Are Killing Your Business</span>
        </h1>

        {/* Subheadline */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-dark-300 mb-10 animate-fade-in-up delay-200 leading-relaxed">
          Your competitors review their numbers every morning. They know exactly what's working,
          what's broken, and where to double down. <strong className="text-foreground">You're still guessing.</strong>
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up delay-300">
          <Link
            to="/register"
            className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-2xl hover:opacity-90 transition-all shadow-xl hover:scale-[1.03] active:scale-[0.98]"
          >
            Start Tracking for Free
            <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-dark-200 glass rounded-2xl hover:text-foreground hover:bg-dark-700/60 transition-all"
          >
            <span className="text-foreground">{Icons.play}</span>
            See How It Works
          </a>
        </div>

        {/* Social proof line */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-dark-400 animate-fade-in-up delay-400">
          <div className="flex items-center gap-2">
            {Icons.check}
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            {Icons.check}
            <span>Setup in under 5 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            {Icons.check}
            <span>Cancel anytime</span>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 animate-fade-in-up delay-500">
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-foreground/5 rounded-3xl blur-xl animate-pulse-glow" />
            <div className="relative glass rounded-2xl p-1.5 shadow-2xl">
              <div className="bg-dark-900 rounded-xl overflow-hidden">
                {/* Fake browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-dark-850 border-b border-dark-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-dark-600" />
                    <div className="w-3 h-3 rounded-full bg-dark-600" />
                    <div className="w-3 h-3 rounded-full bg-dark-600" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-lg bg-dark-800 text-xs text-dark-400 font-mono">
                      app.visualize.io/dashboard
                    </div>
                  </div>
                </div>
                {/* Fake dashboard content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-5 w-40 bg-dark-700 rounded-md" />
                      <div className="h-3 w-24 bg-dark-800 rounded mt-2" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 bg-dark-700 rounded-lg" />
                      <div className="h-8 w-20 bg-dark-700 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Revenue', value: '$128.4K', change: '+12.5%' },
                      { label: 'Deals Closed', value: '47', change: '+8.2%' },
                      { label: 'Churn Rate', value: '2.1%', change: '-0.4%' },
                      { label: 'NPS Score', value: '72', change: '+5' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-dark-800/80 rounded-xl p-4 border border-dark-700/50">
                        <div className="text-xs text-dark-400 mb-1">{kpi.label}</div>
                        <div className="text-xl font-bold text-foreground">{kpi.value}</div>
                        <div className="text-xs font-medium text-dark-300 mt-1">{kpi.change}</div>
                      </div>
                    ))}
                  </div>
                  {/* Fake chart area */}
                  <div className="bg-dark-800/60 rounded-xl p-4 h-48 border border-dark-700/30 flex items-end gap-1">
                    {[35, 42, 38, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 92, 88, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-foreground/40 rounded-t-sm"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const ref = useReveal()
  return (
    <section ref={ref} className="landing-section relative py-20 border-y border-dark-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 text-success-400 text-sm font-medium mb-4">
            {Icons.bolt}
            What You Gain
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-3">
            The Visualize Effect
          </h2>
          <p className="text-dark-400 max-w-xl mx-auto">
            What teams typically report after fully adopting Visualize KPI workflows.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          {[
            { value: 5, suffix: 'x', label: 'Faster Decisions', sub: 'from data to action' },
            { value: 10, suffix: 'hrs', label: 'Saved Per Week', sub: 'on manual reporting' },
            { value: 80, suffix: '%', label: 'Less Meeting Time', sub: 'no more number hunts' },
            { value: 15, suffix: 'min', label: 'To First Insight', sub: 'from sign-up to value' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-6 hover:bg-dark-700/40 transition-all">
              <div className="text-4xl lg:text-5xl font-extrabold text-gradient bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] mb-2">
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-foreground font-semibold mb-1">{stat.label}</div>
              <div className="text-xs text-dark-400">{stat.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-dark-500 mt-6 italic">
          Directional outcomes based on typical team adoption — your results depend on team size, data quality, and usage.
        </p>
      </div>
    </section>
  )
}

// ─── Problem / Pain Points ────────────────────────────────────────────────────
function PainPoints() {
  const ref = useReveal()
  return (
    <section ref={ref} className="landing-section relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Sound Familiar?
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            Every day without clear KPIs is a day you're flying blind.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: '"We track everything in spreadsheets"',
              desc: 'Fragmented data across 15 different Google Sheets. No one knows which version is current. Your Monday meetings start with 30 minutes of number-hunting.',
            },
            {
              title: '"I think we\'re doing okay?"',
              desc: 'You can\'t name your top 3 KPIs off the top of your head. When the board asks about unit economics, you need "a few days" to pull the numbers.',
            },
            {
              title: '"We found out too late"',
              desc: 'Churn spiked 3 weeks ago. CAC doubled last month. You only noticed when revenue dropped. By then, the damage was already done.',
            },
          ].map((pain) => (
            <div
              key={pain.title}
              className="glass rounded-2xl p-8 hover:bg-dark-700/40 transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl"
            >
              <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-foreground transition-colors">
                {pain.title}
              </h3>
              <p className="text-dark-300 text-sm leading-relaxed">{pain.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-xl font-semibold text-foreground">
            There's a better way. <span className="text-foreground">And it takes 5 minutes to set up.</span>
          </p>
        </div>
      </div>
    </section>
  )
}

// ─── Features Section ─────────────────────────────────────────────────────────
function Features() {
  const ref = useReveal()

  const features = [
    {
      icon: Icons.sparkles,
      title: 'AI KPI Builder',
      desc: 'Just describe what you want to track in plain English. Our AI creates the perfect KPI formula, fields, and tracking setup — instantly.',
      tag: 'Most Popular',
    },
    {
      icon: Icons.calculator,
      title: 'Custom Formula Engine',
      desc: 'Build any KPI with mathematical formulas. Revenue per employee? Customer acquisition cost? Gross margin by product line? If you can define it, Visualize calculates it.',
    },
    {
      icon: Icons.chartBar,
      title: 'Real-Time Dashboards',
      desc: 'See every metric update the moment data comes in. Trend lines, anomaly detection, and historical comparisons — all in one view.',
    },
    {
      icon: Icons.bolt,
      title: 'AI-Powered Insights',
      desc: 'Stop staring at charts hoping patterns jump out. Our AI surfaces trends, flags anomalies, and recommends actions before problems escalate.',
    },
    {
      icon: Icons.link,
      title: 'One-Click Integrations',
      desc: 'Connect Google Sheets, Zoho CRM, LeadSquared, and more. Auto-sync data on your schedule — hourly, daily, or real-time.',
    },
    {
      icon: Icons.userGroup,
      title: 'Team Rooms & Permissions',
      desc: 'Organize KPIs by department, team, or project. Hierarchical rooms with role-based access ensure everyone sees exactly what they need.',
    },
    {
      icon: Icons.shield,
      title: 'Enterprise-Grade Security',
      desc: 'Multi-tenant data isolation, encrypted credentials, JWT authentication with token rotation, and rate limiting. Your data stays yours.',
    },
    {
      icon: Icons.chat,
      title: 'Daily Data Collection',
      desc: 'Simple forms for daily metric entry. Auto-calculates KPIs on submit. No formulas to maintain, no cells to update. Just enter and go.',
    },
  ]

  return (
    <section id="features" ref={ref} className="landing-section relative py-24">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-foreground/3 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 text-dark-300 text-sm font-medium mb-4">
            {Icons.bolt}
            Powerful Features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Everything You Need to
            <br />
            <span className="text-foreground">Own Your Numbers</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            From AI-powered KPI creation to automated data pipelines — Visualize gives you
            superpowers that used to require a full analytics team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group glass rounded-2xl p-6 hover:bg-dark-700/40 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${
                i === 0 ? 'md:col-span-2 lg:col-span-2' : ''
              }`}
            >
              {f.tag && (
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-dark-700 text-dark-200 text-xs font-semibold mb-3">
                  {f.tag}
                </div>
              )}
              <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center text-dark-950 mb-4 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-dark-300 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── AI Builder Showcase ──────────────────────────────────────────────────────
function AIShowcase() {
  const ref = useReveal()

  const messages = [
    { role: 'user' as const, text: "I want to track how much it costs us to acquire each new customer" },
    { role: 'ai' as const, text: "I'll create a Customer Acquisition Cost (CAC) KPI for you. This will use total marketing & sales spend divided by new customers acquired." },
    { role: 'ai-card' as const, text: '', kpi: { name: 'Customer Acquisition Cost', formula: 'marketing_spend + sales_spend) / new_customers', fields: ['Marketing Spend ($)', 'Sales Spend ($)', 'New Customers (#)'] } },
    { role: 'user' as const, text: "Can you also add one for the payback period?" },
    { role: 'ai' as const, text: "Great idea. I'll create a CAC Payback Period that shows how many months it takes to recover acquisition cost from average revenue per customer." },
  ]

  return (
    <section ref={ref} className="landing-section relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 text-dark-300 text-sm font-medium mb-4">
              {Icons.sparkles}
              AI-Powered
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Just Tell It What You Want to Track.
              <br />
              <span className="text-foreground">AI Handles the Rest.</span>
            </h2>
            <p className="text-lg text-dark-300 mb-8 leading-relaxed">
              No more googling KPI formulas. No more guessing what fields you need.
              Describe your goal in plain English — our Gemini-powered AI builds the
              complete KPI with formula, input fields, and tracking setup.
            </p>
            <div className="space-y-4">
              {[
                'Creates formulas from natural language descriptions',
                'Suggests related KPIs you should also track',
                'Auto-configures input fields with correct units',
                'Learns your industry context for better recommendations',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-foreground">{Icons.check}</span>
                  </div>
                  <span className="text-dark-200 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Chat Mockup */}
          <div className="relative">
            <div className="absolute -inset-4 bg-foreground/3 rounded-3xl blur-xl" />
            <div className="relative glass rounded-2xl overflow-hidden shadow-2xl">
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-dark-700/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                  <span className="text-dark-950">{Icons.sparkles}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">KPI Builder AI</div>
                  <div className="text-xs text-dark-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                    Online
                  </div>
                </div>
              </div>

              {/* Chat messages */}
              <div className="p-5 space-y-4 max-h-[420px]">
                {messages.map((msg, i) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={i} className="flex justify-end">
                        <div className="bg-dark-700 text-foreground text-sm rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
                          {msg.text}
                        </div>
                      </div>
                    )
                  }
                  if (msg.role === 'ai-card') {
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="bg-dark-800 border border-dark-600/50 rounded-2xl rounded-bl-md p-4 max-w-[85%]">
                          <div className="text-xs text-foreground font-semibold mb-2">Suggested KPI</div>
                          <div className="text-sm font-bold text-foreground mb-1">{msg.kpi!.name}</div>
                          <code className="block text-xs text-dark-200 bg-dark-900 rounded-lg px-3 py-2 mb-3 font-mono">
                            {msg.kpi!.formula}
                          </code>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.kpi!.fields.map((f) => (
                              <span key={f} className="px-2 py-0.5 bg-dark-700 rounded-md text-xs text-dark-200">
                                {f}
                              </span>
                            ))}
                          </div>
                          <button className="mt-3 w-full py-2 bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] text-white text-xs font-semibold rounded-lg">
                            + Add This KPI
                          </button>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={i} className="flex justify-start">
                      <div className="bg-dark-800 text-dark-200 text-sm rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                        {msg.text}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Input bar */}
              <div className="px-5 py-4 border-t border-dark-700/50">
                <div className="flex items-center gap-2 bg-dark-800 rounded-xl px-4 py-2.5">
                  <span className="text-dark-400 text-sm flex-1">Describe a metric you want to track...</span>
                  <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                    <svg className="w-4 h-4 text-dark-950" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Use Cases ────────────────────────────────────────────────────────────────
function UseCases() {
  const ref = useReveal()

  const cases = [
    {
      icon: Icons.building,
      industry: 'SaaS & Startups',
      title: 'Know Your Unit Economics Cold',
      desc: 'Track MRR, ARR, churn rate, LTV:CAC ratio, burn rate, and runway — updated daily. When investors ask tough questions, you answer in seconds, not days.',
      kpis: ['Monthly Recurring Revenue', 'Customer Churn Rate', 'LTV:CAC Ratio', 'Net Revenue Retention'],
    },
    {
      icon: Icons.userGroup,
      industry: 'Sales Teams',
      title: 'Turn Reps Into Revenue Machines',
      desc: 'Pipeline velocity, win rate, average deal size, quota attainment — visible to every rep, every day. Top performers emerge. Underperformers get spotted before it\'s too late.',
      kpis: ['Pipeline Velocity', 'Win Rate %', 'Revenue Per Rep', 'Quota Attainment'],
    },
    {
      icon: Icons.globe,
      industry: 'Marketing',
      title: 'Prove ROI or Kill the Campaign',
      desc: 'CAC by channel, ROAS, conversion rates, lead velocity — all in one view. Stop pouring budget into channels that don\'t convert. Redirect spend in real-time.',
      kpis: ['Cost Per Acquisition', 'ROAS by Channel', 'Lead-to-Close Rate', 'Marketing Qualified Leads'],
    },
    {
      icon: Icons.clock,
      industry: 'Operations',
      title: 'Zero Blind Spots in Your Operations',
      desc: 'SLA compliance, production yield, defect rates, fulfillment time — tracked and alerted automatically. Problems surface before customers feel them.',
      kpis: ['SLA Compliance %', 'Production Yield', 'Order Fulfillment Time', 'Defect Rate'],
    },
    {
      icon: Icons.calculator,
      industry: 'Finance',
      title: 'CFO-Ready Numbers, Every Morning',
      desc: 'Gross margin, operating expenses, runway, cash flow — calculated automatically from your data sources. Month-end close becomes a non-event.',
      kpis: ['Gross Margin %', 'Operating Expense Ratio', 'Cash Runway (Months)', 'Revenue Growth Rate'],
    },
    {
      icon: Icons.building,
      industry: 'Agencies & Consultancies',
      title: 'Client Dashboards That Win Renewals',
      desc: 'Give each client their own Room with tailored KPIs. Show measurable impact every month. Clients who see value don\'t churn — they upsell.',
      kpis: ['Client Revenue Growth', 'Campaign Performance', 'Utilization Rate', 'Client Satisfaction Score'],
    },
  ]

  return (
    <section id="use-cases" ref={ref} className="landing-section relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 text-dark-300 text-sm font-medium mb-4">
            {Icons.building}
            Use Cases
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Built for Teams That
            <br />
            <span className="text-foreground">Refuse to Fly Blind</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            From seed-stage startups to 500-person operations — if you have numbers that matter, Visualize tracks them.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group glass rounded-2xl p-7 hover:bg-dark-700/40 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center text-dark-950 group-hover:scale-110 transition-transform">
                  {c.icon}
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-dark-700/50 text-dark-200 border-dark-600/50">
                  {c.industry}
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{c.title}</h3>
              <p className="text-sm text-dark-300 leading-relaxed mb-5 flex-1">{c.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {c.kpis.map((kpi) => (
                  <span key={kpi} className="px-2.5 py-1 bg-dark-800/80 border border-dark-700/50 rounded-lg text-xs text-dark-300 font-medium">
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const ref = useReveal()

  const steps = [
    {
      step: '01',
      title: 'Create Your Organization',
      desc: 'Sign up with email or Google. Name your org, pick your industry. Your isolated workspace is ready in seconds.',
      detail: 'Multi-tenant architecture means your data is completely separated from everyone else\'s. Enterprise-grade isolation from day one.',
    },
    {
      step: '02',
      title: 'Define KPIs (or Let AI Do It)',
      desc: 'Use the AI builder to describe what you want to track in plain English, pick from preset templates, or build custom formulas.',
      detail: 'The AI understands business context. Say "track how efficient our sales team is" and it suggests Revenue Per Rep, Win Rate, and Pipeline Velocity.',
    },
    {
      step: '03',
      title: 'Connect Your Data',
      desc: 'Link Google Sheets, Zoho CRM, LeadSquared, or enter data manually. Set sync schedules — hourly, daily, or on-demand.',
      detail: 'OAuth-based connections are encrypted end-to-end. Your credentials never touch our servers in plain text.',
    },
    {
      step: '04',
      title: 'Get Insights, Take Action',
      desc: 'AI analyzes your trends, spots anomalies, and recommends actions. Your dashboard updates in real-time. No analyst required.',
      detail: 'Our AI doesn\'t just describe what happened — it tells you why it matters and what to do next. Priorities are flagged by urgency.',
    },
  ]

  return (
    <section id="how-it-works" ref={ref} className="landing-section relative py-24">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-foreground/3 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 text-dark-300 text-sm font-medium mb-4">
            {Icons.bolt}
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            From Zero to Data-Driven
            <br />
            <span className="text-foreground">in Under 5 Minutes</span>
          </h2>
        </div>

        <div className="space-y-6">
          {steps.map((s, i) => (
            <div
              key={s.step}
              className={`group glass rounded-2xl p-8 lg:p-10 hover:bg-dark-700/40 transition-all duration-300 hover:shadow-xl ${
                i % 2 === 0 ? '' : ''
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-dark-700 border border-dark-600 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-foreground">{s.step}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-dark-200 mb-3 leading-relaxed">{s.desc}</p>
                  <p className="text-sm text-dark-400 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Integrations ─────────────────────────────────────────────────────────────
function Integrations() {
  const ref = useReveal()

  const integrations = [
    { name: 'Google Sheets', desc: 'Auto-sync spreadsheet data' },
    { name: 'Zoho CRM', desc: 'Pull CRM metrics directly' },
    { name: 'Zoho Books', desc: 'Financial data pipeline' },
    { name: 'LeadSquared', desc: 'Lead & sales analytics' },
    { name: 'Zoho Sheet', desc: 'Spreadsheet integration' },
    { name: 'More Coming', desc: 'Slack, HubSpot, Stripe...' },
  ]

  return (
    <section ref={ref} className="landing-section relative py-24 border-y border-dark-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Your Data. <span className="text-foreground">Connected.</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-xl mx-auto">
            One-click OAuth integrations. No CSV uploads. No copy-paste. Your tools talk to Visualize automatically.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {integrations.map((intg) => (
            <div
              key={intg.name}
              className="glass rounded-2xl p-5 text-center hover:bg-dark-700/40 transition-all duration-300 hover:scale-[1.05] group"
            >
              <div className="text-sm font-semibold text-foreground mb-1">{intg.name}</div>
              <div className="text-xs text-dark-400">{intg.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const ref = useReveal()
  const [annual, setAnnual] = useState(true)

  const plans = [
    {
      name: 'Team',
      desc: 'For growing teams that need real-time KPI tracking and collaboration.',
      price: { monthly: 3999, annual: 3199 },
      cta: 'Start 14-Day Trial',
      ctaStyle: 'bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] text-white hover:opacity-90 shadow-lg',
      popular: true,
      features: [
        { text: '20 KPIs', included: true },
        { text: '5 Users', included: true },
        { text: '25 AI calls / day', included: true },
        { text: 'Unlimited data retention', included: true },
        { text: '2 Integrations', included: true },
        { text: '3 Team Rooms', included: true },
        { text: 'AI Insights', included: true },
        { text: 'Email support', included: true },
      ],
    },
    {
      name: 'Business',
      desc: 'For scaling companies that demand complete visibility across every department.',
      price: { monthly: 7999, annual: 6399 },
      cta: 'Start 14-Day Trial',
      ctaStyle: 'glass hover:bg-dark-700/60 text-foreground',
      features: [
        { text: 'Unlimited KPIs', included: true },
        { text: '25 Users', included: true },
        { text: '50 AI calls / day', included: true },
        { text: 'All Integrations', included: true },
        { text: 'Unlimited Rooms', included: true },
        { text: 'Admin Dashboard', included: true },
        { text: 'Priority AI Insights', included: true },
        { text: 'Priority support', included: true },
      ],
    },
    {
      name: 'Enterprise',
      desc: 'Custom solutions for large organizations with advanced security and compliance needs.',
      price: { monthly: -1, annual: -1 },
      cta: 'Contact Sales',
      ctaStyle: 'glass hover:bg-dark-700/60 text-foreground',
      features: [
        { text: 'Everything in Business', included: true },
        { text: 'Unlimited Users', included: true },
        { text: 'Unlimited AI calls', included: true },
        { text: 'SSO / SAML', included: true },
        { text: 'Custom integrations', included: true },
        { text: 'Dedicated onboarding', included: true },
        { text: 'SLA guarantee', included: true },
        { text: 'Dedicated support', included: true },
      ],
    },
  ]

  return (
    <section id="pricing" ref={ref} className="landing-section relative py-24">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-foreground/3 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-700/50 text-dark-300 text-sm font-medium mb-4">
            Early Adopter Pricing — Lock It In Before It Goes Up
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Simple Pricing.
            <br />
            <span className="text-foreground">Serious Value.</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-xl mx-auto mb-8">
            Try free for 14 days. No credit card required.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 glass rounded-full p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !annual ? 'bg-foreground text-dark-950 shadow' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                annual ? 'bg-foreground text-dark-950 shadow' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 bg-dark-700 text-dark-200 text-xs font-bold rounded-md">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-[1.25rem] ${plan.popular ? 'pricing-popular' : ''}`}
            >
              <div className={`glass rounded-2xl p-7 h-full flex flex-col ${plan.popular ? 'bg-dark-800/90' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-foreground text-dark-950 text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className={`text-sm leading-relaxed ${plan.popular ? 'text-dark-200' : 'text-dark-400'}`}>{plan.desc}</p>
                </div>

                <div className="mb-6">
                  {plan.price.monthly === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">₹0</span>
                      <span className={`text-sm ${plan.popular ? 'text-dark-200' : 'text-dark-400'}`}>/forever</span>
                    </div>
                  ) : plan.price.monthly === -1 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">Custom</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">
                        ₹{(annual ? plan.price.annual : plan.price.monthly).toLocaleString('en-IN')}
                      </span>
                      <span className={`text-sm ${plan.popular ? 'text-dark-200' : 'text-dark-400'}`}>/month</span>
                    </div>
                  )}
                  {plan.price.monthly > 0 && annual && (
                    <div className="text-xs text-foreground mt-1">
                      Save ₹{((plan.price.monthly - plan.price.annual) * 12).toLocaleString('en-IN')}/year
                    </div>
                  )}
                </div>

                <Link
                  to="/register"
                  className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-all hover:scale-[1.02] active:scale-[0.98] block mb-6 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>

                <div className="space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <div key={f.text} className="flex items-center gap-2.5">
                      <span className={f.included ? 'text-foreground' : 'text-dark-600'}>
                        {f.included ? Icons.check : Icons.x}
                      </span>
                      <span className={`text-sm ${f.included ? 'text-dark-200' : 'text-dark-500'}`}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-dark-400 mt-8">
          All paid plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  )
}

// ─── Case Studies (Illustrative Scenarios) ────────────────────────────────────
function CaseStudies() {
  const ref = useReveal()
  const [active, setActive] = useState(0)

  const studies = [
    {
      persona: 'SaaS Founder',
      headline: 'Catch churn 6 weeks before it hits revenue',
      company: 'Example: 25-person B2B SaaS, $2M ARR',
      color: 'primary',
      before: {
        title: 'Before Visualize',
        points: [
          'KPIs scattered across 8 Google Sheets',
          'Sunday nights spent prepping Monday ops meeting',
          'Board deck prep took 3 full days each month',
          'Churn spike discovered 6 weeks late — lost $48K ARR',
        ],
      },
      after: {
        title: 'After Visualize',
        points: [
          'All 14 KPIs live on one synced dashboard',
          'AI flagged rising churn signal in week 2',
          'Saved 3 at-risk accounts through early intervention',
          'Board deck auto-generates from live dashboard',
        ],
      },
      metrics: [
        { label: 'Earlier detection', value: '6 weeks' },
        { label: 'Time saved', value: '40 hrs/mo' },
        { label: 'ARR saved', value: '$48K+' },
      ],
    },
    {
      persona: 'Agency Owner',
      headline: 'Turn client reporting from overhead into your retention engine',
      company: 'Example: 12-person marketing agency, 18 retainer clients',
      color: 'success',
      before: {
        title: 'Before Visualize',
        points: [
          '2 days/month creating PowerPoint client reports',
          'Clients pushed back on renewals — "we can\'t see the impact"',
          'Churned 2 accounts last quarter worth $72K/year',
          'No consistent way to demonstrate campaign ROI',
        ],
      },
      after: {
        title: 'After Visualize',
        points: [
          'Each client gets their own Room with live dashboard',
          'Clients log in themselves to see progress 24/7',
          'Renewed 100% of Q3 retainers',
          'Upsold 3 clients to premium tier after seeing ROI',
        ],
      },
      metrics: [
        { label: 'Retention', value: '100%' },
        { label: 'Upsells', value: '+3 clients' },
        { label: 'Time saved', value: '16 hrs/mo' },
      ],
    },
    {
      persona: 'Sales Leader',
      headline: 'Spot underperformance in week 3, not at quarter-end',
      company: 'Example: 30-rep inside sales team, $15M pipeline',
      color: 'warning',
      before: {
        title: 'Before Visualize',
        points: [
          'Discovered 2 reps were 40% below quota only at quarter-end',
          'Pipeline reviews took 2 hours every week',
          'No visibility into which channels drove best-fit deals',
          'Coaching kicked in too late to course-correct',
        ],
      },
      after: {
        title: 'After Visualize',
        points: [
          'Live quota dashboards surfaced gaps in week 3',
          'AI spotted inbound converting 3x better than cold outbound',
          'Reallocated team focus — beat quarterly quota by 18%',
          'Pipeline reviews cut from 2 hours to 20 minutes',
        ],
      },
      metrics: [
        { label: 'Over quota', value: '+18%' },
        { label: 'Review time', value: '−83%' },
        { label: 'Lead insight', value: '3x' },
      ],
    },
  ]

  const colorMap: Record<string, { pill: string; gradient: string; border: string }> = {
    primary: { pill: 'bg-primary-500/15 text-primary-400 border-primary-500/20', gradient: 'from-primary-400 to-primary-500', border: 'border-primary-500/30' },
    success: { pill: 'bg-success-500/15 text-success-400 border-success-500/20', gradient: 'from-success-400 to-success-500', border: 'border-success-500/30' },
    warning: { pill: 'bg-warning-500/15 text-warning-400 border-warning-500/20', gradient: 'from-warning-400 to-warning-500', border: 'border-warning-500/30' },
  }

  const s = studies[active]
  const c = colorMap[s.color]

  return (
    <section ref={ref} className="landing-section relative py-24 border-y border-dark-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            {Icons.sparkles}
            See What's Possible
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            What a Transformation
            <br />
            <span className="text-gradient bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)]">Actually Looks Like</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            Three illustrative scenarios showing the typical before-and-after when teams fully adopt Visualize.
          </p>
        </div>

        {/* Persona tabs */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {studies.map((st, i) => (
            <button
              key={st.persona}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                i === active
                  ? `glass border ${colorMap[st.color].border} text-foreground shadow-lg`
                  : 'glass text-dark-300 hover:text-foreground hover:bg-dark-700/40'
              }`}
            >
              {st.persona}
            </button>
          ))}
        </div>

        {/* Active case study */}
        <div className="glass rounded-3xl p-8 lg:p-10 transition-all duration-500">
          <div className="mb-8">
            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${c.pill} mb-4`}>
              {s.company}
            </span>
            <h3 className="text-2xl lg:text-3xl font-extrabold text-foreground mb-2">
              {s.headline}
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-danger-500/5 border border-danger-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-danger-400">{Icons.x}</span>
                <span className="text-sm font-bold text-danger-400 uppercase tracking-wide">{s.before.title}</span>
              </div>
              <ul className="space-y-3">
                {s.before.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-dark-300 leading-relaxed">
                    <span className="text-danger-400 mt-0.5 flex-shrink-0">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`bg-success-500/5 border border-success-500/20 rounded-2xl p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-success-400">{Icons.check}</span>
                <span className="text-sm font-bold text-success-400 uppercase tracking-wide">{s.after.title}</span>
              </div>
              <ul className="space-y-3">
                {s.after.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-dark-200 leading-relaxed">
                    <span className="text-success-400 mt-0.5 flex-shrink-0">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Outcome metrics */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-dark-700/40">
            {s.metrics.map((m) => (
              <div key={m.label} className="text-center">
                <div className={`text-2xl lg:text-3xl font-extrabold text-gradient bg-gradient-to-r ${c.gradient} mb-1`}>
                  {m.value}
                </div>
                <div className="text-xs text-dark-400 font-medium">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-dark-500 mt-6 italic">
          Scenarios are illustrative composites based on common customer journeys. Your outcomes will depend on team size, data quality, and adoption.
        </p>
      </div>
    </section>
  )
}

// ─── ROI Calculator (Interactive) ─────────────────────────────────────────────
function ROICalculator() {
  const ref = useReveal()
  const [teamSize, setTeamSize] = useState(8)
  const [hoursWeekly, setHoursWeekly] = useState(5)
  const [hourlyRate, setHourlyRate] = useState(65)

  const currentWeeklyHours = teamSize * hoursWeekly
  const hoursSavedWeekly = Math.round(currentWeeklyHours * 0.8)
  const annualSavings = Math.round(hoursSavedWeekly * 52 * hourlyRate)
  const annualHoursSaved = hoursSavedWeekly * 52

  const formatDollar = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `$${n}`

  return (
    <section ref={ref} className="landing-section relative py-24 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-success-500/5 rounded-full blur-[120px]" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 text-success-400 text-sm font-medium mb-4">
            {Icons.calculator}
            ROI Calculator
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            See Your Savings
            <br />
            <span className="text-gradient bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)]">In Real Time</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            Drag the sliders. Watch what your team gets back.
          </p>
        </div>

        <div className="glass rounded-3xl p-8 lg:p-10">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Inputs */}
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="text-sm font-semibold text-foreground">Team Size</label>
                  <span className="text-2xl font-bold text-primary-400">{teamSize} <span className="text-sm text-dark-400 font-medium">people</span></span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-2 bg-dark-800 rounded-full appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-dark-500 mt-2">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="text-sm font-semibold text-foreground">Hours per Person Weekly on KPIs & Reporting</label>
                  <span className="text-2xl font-bold text-primary-400">{hoursWeekly} <span className="text-sm text-dark-400 font-medium">hrs</span></span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={hoursWeekly}
                  onChange={(e) => setHoursWeekly(Number(e.target.value))}
                  className="w-full h-2 bg-dark-800 rounded-full appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-dark-500 mt-2">
                  <span>1 hr</span>
                  <span>20 hrs</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="text-sm font-semibold text-foreground">Avg Hourly Cost</label>
                  <span className="text-2xl font-bold text-primary-400">${hourlyRate}<span className="text-sm text-dark-400 font-medium">/hr</span></span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={200}
                  step={5}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full h-2 bg-dark-800 rounded-full appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-dark-500 mt-2">
                  <span>$25</span>
                  <span>$200</span>
                </div>
              </div>

              <div className="text-xs text-dark-500 italic leading-relaxed">
                Estimate assumes Visualize reclaims ~80% of time spent on manual KPI collection, formatting, and reporting — based on typical team outcomes.
              </div>
            </div>

            {/* Results */}
            <div className="relative">
              <div className="absolute -inset-4 bg-[linear-gradient(to_right,rgba(138,80,255,0.12),rgba(84,57,223,0.12))] rounded-3xl blur-xl" />
              <div className="relative bg-dark-900/60 border border-dark-700/50 rounded-2xl p-8 h-full flex flex-col justify-center">
                <div className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-6">Your Team Gains</div>

                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-dark-400 mb-1">Annual Time Saved</div>
                    <div className="text-4xl lg:text-5xl font-extrabold text-gradient bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)]">
                      {annualHoursSaved.toLocaleString()} <span className="text-2xl">hours</span>
                    </div>
                    <div className="text-xs text-dark-500 mt-1">{hoursSavedWeekly} hrs reclaimed every week</div>
                  </div>

                  <div className="h-px bg-dark-700/50" />

                  <div>
                    <div className="text-sm text-dark-400 mb-1">Annual Cost Savings</div>
                    <div className="text-4xl lg:text-5xl font-extrabold text-gradient bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)]">
                      {formatDollar(annualSavings)}
                    </div>
                    <div className="text-xs text-dark-500 mt-1">in recovered productivity</div>
                  </div>

                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4 mt-4">
                    <div className="text-xs text-primary-400 font-semibold mb-1">PAYBACK PERIOD</div>
                    <div className="text-lg font-bold text-foreground">
                      Less than 1 week on the Team plan
                    </div>
                  </div>
                </div>

                <Link
                  to="/register"
                  className="mt-6 group flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-xl hover:opacity-90 transition-all shadow-lg"
                >
                  Claim These Savings
                  <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Comparison Table ─────────────────────────────────────────────────────────
function ComparisonTable() {
  const ref = useReveal()

  const rows = [
    { feature: 'Setup time', spreadsheets: 'Hours to days', bi: 'Weeks to months', visualize: 'Under 5 minutes' },
    { feature: 'AI KPI creation', spreadsheets: false, bi: false, visualize: true },
    { feature: 'Formula auto-calculation', spreadsheets: 'Manual', bi: true, visualize: true },
    { feature: 'Real-time sync', spreadsheets: false, bi: true, visualize: true },
    { feature: 'Anomaly detection', spreadsheets: false, bi: 'Add-on', visualize: true },
    { feature: 'Team rooms & permissions', spreadsheets: 'Limited', bi: true, visualize: true },
    { feature: 'Client-ready dashboards', spreadsheets: false, bi: true, visualize: true },
    { feature: 'Requires analyst', spreadsheets: 'Often', bi: 'Yes', visualize: 'No' },
    { feature: 'Starting cost', spreadsheets: 'Free', bi: '$500+/mo', visualize: 'Free' },
  ]

  const renderCell = (val: string | boolean, emphasis = false) => {
    if (val === true) {
      return (
        <div className="flex justify-center">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${emphasis ? 'bg-success-500/30 text-success-400' : 'bg-success-500/15 text-success-400'}`}>
            {Icons.check}
          </span>
        </div>
      )
    }
    if (val === false) {
      return (
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger-500/10 text-danger-500/70">
            {Icons.x}
          </span>
        </div>
      )
    }
    return (
      <div className={`text-center text-sm ${emphasis ? 'text-foreground font-semibold' : 'text-dark-300'}`}>
        {val}
      </div>
    )
  }

  return (
    <section ref={ref} className="landing-section relative py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-500/10 text-warning-400 text-sm font-medium mb-4">
            {Icons.chartBar}
            Side-by-Side
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            How Visualize Stacks Up
          </h2>
          <p className="text-lg text-dark-300 max-w-2xl mx-auto">
            Versus where most teams live today — and versus heavy enterprise BI tools.
          </p>
        </div>

        <div className="glass rounded-3xl overflow-hidden">
          <div className="grid grid-cols-4 border-b border-dark-700/50">
            <div className="p-5 text-sm font-semibold text-dark-400 uppercase tracking-wider">Feature</div>
            <div className="p-5 text-center">
              <div className="text-sm font-bold text-dark-300">Spreadsheets</div>
              <div className="text-xs text-dark-500 mt-0.5">Google Sheets / Excel</div>
            </div>
            <div className="p-5 text-center">
              <div className="text-sm font-bold text-dark-300">Enterprise BI</div>
              <div className="text-xs text-dark-500 mt-0.5">Tableau / Power BI</div>
            </div>
            <div className="p-5 text-center bg-[linear-gradient(to_bottom,rgba(84,57,223,0.15),transparent)]">
              <div className="text-sm font-bold text-primary-400">Visualize</div>
              <div className="text-xs text-success-400 mt-0.5 font-semibold">Recommended</div>
            </div>
          </div>

          {rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-4 items-center ${i !== rows.length - 1 ? 'border-b border-dark-700/30' : ''}`}
            >
              <div className="p-5 text-sm font-medium text-foreground">{row.feature}</div>
              <div className="p-5">{renderCell(row.spreadsheets)}</div>
              <div className="p-5">{renderCell(row.bi)}</div>
              <div className="p-5 bg-primary-500/5">{renderCell(row.visualize, true)}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-2xl hover:opacity-90 transition-all shadow-xl hover:scale-[1.03] active:scale-[0.98]"
          >
            Try Visualize Free
            <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Fit Checker ──────────────────────────────────────────────────────────────
function FitChecker() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])

  const questions = [
    {
      q: "What's your team size?",
      options: [
        { label: 'Solo / Just me', score: 2 },
        { label: '2–10 people', score: 3 },
        { label: '11–50 people', score: 3 },
        { label: '50+ people', score: 2 },
      ],
    },
    {
      q: 'How do you track KPIs today?',
      options: [
        { label: 'Spreadsheets', score: 3 },
        { label: 'Multiple disconnected tools', score: 3 },
        { label: 'A BI platform (Tableau, Looker…)', score: 1 },
        { label: "We don't really track them", score: 3 },
      ],
    },
    {
      q: "What's your biggest need right now?",
      options: [
        { label: 'Real-time dashboards', score: 3 },
        { label: 'AI-powered insights', score: 3 },
        { label: 'One place for all data sources', score: 3 },
        { label: 'Escape spreadsheet chaos', score: 3 },
      ],
    },
  ]

  const handleAnswer = (score: number) => {
    const newAnswers = [...answers, score]
    setAnswers(newAnswers)
    setStep(step + 1)
  }

  const reset = () => {
    setStep(0)
    setAnswers([])
  }

  const close = () => {
    setOpen(false)
    setTimeout(reset, 300)
  }

  const totalScore = answers.reduce((a, b) => a + b, 0)
  const maxScore = questions.length * 3
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  const result =
    percentage >= 90
      ? { title: 'Perfect Fit', emoji: '🎯', message: 'Visualize is built exactly for teams like yours.' }
      : percentage >= 70
      ? { title: 'Great Fit', emoji: '✅', message: "You'll get serious value from Visualize." }
      : { title: 'Worth a Look', emoji: '🤔', message: 'Visualize can still help — try it free and see.' }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] text-white font-semibold shadow-[0_12px_40px_-8px_rgba(138,80,255,0.6)] hover:scale-105 active:scale-95 transition-transform ${
          open ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Check if Visualize fits your business"
      >
        <img src="/visualise.png" alt="" className="w-5 h-5 object-contain" />
        <span className="text-sm">Does Visualize fit?</span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-[min(92vw,380px)] bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-5 py-3.5 bg-dark-800/80 border-b border-dark-700">
            <div>
              <p className="text-sm font-bold text-foreground">Visualize Fit Check</p>
              <p className="text-[11px] text-dark-400">Takes 30 seconds</p>
            </div>
            <button
              onClick={close}
              className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700 transition-colors"
              aria-label="Close"
            >
              {Icons.x}
            </button>
          </div>

          <div className="p-5">
            {step < questions.length ? (
              <>
                <div className="flex items-center gap-1.5 mb-4">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= step ? 'bg-primary-500' : 'bg-dark-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-dark-400 mb-2">
                  Question {step + 1} of {questions.length}
                </p>
                <h4 className="text-base font-semibold text-foreground mb-4">
                  {questions[step].q}
                </h4>
                <div className="space-y-2">
                  {questions[step].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt.score)}
                      className="w-full text-left px-4 py-3 text-sm text-dark-200 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-primary-500/60 rounded-xl transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <div className="text-5xl mb-3">{result.emoji}</div>
                <h4 className="text-xl font-bold text-foreground mb-1.5">{result.title}</h4>
                <p className="text-sm text-dark-300 mb-4">{result.message}</p>
                <div className="relative h-2 bg-dark-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="absolute inset-y-0 left-0 bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-dark-400 mb-5">{percentage}% match with Visualize</p>
                <div className="flex gap-2">
                  <Link
                    to="/register"
                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Start Free Trial
                  </Link>
                  <button
                    onClick={reset}
                    className="px-4 py-3 text-sm font-semibold text-dark-200 bg-dark-800 border border-dark-700 hover:bg-dark-700 rounded-xl transition-colors"
                  >
                    Retake
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sticky Mobile CTA ────────────────────────────────────────────────────────
function StickyMobileCTA() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-3 bg-gradient-to-t from-dark-950 via-dark-950/95 to-transparent transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <Link
        to="/register"
        className="w-full flex items-center justify-center gap-2 px-6 py-4 text-base font-bold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-2xl shadow-2xl active:scale-[0.98] transition-transform"
      >
        Start Free — No Credit Card
        {Icons.arrowRight}
      </Link>
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const ref = useReveal()
  const [open, setOpen] = useState<number | null>(null)

  const faqs = [
    {
      q: "How is this different from a spreadsheet?",
      a: "Spreadsheets are great for storing data. They're terrible for tracking KPIs. Visualize auto-calculates formulas, generates AI insights, syncs with your tools, and gives you real-time dashboards — things that would take you hours in Google Sheets every week.",
    },
    {
      q: "Do I need a data analyst to use this?",
      a: "Absolutely not. That's the whole point. Our AI builder creates KPIs from plain English descriptions. You describe what you want to track, and Visualize handles the formula, fields, and calculations. If you can type a sentence, you can use Visualize.",
    },
    {
      q: "How secure is my data?",
      a: "Enterprise-grade. Multi-tenant isolation means your data is completely separated from other organizations. Credentials are encrypted with Fernet encryption. JWT tokens with rotation prevent unauthorized access. We use the same security standards as enterprise SaaS platforms.",
    },
    {
      q: "Can I try it before paying?",
      a: "Yes — every paid plan includes a 14-day free trial with no credit card required. You'll know if Visualize is right for you long before we ask for a dime.",
    },
    {
      q: "What integrations do you support?",
      a: "Currently: Google Sheets, Zoho CRM, Zoho Books, Zoho Sheet, and LeadSquared. We're adding Slack, HubSpot, Stripe, and Salesforce in the coming months. You can also enter data manually or via our API.",
    },
    {
      q: "Can I organize KPIs by department/team?",
      a: "Yes. Rooms let you organize KPIs by department, team, project, or client — with full hierarchical nesting. Each room has its own members, KPIs, and AI builder. Role-based access ensures everyone sees exactly what they need.",
    },
  ]

  return (
    <section ref={ref} className="landing-section relative py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="glass rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="text-sm font-semibold text-foreground pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-dark-400 flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  open === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-5 text-sm text-dark-300 leading-relaxed">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const ref = useReveal()

  return (
    <section ref={ref} className="landing-section relative py-32 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-foreground/5 rounded-full blur-[100px] animate-pulse-glow" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
          Every Day Without Data
          <br />
          <span className="text-foreground">
            Is a Day Your Competitors Win
          </span>
        </h2>
        <p className="text-lg text-dark-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          The best teams don't have better instincts. They have better data.
          Stop reacting. Start predicting. Join the companies that know their numbers cold.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="group flex items-center gap-2 px-10 py-5 text-lg font-bold text-white bg-[linear-gradient(to_right,#8A50FF_0%,#5439DF_100%)] rounded-2xl hover:opacity-90 transition-all shadow-xl hover:scale-[1.03] active:scale-[0.98]"
          >
            Start Tracking for Free
            <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
          </Link>
        </div>
        <p className="text-sm text-dark-400 mt-6">
          Free forever plan available. No credit card required. Setup in under 5 minutes.
        </p>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-dark-700/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/visualize%20logo.png" alt="Visualize" className="w-11 h-11 object-contain" />
              <span className="text-lg font-bold text-foreground">
                Visualize
              </span>
            </div>
            <p className="text-sm text-dark-400 leading-relaxed">
              AI-powered KPI tracking for teams that refuse to fly blind. See everything. Miss nothing.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <div className="space-y-2.5">
              <a href="#features" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Features</a>
              <a href="#pricing" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Pricing</a>
              <a href="#use-cases" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Use Cases</a>
              <a href="#how-it-works" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">How It Works</a>
            </div>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
            <div className="space-y-2.5">
              <a href="#" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Documentation</a>
              <a href="#" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">API Reference</a>
              <a href="#" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Blog</a>
              <a href="#" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Changelog</a>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
            <div className="space-y-2.5">
              <a href="#" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">About</a>
              <Link to="/privacy" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Terms of Service</Link>
              <a href="#" className="block text-sm text-dark-400 hover:text-dark-200 transition-colors">Contact</a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-dark-700/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-dark-500">
            &copy; {new Date().getFullYear()} Visualize. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-dark-500 hover:text-dark-300 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
            </a>
            <a href="#" className="text-dark-500 hover:text-dark-300 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            </a>
            <a href="#" className="text-dark-500 hover:text-dark-300 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="landing-page min-h-screen bg-dark-950 text-dark-100 overflow-x-hidden">
      <Navbar />
      <Hero />
      <StatsBar />
      <PainPoints />
      <Features />
      <AIShowcase />
      <UseCases />
      <CaseStudies />
      <HowItWorks />
      <ROICalculator />
      <ComparisonTable />
      <Integrations />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <StickyMobileCTA />
      <FitChecker />
    </div>
  )
}
