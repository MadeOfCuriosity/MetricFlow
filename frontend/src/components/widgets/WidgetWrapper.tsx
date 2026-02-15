import { type ReactNode } from 'react'
import { XMarkIcon, Cog6ToothIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline'
import { useDashboard } from '../../context/DashboardContext'

interface WidgetWrapperProps {
  widgetId: string
  title: string
  onConfigure?: () => void
  children: ReactNode
}

export function WidgetWrapper({ widgetId, title, onConfigure, children }: WidgetWrapperProps) {
  const { isEditMode, removeWidget } = useDashboard()

  return (
    <div className="h-full flex flex-col bg-dark-900 border border-dark-700 rounded-xl shadow-card overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isEditMode && (
            <div className="widget-drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-dark-700 transition-colors">
              <ArrowsPointingOutIcon className="w-4 h-4 text-dark-400" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        </div>
        {isEditMode && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {onConfigure && (
              <button
                onClick={onConfigure}
                className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => removeWidget(widgetId)}
              className="p-1.5 rounded-lg text-dark-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden p-4">
        {children}
      </div>
    </div>
  )
}
