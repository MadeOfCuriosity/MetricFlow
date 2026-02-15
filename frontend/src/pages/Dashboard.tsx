import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveGridLayout, useContainerWidth, verticalCompactor } from 'react-grid-layout'
import type { Layout, ResponsiveLayouts } from 'react-grid-layout'
import {
  PlusIcon,
  ChartBarIcon,
  PencilSquareIcon,
  ArrowPathIcon,
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

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  // Empty state when no KPIs exist
  if (data.kpisWithEntries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-dark-300 mt-1">
              Here's what's happening with {organization?.name} today.
            </p>
          </div>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center shadow-card">
          <ChartBarIcon className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Get started with KPIs</h2>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            Set up your first KPI to start tracking your business metrics. You can use preset KPIs
            or create custom ones with the AI builder.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/kpis"
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add KPIs
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-dark-300 mt-1">
            Here's what's happening with {organization?.name} today.
          </p>
        </div>
        <Link
          to="/entries"
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Enter today's data
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeSelector
          defaultPreset="monthly"
          onChange={(range, preset) => handleDateRangeChange(range, preset)}
        />
        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <button
                onClick={resetToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-dark-300 hover:text-foreground bg-dark-800 rounded-lg hover:bg-dark-700 transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Widget
              </button>
            </>
          )}
          <button
            onClick={() => setEditMode(!isEditMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isEditMode
                ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800 text-dark-300 hover:text-foreground hover:bg-dark-700'
            }`}
          >
            <PencilSquareIcon className="w-4 h-4" />
            {isEditMode ? 'Done' : 'Customize'}
          </button>
        </div>
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
