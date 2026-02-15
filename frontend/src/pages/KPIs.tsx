import { useState, useEffect } from 'react'
import {
  FunnelIcon,
  SparklesIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { KPIList } from '../components/KPIList'
import { KPIDetailModal } from '../components/KPIDetailModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import { PresetSelectionModal } from '../components/PresetSelectionModal'
import { Skeleton } from '../components'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

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

  const [kpis, setKpis] = useState<KPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
    } catch (err: any) {
      console.error('Failed to add presets:', err)
      error('Failed to add presets', 'Please try again')
    } finally {
      setIsSeedingPresets(false)
    }
  }

  const getCategoryCounts = () => {
    const counts: Record<string, number> = { All: kpis.length }
    kpis.forEach((kpi) => {
      const category = kpi.category || 'Custom'
      counts[category] = (counts[category] || 0) + 1
    })
    return counts
  }

  const categoryCounts = getCategoryCounts()

  // Empty state component
  const EmptyState = () => (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-12 text-center">
      <ChartBarIcon className="w-16 h-16 text-dark-500 mx-auto mb-6" />
      <h2 className="text-xl font-semibold text-foreground mb-2">No KPIs yet</h2>
      <p className="text-dark-300 mb-8 max-w-md mx-auto">
        Start tracking your business metrics by adding preset KPIs or creating custom ones
        from within a room using the AI Builder.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={handleOpenPresetModal}
          className="flex items-center gap-2 px-6 py-3 bg-dark-800 text-foreground rounded-lg hover:bg-dark-600 transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Add Preset KPIs
        </button>
      </div>
    </div>
  )

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">KPIs</h1>
          <p className="text-dark-300 mt-1">
            Manage your key performance indicators
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : kpis.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Category filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-dark-400" />
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map((category) => {
                const count = categoryCounts[category] || 0
                const isSelected =
                  (category === 'All' && !selectedCategory) ||
                  selectedCategory === category

                if (category !== 'All' && count === 0) return null

                return (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategory(category === 'All' ? null : category)
                    }
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'border border-primary-500 text-foreground'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-600 hover:text-foreground'
                    }`}
                  >
                    {category}
                    <span
                      className={`text-xs ${
                        isSelected ? 'text-primary-200' : 'text-dark-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* KPI List */}
          <KPIList
            kpis={kpis}
            selectedCategory={selectedCategory}
            onSelect={handleSelectKPI}
            onDelete={(kpi) => setKpiToDelete(kpi)}
            isDeleting={isDeleting}
          />

          {/* Add preset KPIs option if some exist */}
          {!kpis.some((k) => k.is_preset) && (
            <div className="bg-dark-900/50 border border-dashed border-dark-600 rounded-xl p-6 text-center">
              <p className="text-dark-300 mb-3">
                Want to get started quickly?
              </p>
              <button
                onClick={handleOpenPresetModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-dark-800 text-foreground rounded-lg hover:bg-dark-600 transition-colors"
              >
                <SparklesIcon className="w-4 h-4" />
                Add Preset KPIs
              </button>
            </div>
          )}
        </>
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
