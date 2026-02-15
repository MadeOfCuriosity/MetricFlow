import { Fragment, useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { SparklesIcon, CheckIcon } from '@heroicons/react/24/outline'

interface Preset {
  name: string
  description: string
  formula: string
  category: string
}

interface PresetSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedPresets: string[]) => void
  presets: Preset[]
  isLoading: boolean
  isAdding: boolean
}

export function PresetSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  presets,
  isLoading,
  isAdding,
}: PresetSelectionModalProps) {
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPresets(new Set())
    }
  }, [isOpen])

  const togglePreset = (name: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedPresets(new Set(presets.map((p) => p.name)))
  }

  const deselectAll = () => {
    setSelectedPresets(new Set())
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selectedPresets))
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Sales':
        return 'bg-primary-500/10 text-primary-400 border-primary-500/20'
      case 'Marketing':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'Operations':
        return 'bg-success-500/10 text-success-400 border-success-500/20'
      case 'Finance':
        return 'bg-warning-500/10 text-warning-400 border-warning-500/20'
      default:
        return 'bg-dark-700 text-dark-300 border-dark-600'
    }
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
              <Dialog.Panel className="w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl shadow-xl">
                {/* Header */}
                <div className="p-6 border-b border-dark-700">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                      <SparklesIcon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1">
                      <Dialog.Title className="text-lg font-semibold text-foreground">
                        Select Preset KPIs
                      </Dialog.Title>
                      <p className="text-sm text-dark-300 mt-1">
                        Choose which preset KPIs you want to add to your dashboard
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 bg-dark-700 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  ) : presets.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-dark-300">
                        All preset KPIs have already been added
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Select all / Deselect all */}
                      <div className="flex justify-end gap-2 mb-4">
                        <button
                          onClick={selectAll}
                          className="text-sm text-primary-400 hover:text-primary-300"
                        >
                          Select all
                        </button>
                        <span className="text-dark-500">|</span>
                        <button
                          onClick={deselectAll}
                          className="text-sm text-dark-300 hover:text-dark-200"
                        >
                          Deselect all
                        </button>
                      </div>

                      {/* Preset list */}
                      <div className="space-y-3">
                        {presets.map((preset) => {
                          const isSelected = selectedPresets.has(preset.name)
                          return (
                            <button
                              key={preset.name}
                              onClick={() => togglePreset(preset.name)}
                              className={`w-full text-left p-4 rounded-lg border transition-all ${
                                isSelected
                                  ? 'bg-primary-500/15 border-primary-500'
                                  : 'bg-dark-800/50 border-dark-600 hover:border-dark-500'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'bg-primary-500 border-primary-500'
                                      : 'border-dark-500'
                                  }`}
                                >
                                  {isSelected && (
                                    <CheckIcon className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-foreground">
                                      {preset.name}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(
                                        preset.category
                                      )}`}
                                    >
                                      {preset.category}
                                    </span>
                                  </div>
                                  <p className="text-sm text-dark-300 line-clamp-1">
                                    {preset.description}
                                  </p>
                                  <p className="text-xs text-dark-400 mt-1 font-mono">
                                    {preset.formula}
                                  </p>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-dark-700 flex justify-between items-center">
                  <span className="text-sm text-dark-300">
                    {selectedPresets.size} of {presets.length} selected
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={isAdding}
                      className="px-4 py-2 text-dark-300 hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isAdding || selectedPresets.size === 0}
                      className="px-4 py-2 border border-primary-500 bg-transparent text-foreground rounded-lg hover:bg-primary-500/10 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isAdding ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Adding...
                        </>
                      ) : (
                        `Add ${selectedPresets.size} KPI${selectedPresets.size !== 1 ? 's' : ''}`
                      )}
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
