import { type ReactNode } from 'react'
import { XMarkIcon, Cog6ToothIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { useDashboard } from '../../context/DashboardContext'
import { useTheme } from '../../context/ThemeContext'

interface WidgetWrapperProps {
  widgetId: string
  title: string
  widgetType?: string
  onConfigure?: () => void
  children: ReactNode
}

export function WidgetWrapper({ widgetId, title, widgetType, onConfigure, children }: WidgetWrapperProps) {
  const { isEditMode, removeWidget } = useDashboard()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const hasCustomHeader = widgetType === 'today-progress' && !isEditMode

  return (
    <div
      className={`relative h-full flex flex-col backdrop-blur-2xl border rounded-[28px] overflow-hidden transition-all duration-300 ${
        isDark
          ? 'bg-dark-900/60 border-white/10 hover:border-white/20'
          : 'bg-white/80 border-dark-700/80 hover:border-dark-400/60'
      }`}
      style={{
        boxShadow: isDark
          ? '0 10px 28px -6px rgba(0,0,0,0.65)'
          : '0 4px 20px -2px rgba(0,0,0,0.05), 0 1px 3px 0 rgba(0,0,0,0.03)',
      }}
    >
      {/* Top rim highlight */}
      <div
        className={`absolute inset-x-0 top-0 h-[1px] pointer-events-none ${
          isDark
            ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
            : 'bg-gradient-to-r from-transparent via-black/[0.06] to-transparent'
        }`}
      />

      {/* Title bar - suppressed if widget provides its own header and not in edit mode */}
      {!hasCustomHeader && (
        <div
          className={`flex items-center justify-between px-5 py-3.5 flex-shrink-0 ${
            isEditMode
              ? isDark
                ? 'border-b border-white/[0.07]'
                : 'border-b border-dark-700/60'
              : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isEditMode && (
              <div
                className={`widget-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.05]'
                }`}
              >
                <ArrowsPointingOutIcon className="w-4 h-4 text-dark-400" />
              </div>
            )}
            <h3
              className={`text-sm font-semibold tracking-tight truncate ${
                isDark ? 'text-white/80' : 'text-dark-100'
              }`}
            >
              {title}
            </h3>
          </div>
          {isEditMode && (
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              {onConfigure && (
                <button
                  onClick={onConfigure}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'text-white/40 hover:text-white/80 hover:bg-white/[0.07]'
                      : 'text-dark-400 hover:text-dark-100 hover:bg-black/[0.05]'
                  }`}
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => removeWidget(widgetId)}
                className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-hidden ${hasCustomHeader ? 'p-5 sm:p-6' : 'px-5 pb-5'}`}>
        {children}
      </div>
    </div>
  )
}
