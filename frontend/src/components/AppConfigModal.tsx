import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import type { AppSummary } from '../types/app'

interface AppConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: Record<string, unknown>) => Promise<void>
  onSaveSecrets?: (secretConfig: Record<string, unknown>) => Promise<void>
  app: AppSummary | null
}

export function AppConfigModal({ isOpen, onClose, onSave, onSaveSecrets, app }: AppConfigModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [secretValues, setSecretValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (app) {
      const initial: Record<string, unknown> = {}
      for (const field of app.config_schema) {
        if (field.secret) continue
        initial[field.key] = app.installation?.config?.[field.key] ?? field.default ?? ''
      }
      setValues(initial)
      setSecretValues({})
    }
  }, [app])

  if (!app) return null

  const plainFields = app.config_schema.filter((f) => !f.secret)
  const secretFields = app.config_schema.filter((f) => f.secret)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(values)
      const secretsToSave = Object.fromEntries(
        Object.entries(secretValues).filter(([, v]) => v.trim() !== '')
      )
      if (onSaveSecrets && Object.keys(secretsToSave).length > 0) {
        await onSaveSecrets(secretsToSave)
      }
    } finally {
      setIsSaving(false)
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
              <Dialog.Panel className="w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6">
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  Configure {app.name}
                </Dialog.Title>

                {app.config_schema.length === 0 ? (
                  <p className="text-sm text-dark-300 mt-4">This app has no configurable options.</p>
                ) : (
                  <div className="space-y-4 mt-4">
                    {plainFields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm text-dark-300 mb-1">
                          {field.label}
                          {field.required && <span className="text-danger-400 ml-1">*</span>}
                        </label>
                        {field.field_type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(values[field.key])}
                            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked }))}
                            className="h-4 w-4 rounded border-dark-600"
                          />
                        ) : field.field_type === 'select' ? (
                          <select
                            value={String(values[field.key] ?? '')}
                            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground"
                          >
                            {(field.options || []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.field_type === 'number' ? 'number' : 'text'}
                            value={String(values[field.key] ?? '')}
                            onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground"
                          />
                        )}
                        {field.help_text && (
                          <p className="text-xs text-dark-400 mt-1">{field.help_text}</p>
                        )}
                      </div>
                    ))}

                    {secretFields.length > 0 && (
                      <div className="border-t border-dark-700 pt-4 space-y-4">
                        <p className="text-xs text-dark-400 uppercase tracking-wide">Secret credentials</p>
                        {secretFields.map((field) => {
                          const status = app.installation?.secret_config_status?.[field.key]
                          return (
                            <div key={field.key}>
                              <label className="block text-sm text-dark-300 mb-1">
                                {field.label}
                                {field.required && <span className="text-danger-400 ml-1">*</span>}
                              </label>
                              <input
                                type="password"
                                autoComplete="off"
                                placeholder={
                                  status?.configured
                                    ? `Configured (····${status.last4 ?? ''}) — leave blank to keep`
                                    : 'Not configured'
                                }
                                value={secretValues[field.key] ?? ''}
                                onChange={(e) =>
                                  setSecretValues((v) => ({ ...v, [field.key]: e.target.value }))
                                }
                                className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground placeholder:text-dark-500"
                              />
                              {field.help_text && (
                                <p className="text-xs text-dark-400 mt-1">{field.help_text}</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={onClose}
                    disabled={isSaving}
                    className="px-4 py-2 text-dark-300 hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
