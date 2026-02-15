import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
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

  const needsKPI = (type: WidgetType) =>
    ['line-chart', 'bar-chart', 'area-chart'].includes(type)

  const needsMaxItems = (type: WidgetType) =>
    ['insights-list'].includes(type)

  const handleAdd = () => {
    if (!selectedType) return
    const config: Omit<WidgetConfig, 'id'> = {
      type: selectedType,
      title,
    }
    if (needsKPI(selectedType) && kpiId) {
      config.kpiId = kpiId
    }
    if (needsMaxItems(selectedType)) {
      config.maxItems = maxItems
    }
    addWidget(config)
    handleClose()
  }

  const widgetTypes = Object.keys(WIDGET_TYPE_INFO) as WidgetType[]

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6">
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
                          className="flex flex-col items-start gap-2 p-4 rounded-xl border border-dark-700 hover:border-primary-500/50 hover:bg-dark-800 transition-colors text-left"
                        >
                          <Icon className="w-6 h-6 text-primary-400" />
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
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">
                        Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Widget title"
                      />
                    </div>

                    {/* KPI selector */}
                    {needsKPI(selectedType) && (
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">
                          KPI
                        </label>
                        <select
                          value={kpiId}
                          onChange={(e) => setKpiId(e.target.value)}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Auto (selected KPI)</option>
                          {data.kpisWithEntries.map((kpi) => (
                            <option key={kpi.id} value={kpi.id}>
                              {kpi.name} ({kpi.category})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Max items */}
                    {needsMaxItems(selectedType) && (
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">
                          Max items
                        </label>
                        <input
                          type="number"
                          value={maxItems}
                          onChange={(e) => setMaxItems(Number(e.target.value))}
                          min={1}
                          max={20}
                          className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>
                    )}

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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
