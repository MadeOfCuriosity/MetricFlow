import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import type { Layout, ResponsiveLayouts } from 'react-grid-layout'
import {
  PlusIcon,
  ChartBarIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { DashboardProvider, useDashboard } from '../context/DashboardContext'
import { DateRangeSelector } from '../components'
import { WidgetWrapper, WidgetRenderer, AddWidgetModal, WidgetConfigModal } from '../components/widgets'
import type { WidgetConfig } from '../types/dashboard'

function DashboardContent() {
  const { user, organization } = useAuth()
  const {
    data,
    layout,
    isEditMode,
    setEditMode,
    updateLayouts,
    resetToDefault,
    handleDateRangeChange,
  } = useDashboard()

  const { width, containerRef } = useContainerWidth({ initialWidth: 1200 })
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [configWidget, setConfigWidget] = useState<WidgetConfig | null>(null)

  const handleLayoutChange = useCallback(
    (_currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
      updateLayouts(allLayouts as unknown as Record<string, import('../types/dashboard').WidgetLayoutItem[]>)
    },
    [updateLayouts]
  )

  const activeKpisCount = data.kpisWithEntries.length
  const totalWidgetsCount = layout.widgets.length

  if (data.isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="space-y-3">
          <div className="h-7 w-64 bg-dark-900 rounded-xl animate-pulse" />
          <div className="h-4 w-96 bg-dark-900 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-dark-900 border border-dark-700 rounded-2xl animate-pulse p-6" />
          ))}
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dark-700 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
            <ChartBarIcon className="w-7 h-7 text-rose-400 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Couldn't load your dashboard</h2>
          <p className="text-xs text-dark-300 max-w-md mb-6">
            {data.error}. This can happen if your session expired — try refreshing the page or signing in again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <ArrowPathIcon className="w-4 h-4 stroke-[2]" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    )
  }

  // Empty state when no KPIs exist
  if (data.kpisWithEntries.length === 0) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-dark-300 mt-1 text-sm">
              Here's what's happening with {organization?.name || 'your organization'} today.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 px-4 bg-dark-900/40 border border-dashed border-dark-700/80 rounded-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-4">
            <ChartBarIcon className="w-8 h-8 text-dark-400 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Get started with KPIs</h2>
          <p className="text-xs text-dark-300 max-w-md mb-6">
            Set up your first KPI to start tracking your business metrics. You can use preset KPIs or create custom ones with the AI builder.
          </p>
          <Link
            to="/kpis"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Add KPIs</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-dark-300 mt-1 text-sm">
            Overview and performance metrics for {organization?.name || 'your organization'}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              isEditMode
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-dark-900 border border-dark-700 text-dark-200 hover:text-foreground hover:border-dark-600'
            }`}
          >
            {isEditMode ? (
              <>
                <CheckIcon className="w-4 h-4 stroke-[2.5]" />
                <span>Done Customizing</span>
              </>
            ) : (
              <>
                <PencilSquareIcon className="w-4 h-4" />
                <span>Customize</span>
              </>
            )}
          </button>

          <Link
            to="/entries"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Enter Today's Data</span>
          </Link>
        </div>
      </div>

      {/* Subtle Summary Stat Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <ChartBarIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Tracked KPIs:</span>
          <span className="font-semibold text-foreground">{activeKpisCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <Squares2X2Icon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Active Widgets:</span>
          <span className="font-semibold text-foreground">{totalWidgetsCount}</span>
        </div>

        {isEditMode && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-xs text-primary-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
            <span>Edit mode active (drag or resize cards)</span>
          </div>
        )}
      </div>

      {/* Toolbar: Date Range & Edit Mode Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <DateRangeSelector
          defaultPreset="monthly"
          onChange={(range, preset) => handleDateRangeChange(range, preset)}
        />

        {isEditMode && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={resetToDefault}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-dark-300 hover:text-foreground bg-dark-900 border border-dark-700 rounded-xl hover:bg-dark-800 transition-colors cursor-pointer"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>Reset Layout</span>
            </button>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-foreground text-dark-950 rounded-xl hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Widget</span>
            </button>
          </div>
        )}
      </div>

      {/* Widget Grid */}
      <div ref={containerRef as React.RefObject<HTMLDivElement>}>
        <ResponsiveGridLayout
          width={width}
          layouts={layout.layouts}
          breakpoints={{ lg: 1200, md: 768, sm: 0 }}
          cols={{ lg: 12, md: 6, sm: 1 }}
          rowHeight={60}
          dragConfig={{ enabled: isEditMode, handle: '.widget-drag-handle', bounded: false, threshold: 3 }}
          resizeConfig={{ enabled: isEditMode, handles: ['se'] }}
          onLayoutChange={handleLayoutChange}
          compactor={verticalCompactor}
          margin={[16, 16]}
        >
          {layout.widgets.map((widget) => (
            <div key={widget.id}>
              <WidgetWrapper
                widgetId={widget.id}
                title={widget.title}
                onConfigure={() => setConfigWidget(widget)}
              >
                <WidgetRenderer config={widget} />
              </WidgetWrapper>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* Modals */}
      <AddWidgetModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
      <WidgetConfigModal
        isOpen={configWidget !== null}
        onClose={() => setConfigWidget(null)}
        widget={configWidget}
      />
    </div>
  )
}

export function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}
