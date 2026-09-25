import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { WidgetConfig } from '../../types/dashboard'
import { useDashboard } from '../../context/DashboardContext'
import { Modal } from '../ui/Modal'
import { WidgetSettingsFields, widgetNeedsKPI, widgetNeedsMaxItems } from './WidgetSettingsFields'

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

  const needsKPI = widgetNeedsKPI(widget.type)
  const needsMaxItems = widgetNeedsMaxItems(widget.type)

  const handleSave = () => {
    const updates: Partial<WidgetConfig> = { title }
    if (needsKPI) updates.kpiId = kpiId || undefined
    if (needsMaxItems) updates.maxItems = maxItems
    updateWidgetConfig(widget.id, updates)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6"
    >
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
        <WidgetSettingsFields
          type={widget.type}
          title={title}
          onTitleChange={setTitle}
          kpiId={kpiId}
          onKpiIdChange={setKpiId}
          maxItems={maxItems}
          onMaxItemsChange={setMaxItems}
          kpis={data.kpisWithEntries}
        />

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
    </Modal>
  )
}
