import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import {
  WrenchScrewdriverIcon,
  Cog6ToothIcon,
  HomeIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'

export function RadialMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerIconRef = useRef<SVGSVGElement>(null)
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const isSettingsPage = location.pathname.startsWith('/settings')
  const isInsightsPage = location.pathname.startsWith('/insights')

  const radius = 82 // distance from trigger center in pixels

  const menuItems = [
    {
      id: 'settings',
      name: isSettingsPage ? 'Home' : 'Settings',
      icon: isSettingsPage ? HomeIcon : Cog6ToothIcon,
      action: () => navigate(isSettingsPage ? '/dashboard' : '/settings'),
      isActive: isSettingsPage,
    },
    {
      id: 'insights',
      name: 'Insights',
      icon: LightBulbIcon,
      action: () => navigate('/insights'),
      isActive: isInsightsPage,
    },
  ]

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true })

      // Trigger tools icon rotation (0 -> 45deg)
      tl.to(
        triggerIconRef.current,
        {
          rotation: 45,
          duration: 0.35,
          ease: 'power2.out',
          easeReverse: 'power2.in',
        },
        0
      )

      // Radial items spring out with elastic.out and retract with easeReverse
      itemsRef.current.forEach((item, index) => {
        if (!item) return
        // Angle in radians fanning into the upper-right quadrant from bottom-left corner
        const startAngle = 18 * (Math.PI / 180)
        const endAngle = 72 * (Math.PI / 180)
        const angle =
          menuItems.length > 1
            ? startAngle + (index / (menuItems.length - 1)) * (endAngle - startAngle)
            : 45 * (Math.PI / 180)
        const x = Math.sin(angle) * radius
        const y = -Math.cos(angle) * radius

        tl.fromTo(
          item,
          {
            x: 0,
            y: 0,
            scale: 0,
            opacity: 0,
            pointerEvents: 'none',
          },
          {
            x,
            y,
            scale: 1,
            opacity: 1,
            pointerEvents: 'auto',
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)',
            easeReverse: 'power2.in',
          },
          index * 0.05
        )
      })

      timelineRef.current = tl
    }, containerRef)

    return () => ctx.revert()
  }, [radius, menuItems.length])

  // Play forward or reverse when isOpen toggles
  useEffect(() => {
    if (timelineRef.current) {
      if (isOpen) {
        timelineRef.current.play()
      } else {
        timelineRef.current.reverse()
      }
    }
  }, [isOpen])

  const toggleMenu = () => {
    setIsOpen((prev) => !prev)
  }

  const handleItemClick = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <>
      {/* Click outside backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        ref={containerRef}
        className="fixed bottom-4 left-4 z-50 pointer-events-none"
      >
        <div className="relative w-12 h-12 flex items-center justify-center">
          {/* Radial satellite items */}
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => (itemsRef.current[index] = el)}
              type="button"
              onClick={() => handleItemClick(item.action)}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-dark-700 bg-dark-900 shadow-xl flex items-center justify-center group cursor-pointer hover:scale-110 hover:border-foreground/30 hover:bg-dark-800 transition-colors focus:outline-none focus-visible:ring-0 z-40"
              title={item.name}
              aria-label={item.name}
              style={{ willChange: 'transform, opacity' }}
            >
              {/* Tooltip on right */}
              <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium text-foreground bg-dark-850/95 border border-dark-700 rounded-lg shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                {item.name}
              </div>

              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                  item.isActive
                    ? 'bg-dark-800 text-foreground border border-dark-600'
                    : 'text-dark-300 group-hover:text-foreground group-hover:bg-dark-800/80'
                }`}
              >
                <item.icon
                  className={`w-4 h-4 ${
                    item.isActive ? 'text-foreground stroke-[2.2]' : 'stroke-[2]'
                  }`}
                />
              </div>
            </button>
          ))}

          {/* Main Floating Action Button (Trigger) */}
          <button
            type="button"
            onClick={toggleMenu}
            className="w-12 h-12 rounded-full border border-dark-700 bg-dark-900 flex items-center justify-center relative pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-0 hover:scale-105 active:scale-95 transition-transform duration-200 filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] z-50 group hover:border-dark-600 hover:bg-dark-850"
            title={isOpen ? 'Close Tools' : 'Tools'}
            aria-label={isOpen ? 'Close Tools' : 'Tools'}
            aria-expanded={isOpen}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                isOpen
                  ? 'bg-dark-800 text-foreground border border-dark-600'
                  : 'text-dark-300 group-hover:text-foreground group-hover:bg-dark-800/60'
              }`}
            >
              <WrenchScrewdriverIcon
                ref={triggerIconRef}
                className="w-4 h-4 stroke-[2] transform origin-center"
              />
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
