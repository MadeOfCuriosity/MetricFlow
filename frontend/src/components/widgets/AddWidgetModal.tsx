import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  ChartBarIcon,
  PresentationChartLineIcon,
  ChartPieIcon,
  LightBulbIcon,
  RectangleGroupIcon,
  ArrowPathIcon,
  PresentationChartBarIcon,
} from '@heroicons/react/24/outline'
import type { WidgetType, WidgetConfig } from '../../types/dashboard'
import { WIDGET_TYPE_INFO } from '../../types/dashboard'
import { useDashboard } from '../../context/DashboardContext'
import { Modal } from '../ui/Modal'
import { WidgetSettingsFields, widgetNeedsKPI, widgetNeedsMaxItems } from './WidgetSettingsFields'

interface AddWidgetModalProps {
  isOpen: boolean
  onClose: () => void
}

const WIDGET_ICONS: Record<WidgetType, typeof ChartBarIcon> = {
  'stat-number': ChartBarIcon,
  'line-chart': PresentationChartLineIcon,
  'bar-chart': PresentationChartBarIcon,
  'area-chart': ChartPieIcon,
  'gauge-progress': ArrowPathIcon,
  'insights-list': LightBulbIcon,
  'kpi-cards': RectangleGroupIcon,
  'today-progress': ArrowPathIcon,
}

type Step = 'select-type' | 'configure'

export function AddWidgetModal({ isOpen, onClose }: AddWidgetModalProps) {
  const { addWidget, data } = useDashboard()
  const [step, setStep] = useState<Step>('select-type')
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null)
  const [title, setTitle] = useState('')
  const [kpiId, setKpiId] = useState('')
  const [maxItems, setMaxItems] = useState(5)

  const reset = () => {
    setStep('select-type')
    setSelectedType(null)
    setTitle('')
    setKpiId('')
    setMaxItems(5)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSelectType = (type: WidgetType) => {
    setSelectedType(type)
    setTitle(WIDGET_TYPE_INFO[type].label)
    setStep('configure')
  }

  const handleAdd = () => {
    if (!selectedType) return
    const config: Omit<WidgetConfig, 'id'> = {
      type: selectedType,
      title,
    }
    if (widgetNeedsKPI(selectedType) && kpiId) {
      config.kpiId = kpiId
    }
    if (widgetNeedsMaxItems(selectedType)) {
      config.maxItems = maxItems
    }
    addWidget(config)
    handleClose()
  }

  const widgetTypes = Object.keys(WIDGET_TYPE_INFO) as WidgetType[]

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <Dialog.Title className="text-lg font-semibold text-foreground">
          {step === 'select-type' ? 'Add Widget' : 'Configure Widget'}
        </Dialog.Title>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {step === 'select-type' && (
        <div className="grid grid-cols-2 gap-3">
          {widgetTypes.map((type) => {
            const info = WIDGET_TYPE_INFO[type]
            const Icon = WIDGET_ICONS[type]
            return (
              <button
                key={type}
                onClick={() => handleSelectType(type)}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border border-dark-700 hover:border-brand/50 hover:bg-dark-800 transition-colors text-left"
              >
                <Icon className="w-6 h-6 text-brand" />
                <div>
                  <p className="text-sm font-medium text-foreground">{info.label}</p>
                  <p className="text-xs text-dark-400 mt-0.5">{info.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {step === 'configure' && selectedType && (
        <div className="space-y-4">
          <WidgetSettingsFields
            type={selectedType}
            title={title}
            onTitleChange={setTitle}
            kpiId={kpiId}
            onKpiIdChange={setKpiId}
            maxItems={maxItems}
            onMaxItemsChange={setMaxItems}
            kpis={data.kpisWithEntries}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setStep('select-type')}
              className="px-4 py-2 text-dark-300 hover:text-foreground transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handleAdd}
              disabled={!title.trim()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Widget
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
