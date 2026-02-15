import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { WidgetConfig } from '../../types/dashboard'
import { useDashboard } from '../../context/DashboardContext'

interface WidgetConfigModalProps {
  isOpen: boolean
  onClose: () => void
  widget: WidgetConfig | null
}

export function WidgetConfigModal({ isOpen, onClose, widget }: WidgetConfigModalProps) {
  const { updateWidgetConfig, data } = useDashboard()
  const [title, setTitle] = useState('')
  const [kpiId, setKpiId] = useState('')
  const [maxItems, setMaxItems] = useState(5)

  useEffect(() => {
    if (widget) {
      setTitle(widget.title)
      setKpiId(widget.kpiId || '')
      setMaxItems(widget.maxItems || 5)
    }
  }, [widget])

  if (!widget) return null

  const needsKPI = ['line-chart', 'bar-chart', 'area-chart'].includes(widget.type)
  const needsMaxItems = ['insights-list'].includes(widget.type)

  const handleSave = () => {
    const updates: Partial<WidgetConfig> = { title }
    if (needsKPI) updates.kpiId = kpiId || undefined
    if (needsMaxItems) updates.maxItems = maxItems
    updateWidgetConfig(widget.id, updates)
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
              <Dialog.Panel className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-foreground">
                    Configure Widget
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-foreground hover:bg-dark-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {needsKPI && (
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

                  {needsMaxItems && (
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

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-dark-300 hover:text-foreground transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!title.trim()}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
