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
            <img src="/visualise.png" alt="Visualize" className="w-9 h-9 object-contain" />
            <span className="text-xl font-bold text-white tracking-tight">
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
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl hover:from-primary-400 hover:to-primary-500 transition-all shadow-lg hover:shadow-primary-500/30 hover:scale-[1.03] active:scale-[0.98]"
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
              <Link to="/register" className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl text-center">Start Free Trial</Link>
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
      {/* Background grid + gradient */}
      <div className="absolute inset-0 hero-grid" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/8 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-950 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-primary-400 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
          Now with AI-powered KPI Builder
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] mb-6 animate-fade-in-up delay-100">
          <span className="text-foreground">The KPIs You're</span>
          <br />
          <span className="text-gradient bg-gradient-to-r from-primary-400 via-primary-500 to-success-400 animate-gradient-x">
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
            className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl hover:from-primary-400 hover:to-primary-500 transition-all shadow-xl hover:shadow-primary-500/30 hover:scale-[1.03] active:scale-[0.98]"
          >
            Start Tracking for Free
            <span className="group-hover:translate-x-1 transition-transform">{Icons.arrowRight}</span>
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 px-8 py-4 text-base font-semibold text-dark-200 glass rounded-2xl hover:text-foreground hover:bg-dark-700/60 transition-all"
          >
            <span className="text-primary-400">{Icons.play}</span>
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
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 via-success-500/10 to-primary-500/20 rounded-3xl blur-xl animate-pulse-glow" />
            <div className="relative glass rounded-2xl p-1.5 shadow-2xl">
              <div className="bg-dark-900 rounded-xl overflow-hidden">
                {/* Fake browser bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-dark-850 border-b border-dark-700/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-danger-500/60" />
                    <div className="w-3 h-3 rounded-full bg-warning-500/60" />
                    <div className="w-3 h-3 rounded-full bg-success-500/60" />
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
                      <div className="h-8 w-20 bg-primary-500/20 rounded-lg" />
                      <div className="h-8 w-20 bg-dark-700 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Revenue', value: '$128.4K', change: '+12.5%', color: 'text-success-400' },
                      { label: 'Deals Closed', value: '47', change: '+8.2%', color: 'text-success-400' },
                      { label: 'Churn Rate', value: '2.1%', change: '-0.4%', color: 'text-success-400' },
                      { label: 'NPS Score', value: '72', change: '+5', color: 'text-success-400' },
                    ].map((kpi) => (
                      <div key={kpi.label} className="bg-dark-800/80 rounded-xl p-4 border border-dark-700/50">
                        <div className="text-xs text-dark-400 mb-1">{kpi.label}</div>
                        <div className="text-xl font-bold text-foreground">{kpi.value}</div>
                        <div className={`text-xs font-medium ${kpi.color} mt-1`}>{kpi.change}</div>
                      </div>
                    ))}
                  </div>
                  {/* Fake chart area */}
                  <div className="bg-dark-800/60 rounded-xl p-4 h-48 border border-dark-700/30 flex items-end gap-1">
                    {[35, 42, 38, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 92, 88, 95].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary-500/80 to-primary-400/40 rounded-t-sm"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {[
            { value: 10000, suffix: '+', label: 'KPIs Tracked' },
            { value: 500, suffix: '+', label: 'Organizations' },
            { value: 98, suffix: '%', label: 'Uptime SLA' },
            { value: 50, suffix: 'x', label: 'Faster Than Spreadsheets' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl lg:text-5xl font-extrabold text-foreground mb-2">
                <Counter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-dark-400 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
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
              emoji: '📊',
              title: '"We track everything in spreadsheets"',
              desc: 'Fragmented data across 15 different Google Sheets. No one knows which version is current. Your Monday meetings start with 30 minutes of number-hunting.',
            },
            {
              emoji: '🤷',
              title: '"I think we\'re doing okay?"',
              desc: 'You can\'t name your top 3 KPIs off the top of your head. When the board asks about unit economics, you need "a few days" to pull the numbers.',
            },
            {
              emoji: '🔥',
              title: '"We found out too late"',
              desc: 'Churn spiked 3 weeks ago. CAC doubled last month. You only noticed when revenue dropped. By then, the damage was already done.',
            },
          ].map((pain) => (
            <div
              key={pain.title}
              className="glass rounded-2xl p-8 hover:bg-dark-700/40 transition-all duration-300 group hover:scale-[1.02] hover:shadow-xl"
            >
              <div className="text-4xl mb-4">{pain.emoji}</div>
              <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-danger-400 transition-colors">
                {pain.title}
              </h3>
              <p className="text-dark-300 text-sm leading-relaxed">{pain.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-xl font-semibold text-foreground">
            There's a better way. <span className="text-gradient bg-gradient-to-r from-primary-400 to-success-400">And it takes 5 minutes to set up.</span>
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
      color: 'from-purple-500 to-primary-500',
      tag: 'Most Popular',
    },
    {
      icon: Icons.calculator,
      title: 'Custom Formula Engine',
      desc: 'Build any KPI with mathematical formulas. Revenue per employee? Customer acquisition cost? Gross margin by product line? If you can define it, Visualize calculates it.',
      color: 'from-primary-500 to-primary-600',
    },
    {
      icon: Icons.chartBar,
      title: 'Real-Time Dashboards',
      desc: 'See every metric update the moment data comes in. Trend lines, anomaly detection, and historical comparisons — all in one view.',
      color: 'from-success-500 to-success-600',
    },
    {
      icon: Icons.bolt,
      title: 'AI-Powered Insights',
      desc: 'Stop staring at charts hoping patterns jump out. Our AI surfaces trends, flags anomalies, and recommends actions before problems escalate.',
      color: 'from-warning-500 to-warning-600',
    },
    {
      icon: Icons.link,
      title: 'One-Click Integrations',
      desc: 'Connect Google Sheets, Zoho CRM, LeadSquared, and more. Auto-sync data on your schedule — hourly, daily, or real-time.',
      color: 'from-cyan-500 to-primary-500',
    },
    {
      icon: Icons.userGroup,
      title: 'Team Rooms & Permissions',
      desc: 'Organize KPIs by department, team, or project. Hierarchical rooms with role-based access ensure everyone sees exactly what they need.',
      color: 'from-pink-500 to-danger-500',
    },
    {
      icon: Icons.shield,
      title: 'Enterprise-Grade Security',
      desc: 'Multi-tenant data isolation, encrypted credentials, JWT authentication with token rotation, and rate limiting. Your data stays yours.',
      color: 'from-dark-300 to-dark-500',
    },
    {
      icon: Icons.chat,
      title: 'Daily Data Collection',
      desc: 'Simple forms for daily metric entry. Auto-calculates KPIs on submit. No formulas to maintain, no cells to update. Just enter and go.',
      color: 'from-emerald-500 to-success-500',
    },
  ]

  return (
    <section id="features" ref={ref} className="landing-section relative py-24">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            {Icons.bolt}
            Powerful Features
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Everything You Need to
            <br />
            <span className="text-gradient bg-gradient-to-r from-primary-400 to-success-400">Own Your Numbers</span>
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
                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-success-500/15 text-success-400 text-xs font-semibold mb-3">
                  {f.tag}
                </div>
              )}
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-500/3 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-sm font-medium mb-4">
              {Icons.sparkles}
              AI-Powered
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Just Tell It What You Want to Track.
              <br />
              <span className="text-gradient bg-gradient-to-r from-purple-400 to-primary-400">AI Handles the Rest.</span>
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
                  <div className="w-5 h-5 rounded-full bg-success-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-success-400">{Icons.check}</span>
                  </div>
                  <span className="text-dark-200 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Chat Mockup */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/10 to-primary-500/10 rounded-3xl blur-xl" />
            <div className="relative glass rounded-2xl overflow-hidden shadow-2xl">
              {/* Chat header */}
              <div className="px-5 py-4 border-b border-dark-700/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-primary-500 flex items-center justify-center">
                  <span className="text-white">{Icons.sparkles}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">KPI Builder AI</div>
                  <div className="text-xs text-success-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
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
                        <div className="bg-primary-500/20 text-foreground text-sm rounded-2xl rounded-br-md px-4 py-3 max-w-[85%]">
                          {msg.text}
                        </div>
                      </div>
                    )
                  }
                  if (msg.role === 'ai-card') {
                    return (
                      <div key={i} className="flex justify-start">
                        <div className="bg-dark-800 border border-dark-600/50 rounded-2xl rounded-bl-md p-4 max-w-[85%]">
                          <div className="text-xs text-primary-400 font-semibold mb-2">Suggested KPI</div>
                          <div className="text-sm font-bold text-foreground mb-1">{msg.kpi!.name}</div>
                          <code className="block text-xs text-success-400 bg-dark-900 rounded-lg px-3 py-2 mb-3 font-mono">
                            {msg.kpi!.formula}
                          </code>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.kpi!.fields.map((f) => (
                              <span key={f} className="px-2 py-0.5 bg-dark-700 rounded-md text-xs text-dark-200">
                                {f}
                              </span>
                            ))}
                          </div>
                          <button className="mt-3 w-full py-2 bg-primary-500 text-white text-xs font-semibold rounded-lg">
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
                  <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
      color: 'primary',
    },
    {
      icon: Icons.userGroup,
      industry: 'Sales Teams',
      title: 'Turn Reps Into Revenue Machines',
      desc: 'Pipeline velocity, win rate, average deal size, quota attainment — visible to every rep, every day. Top performers emerge. Underperformers get spotted before it\'s too late.',
      kpis: ['Pipeline Velocity', 'Win Rate %', 'Revenue Per Rep', 'Quota Attainment'],
      color: 'success',
    },
    {
      icon: Icons.globe,
      industry: 'Marketing',
      title: 'Prove ROI or Kill the Campaign',
      desc: 'CAC by channel, ROAS, conversion rates, lead velocity — all in one view. Stop pouring budget into channels that don\'t convert. Redirect spend in real-time.',
      kpis: ['Cost Per Acquisition', 'ROAS by Channel', 'Lead-to-Close Rate', 'Marketing Qualified Leads'],
      color: 'warning',
    },
    {
      icon: Icons.clock,
      industry: 'Operations',
      title: 'Zero Blind Spots in Your Operations',
      desc: 'SLA compliance, production yield, defect rates, fulfillment time — tracked and alerted automatically. Problems surface before customers feel them.',
      kpis: ['SLA Compliance %', 'Production Yield', 'Order Fulfillment Time', 'Defect Rate'],
      color: 'danger',
    },
    {
      icon: Icons.calculator,
      industry: 'Finance',
      title: 'CFO-Ready Numbers, Every Morning',
      desc: 'Gross margin, operating expenses, runway, cash flow — calculated automatically from your data sources. Month-end close becomes a non-event.',
      kpis: ['Gross Margin %', 'Operating Expense Ratio', 'Cash Runway (Months)', 'Revenue Growth Rate'],
      color: 'primary',
    },
    {
      icon: Icons.building,
      industry: 'Agencies & Consultancies',
      title: 'Client Dashboards That Win Renewals',
      desc: 'Give each client their own Room with tailored KPIs. Show measurable impact every month. Clients who see value don\'t churn — they upsell.',
      kpis: ['Client Revenue Growth', 'Campaign Performance', 'Utilization Rate', 'Client Satisfaction Score'],
      color: 'success',
    },
  ]

  const colorMap: Record<string, string> = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
    success: 'bg-success-500/10 text-success-400 border-success-500/20',
    warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
    danger: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  }

  const iconBgMap: Record<string, string> = {
    primary: 'from-primary-500 to-primary-600',
    success: 'from-success-500 to-success-600',
    warning: 'from-warning-500 to-warning-600',
    danger: 'from-danger-500 to-danger-600',
  }

  return (
    <section id="use-cases" ref={ref} className="landing-section relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 text-success-400 text-sm font-medium mb-4">
            {Icons.building}
            Use Cases
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Built for Teams That
            <br />
            <span className="text-gradient bg-gradient-to-r from-success-400 to-primary-400">Refuse to Fly Blind</span>
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
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBgMap[c.color]} flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                  {c.icon}
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorMap[c.color]}`}>
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
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-success-500/5 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 text-primary-400 text-sm font-medium mb-4">
            {Icons.bolt}
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            From Zero to Data-Driven
            <br />
            <span className="text-gradient bg-gradient-to-r from-primary-400 to-success-400">in Under 5 Minutes</span>
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
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-500/5 border border-primary-500/20 flex items-center justify-center">
                    <span className="text-2xl font-extrabold text-primary-400">{s.step}</span>
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
    { name: 'Google Sheets', desc: 'Auto-sync spreadsheet data', icon: '📊' },
    { name: 'Zoho CRM', desc: 'Pull CRM metrics directly', icon: '💼' },
    { name: 'Zoho Books', desc: 'Financial data pipeline', icon: '📒' },
    { name: 'LeadSquared', desc: 'Lead & sales analytics', icon: '📈' },
    { name: 'Zoho Sheet', desc: 'Spreadsheet integration', icon: '📋' },
    { name: 'More Coming', desc: 'Slack, HubSpot, Stripe...', icon: '🔌' },
  ]

  return (
    <section ref={ref} className="landing-section relative py-24 border-y border-dark-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Your Data. <span className="text-gradient bg-gradient-to-r from-cyan-400 to-primary-400">Connected.</span>
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
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{intg.icon}</div>
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
      name: 'Starter',
      desc: 'For solopreneurs and small teams getting started with KPI tracking.',
      price: { monthly: 0, annual: 0 },
      cta: 'Start Free',
      ctaStyle: 'glass hover:bg-dark-700/60 text-foreground',
      features: [
        { text: '3 KPIs', included: true },
        { text: '1 User', included: true },
        { text: '5 AI calls / day', included: true },
        { text: '30-day data retention', included: true },
        { text: 'Manual data entry', included: true },
        { text: 'Integrations', included: false },
        { text: 'Team Rooms', included: false },
        { text: 'Admin Dashboard', included: false },
      ],
    },
    {
      name: 'Team',
      desc: 'For growing teams that need real-time KPI tracking and collaboration.',
      price: { monthly: 79, annual: 63 },
      cta: 'Start 14-Day Trial',
      ctaStyle: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-400 hover:to-primary-500 shadow-lg hover:shadow-primary-500/30',
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
      price: { monthly: 129, annual: 103 },
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-[120px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning-500/10 text-warning-400 text-sm font-medium mb-4">
            Early Adopter Pricing — Lock It In Before It Goes Up
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Simple Pricing.
            <br />
            <span className="text-gradient bg-gradient-to-r from-primary-400 to-success-400">Serious Value.</span>
          </h2>
          <p className="text-lg text-dark-300 max-w-xl mx-auto mb-8">
            Start free. Upgrade when you're addicted to knowing your numbers.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 glass rounded-full p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                !annual ? 'bg-primary-500 text-white shadow' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
                annual ? 'bg-primary-500 text-white shadow' : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 bg-success-500/20 text-success-400 text-xs font-bold rounded-md">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-[1.25rem] ${plan.popular ? 'pricing-popular' : ''}`}
            >
              <div className={`glass rounded-2xl p-7 h-full flex flex-col ${plan.popular ? 'bg-dark-800/90' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary-500 to-success-500 text-white text-xs font-bold rounded-full shadow-lg">
                    MOST POPULAR
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{plan.desc}</p>
                </div>

                <div className="mb-6">
                  {plan.price.monthly === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$0</span>
                      <span className="text-dark-400 text-sm">/forever</span>
                    </div>
                  ) : plan.price.monthly === -1 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">Custom</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">
                        ${annual ? plan.price.annual : plan.price.monthly}
                      </span>
                      <span className="text-dark-400 text-sm">/month</span>
                    </div>
                  )}
                  {plan.price.monthly > 0 && annual && (
                    <div className="text-xs text-success-400 mt-1">
                      Save ${(plan.price.monthly - plan.price.annual) * 12}/year
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
                      <span className={f.included ? 'text-success-400' : 'text-dark-600'}>
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

// ─── Testimonial / Social Proof ───────────────────────────────────────────────
function SocialProof() {
  const ref = useReveal()

  const testimonials = [
    {
      quote: "We were tracking KPIs across 12 different spreadsheets. Visualize consolidated everything in an afternoon. Our Monday meetings went from 45 minutes to 10.",
      name: 'Sarah Chen',
      role: 'VP of Operations',
      company: 'ScaleUp Technologies',
    },
    {
      quote: "The AI builder is insane. I described our sales metrics in plain English and it created a complete dashboard with formulas I didn't even know I needed.",
      name: 'Marcus Rivera',
      role: 'Head of Sales',
      company: 'CloudBase CRM',
    },
    {
      quote: "We caught a churn spike 2 weeks before it would have hit revenue. The AI flagged it automatically. That single insight saved us $200K in ARR.",
      name: 'Priya Patel',
      role: 'CEO',
      company: 'DataPulse Analytics',
    },
  ]

  return (
    <section ref={ref} className="landing-section relative py-24 border-y border-dark-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Teams That Switched <span className="text-gradient bg-gradient-to-r from-warning-400 to-danger-400">Never Went Back</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-7 hover:bg-dark-700/40 transition-all duration-300">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 text-warning-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-dark-200 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div>
                <div className="text-sm font-semibold text-foreground">{t.name}</div>
                <div className="text-xs text-dark-400">{t.role}, {t.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
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
      a: "Yes — the Starter plan is free forever with 3 KPIs. All paid plans include a 14-day free trial with no credit card required. You'll know if Visualize is right for you long before we ask for a dime.",
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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-500/5 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[100px] animate-pulse-glow" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
          Every Day Without Data
          <br />
          <span className="text-gradient bg-gradient-to-r from-danger-400 via-warning-400 to-success-400 animate-gradient-x">
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
            className="group flex items-center gap-2 px-10 py-5 text-lg font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl hover:from-primary-400 hover:to-primary-500 transition-all shadow-xl hover:shadow-primary-500/30 hover:scale-[1.03] active:scale-[0.98]"
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
              <img src="/visualise.png" alt="Visualize" className="w-8 h-8 object-contain" />
              <span className="text-lg font-bold text-white">
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
      <HowItWorks />
      <Integrations />
      <Pricing />
      <SocialProof />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
