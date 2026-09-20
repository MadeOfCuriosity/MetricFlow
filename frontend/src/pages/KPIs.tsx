import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  SparklesIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  TagIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { KPIList } from '../components/KPIList'
import { KPIDetailModal } from '../components/KPIDetailModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { PresetSelectionModal } from '../components/PresetSelectionModal'
import { Skeleton } from '../components'
import { SEOHead } from '../components/SEOHead'
import { useToast } from '../context/ToastContext'
import api from '../services/api'
import { KPICreationStudio } from '../components/KPICreationStudio'

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'other'

interface KPI {
  id: string
  name: string
  description: string
  category: string
  formula: string
  input_fields: string[]
  unit: string
  direction: 'up' | 'down'
  is_active: boolean
  is_preset?: boolean
  time_period?: TimePeriod
  room_paths?: string[]
  room_id?: string | null
  room_name?: string | null
  room_color?: string | null
  latest_value?: number | null
  last_updated_at?: string | null
  previous_value?: number | null
  created_at?: string
}

interface Preset {
  name: string
  description: string
  formula: string
  category: string
  time_period?: TimePeriod
}

const CATEGORIES = ['All', 'Sales', 'Marketing', 'Operations', 'Finance', 'Custom']

export function KPIs() {
  const { success, error } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Tab State: Synchronized with query param ?tab=all | ?tab=create
  const initialTab = searchParams.get('tab') === 'create' ? 'create' : 'all'
  const [activeTab, setActiveTab] = useState<'all' | 'create'>(initialTab)

  const handleTabChange = (tab: 'all' | 'create') => {
    setActiveTab(tab)
    if (tab === 'create') {
      setSearchParams({ tab: 'create' })
    } else {
      setSearchParams({})
    }
  }

  const [kpis, setKpis] = useState<KPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [kpiToDelete, setKpiToDelete] = useState<KPI | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isSeedingPresets, setIsSeedingPresets] = useState(false)
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false)
  const [availablePresets, setAvailablePresets] = useState<Preset[]>([])
  const [isLoadingPresets, setIsLoadingPresets] = useState(false)

  useEffect(() => {
    fetchKPIs()
  }, [])

  const fetchKPIs = async () => {
    setIsLoading(true)
    try {
      const response = await api.get('/api/kpis')
      const data = response.data
      setKpis(Array.isArray(data) ? data : data?.kpis ?? [])
    } catch (err) {
      console.error('Failed to fetch KPIs:', err)
      setKpis([])
      error('Failed to load KPIs', 'Please try again later')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectKPI = (kpi: KPI) => {
    setSelectedKPI(kpi)
    setIsDetailModalOpen(true)
  }

  const handleDeleteKPI = async () => {
    if (!kpiToDelete) return

    setIsDeleting(kpiToDelete.id)
    try {
      await api.delete(`/api/kpis/${kpiToDelete.id}`)
      setKpis((prev) => prev.filter((k) => k.id !== kpiToDelete.id))
      success('KPI deleted', `"${kpiToDelete.name}" has been removed`)
      setKpiToDelete(null)
    } catch (err) {
      console.error('Failed to delete KPI:', err)
      error('Failed to delete KPI', 'Please try again')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleOpenPresetModal = async () => {
    setIsPresetModalOpen(true)
    setIsLoadingPresets(true)
    try {
      const response = await api.get('/api/kpis/available-presets')
      setAvailablePresets(response.data.available_presets)
    } catch (err) {
      console.error('Failed to fetch available presets:', err)
      error('Failed to load presets', 'Please try again')
      setIsPresetModalOpen(false)
    } finally {
      setIsLoadingPresets(false)
    }
  }

  const handleAddSelectedPresets = async (selectedPresets: string[]) => {
    setIsSeedingPresets(true)
    try {
      const response = await api.post('/api/kpis/seed-presets', {
        preset_names: selectedPresets,
      })
      success(
        'Presets added',
        `${response.data.presets_created} preset KPI${response.data.presets_created !== 1 ? 's have' : ' has'} been added`
      )
      setIsPresetModalOpen(false)
      await fetchKPIs()
    } catch (err: unknown) {
      console.error('Failed to add presets:', err)
      error('Failed to add presets', 'Please try again')
    } finally {
      setIsSeedingPresets(false)
    }
  }



  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: kpis.length }
    kpis.forEach((kpi) => {
      const category = kpi.category || 'Custom'
      counts[category] = (counts[category] || 0) + 1
    })
    return counts
  }, [kpis])

  // Filtered and sorted KPIs based on search, category, and latest-updated order
  const filteredKPIs = useMemo(() => {
    const list = kpis.filter((kpi) => {
      const matchesSearch =
        !searchQuery.trim() ||
        kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (kpi.description && kpi.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (kpi.formula && kpi.formula.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchesSearch) return false

      if (selectedCategory && selectedCategory !== 'All') {
        const cat = kpi.category || 'Custom'
        return cat === selectedCategory
      }

      return true
    })

    // Sort by latest updated order: most recently updated first, fallback to creation date
    return list.sort((a, b) => {
      const timeA = new Date(a.last_updated_at || a.created_at || 0).getTime()
      const timeB = new Date(b.last_updated_at || b.created_at || 0).getTime()
      return timeB - timeA
    })
  }, [kpis, searchQuery, selectedCategory])

  const totalKpisCount = kpis.length
  const activeKpisCount = useMemo(() => kpis.filter((k) => k.is_active !== false).length, [kpis])
  const presetKpisCount = useMemo(() => kpis.filter((k) => k.is_preset).length, [kpis])
  const customKpisCount = totalKpisCount - presetKpisCount

  // Empty state component for All KPIs
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-700 flex items-center justify-center mb-4">
        <ChartBarIcon className="w-8 h-8 text-dark-400 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No KPIs configured</h3>
      <p className="text-sm text-dark-300 max-w-md text-center mb-6">
        Start tracking your business metrics with AI-generated custom formulas or standard industry presets.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleTabChange('create')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground text-dark-950 font-semibold hover:opacity-90 transition-opacity text-sm shadow-sm cursor-pointer"
        >
          <SparklesIcon className="w-4 h-4 stroke-[2.5]" />
          <span>Create with AI</span>
        </button>
        <button
          type="button"
          onClick={handleOpenPresetModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-foreground font-medium text-sm border border-dark-700 transition-colors cursor-pointer"
        >
          <span>Add Presets</span>
        </button>
      </div>
    </div>
  )

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-xl flex-shrink-0" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div
      className={`mx-auto transition-all ${
        activeTab === 'create'
          ? 'w-full max-w-[1650px] flex-1 min-h-0 h-full flex flex-col gap-3 overflow-hidden'
          : 'space-y-8 max-w-7xl pb-32'
      }`}
    >
      <SEOHead
        title="KPIs & Metrics"
        description="Manage key performance indicators, custom formulas, targets, and automated AI calculations."
      />

      {/* Header with 2 Switches / Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {activeTab === 'create' ? 'KPI Studio' : 'KPIs'}
          </h1>
          {activeTab === 'all' && (
            <p className="text-dark-300 mt-0.5 text-xs sm:text-sm hidden sm:block">
              Manage your organization's key performance indicators, formulas, and metric targets.
            </p>
          )}
        </div>

        {/* 2 Switches / Tabs: All KPIs and Create */}
        <div className="flex items-center p-1 bg-dark-850 dark:bg-dark-900 border border-dark-700 rounded-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                : 'text-dark-400 hover:text-foreground border border-transparent'
            }`}
          >
            <span>All KPIs</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-normal ${
                activeTab === 'all'
                  ? 'bg-dark-700 text-foreground'
                  : 'bg-dark-800/80 text-dark-400'
              }`}
            >
              {totalKpisCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('create')}
            className={`flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-dark-800 text-foreground shadow-sm border border-dark-700/60'
                : 'text-dark-400 hover:text-foreground border border-transparent'
            }`}
          >
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ALL KPIs (Everything previously there, minus 'Explore More KPI Presets') */}
      {activeTab === 'all' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Subtle KPI Summary Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
              <ChartBarIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
              <span className="text-dark-400">Total KPIs:</span>
              <span className="font-semibold text-foreground">{totalKpisCount}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-dark-400">Active:</span>
              <span className="font-semibold text-foreground">{activeKpisCount}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
              <SparklesIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
              <span className="text-dark-400">Presets:</span>
              <span className="font-semibold text-foreground">{presetKpisCount}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
              <TagIcon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
              <span className="text-dark-400">Custom:</span>
              <span className="font-semibold text-foreground">{customKpisCount}</span>
            </div>

            {/* Quick Link to Create tab */}
            <button
              type="button"
              onClick={() => handleTabChange('create')}
              className="ml-auto hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-dark-950 font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create KPI</span>
            </button>
          </div>

          {/* Toolbar: Search & Category Filter Segment */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search KPIs by name, formula, or description..."
                className="w-full pl-9 pr-4 py-2 bg-dark-900 border border-dark-700 rounded-xl text-sm text-foreground placeholder-dark-400 focus:outline-none focus:border-dark-500 transition-colors"
              />
            </div>

            {/* Filter segment tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-dark-900 border border-dark-700 rounded-xl overflow-x-auto">
              {CATEGORIES.map((category) => {
                const count = categoryCounts[category] || 0
                const isSelected =
                  (category === 'All' && !selectedCategory) ||
                  selectedCategory === category

                if (category !== 'All' && count === 0) return null

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(category === 'All' ? null : category)
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-dark-800 text-foreground shadow-sm'
                        : 'text-dark-400 hover:text-foreground'
                    }`}
                  >
                    <span>{category}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-dark-700 text-foreground'
                          : 'bg-dark-800/80 text-dark-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main KPI Content Area (NO Explore More KPI Presets card here) */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : kpis.length === 0 ? (
            <EmptyState />
          ) : (
            <KPIList
              kpis={filteredKPIs}
              selectedCategory={selectedCategory}
              onSelect={handleSelectKPI}
              onDelete={(kpi) => setKpiToDelete(kpi)}
              isDeleting={isDeleting}
            />
          )}
        </div>
      )}

      {/* TAB 2: CREATE (3-Section NotebookLM Studio Workspace) */}
      {activeTab === 'create' && (
        <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden animate-in fade-in duration-150">
          <KPICreationStudio
            onKpiCreated={() => fetchKPIs()}
            onViewAllKpis={() => handleTabChange('all')}
          />
        </div>
      )}

      {/* Detail Modal */}
      <KPIDetailModal
        kpi={selectedKPI}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedKPI(null)
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!kpiToDelete}
        onClose={() => setKpiToDelete(null)}
        onConfirm={handleDeleteKPI}
        title="Delete KPI"
        message={`Are you sure you want to delete "${kpiToDelete?.name}"? This will also remove all associated data entries. This action cannot be undone.`}
        isDeleting={!!isDeleting}
      />

      {/* Preset Selection Modal */}
      <PresetSelectionModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onConfirm={handleAddSelectedPresets}
        presets={availablePresets}
        isLoading={isLoadingPresets}
        isAdding={isSeedingPresets}
      />
    </div>
  )
}
