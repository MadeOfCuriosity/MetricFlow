import { Fragment, useEffect, useState, useRef } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '../context/ToastContext'
import { whatsappNotifierApi } from '../services/whatsappNotifier'
import { appsApi } from '../services/apps'
import type { DataSourceOption, Recipient, Suppression, SendLog } from '../types/whatsappNotifier'
import type { AppSummary } from '../types/app'

interface WhatsAppNotifierPanelProps {
  isOpen: boolean
  onClose: () => void
  app: AppSummary | null
  onConfigChanged: () => void
}

type Tab = 'data-source' | 'recipients' | 'suppressions' | 'send-log'

export function WhatsAppNotifierPanel({ isOpen, onClose, app, onConfigChanged }: WhatsAppNotifierPanelProps) {
  const { success, error: showError } = useToast()
  const [tab, setTab] = useState<Tab>('data-source')
  const [kpis, setKpis] = useState<DataSourceOption[]>([])
  const [dataFields, setDataFields] = useState<DataSourceOption[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [suppressions, setSuppressions] = useState<Suppression[]>([])
  const [sendLogs, setSendLogs] = useState<SendLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedKind, setSelectedKind] = useState<'kpi' | 'data_field'>('kpi')
  const [selectedId, setSelectedId] = useState('')
  const [newRecipient, setNewRecipient] = useState({ name: '', phone: '', notes: '' })
  const [newSuppressionPhone, setNewSuppressionPhone] = useState('')

  useEffect(() => {
    if (app) {
      setSelectedKind((app.installation?.config?.data_source_kind as 'kpi' | 'data_field') || 'kpi')
      setSelectedId((app.installation?.config?.data_source_id as string) || '')
    }
  }, [app])

  const refresh = async () => {
    setIsLoading(true)
    try {
      if (tab === 'data-source') {
        const resp = await whatsappNotifierApi.listDataSources()
        setKpis(resp.kpis)
        setDataFields(resp.data_fields)
      } else if (tab === 'recipients') {
        setRecipients((await whatsappNotifierApi.listRecipients()).recipients)
      } else if (tab === 'suppressions') {
        setSuppressions((await whatsappNotifierApi.listSuppressions()).suppressions)
      } else {
        setSendLogs((await whatsappNotifierApi.listSendLogs()).logs)
      }
    } catch {
      showError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tab])

  const handleSaveDataSource = async () => {
    if (!app || !selectedId) return
    try {
      await appsApi.configure(app.key, {
        ...(app.installation?.config || {}),
        data_source_kind: selectedKind,
        data_source_id: selectedId,
      })
      success('Saved', 'Data source connected.')
      onConfigChanged()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to connect data source')
    }
  }

  const handleAddRecipient = async () => {
    if (!newRecipient.name.trim() || !newRecipient.phone.trim()) return
    try {
      await whatsappNotifierApi.upsertRecipient({
        name: newRecipient.name,
        phone: newRecipient.phone,
        notes: newRecipient.notes || undefined,
      })
      success('Added', 'Recipient saved.')
      setNewRecipient({ name: '', phone: '', notes: '' })
      refresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to save recipient')
    }
  }

  const handleRemoveRecipient = async (id: string) => {
    try {
      await whatsappNotifierApi.removeRecipient(id)
      success('Removed', 'Recipient removed.')
      refresh()
    } catch {
      showError('Failed to remove recipient')
    }
  }

  const handleCsvUpload = async (file: File) => {
    try {
      const resp = await whatsappNotifierApi.importCsv(file)
      success('Imported', `${resp.imported} row(s) imported${resp.errors.length ? `, ${resp.errors.length} error(s)` : ''}.`)
      if (resp.errors.length) {
        showError(resp.errors.slice(0, 3).join('; '))
      }
      refresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'CSV import failed')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddSuppression = async () => {
    if (!newSuppressionPhone.trim()) return
    try {
      await whatsappNotifierApi.addSuppression(newSuppressionPhone.trim(), 'manual')
      success('Added', 'Number added to suppression list.')
      setNewSuppressionPhone('')
      refresh()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to add suppression')
    }
  }

  const handleRemoveSuppression = async (phone: string) => {
    try {
      await whatsappNotifierApi.removeSuppression(phone)
      success('Removed', 'Number removed from suppression list.')
      refresh()
    } catch {
      showError('Failed to remove suppression')
    }
  }

  if (!app) return null

  const currentOptions = selectedKind === 'kpi' ? kpis : dataFields

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  WhatsApp Notifier — Manage Data
                </Dialog.Title>

                <div className="flex gap-2 mt-4 border-b border-dark-700 flex-wrap">
                  {(['data-source', 'recipients', 'suppressions', 'send-log'] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-2 text-sm capitalize transition-colors border-b-2 ${
                        tab === t
                          ? 'border-primary-500 text-foreground'
                          : 'border-transparent text-dark-400 hover:text-dark-200'
                      }`}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  {tab === 'data-source' && (
                    <div className="space-y-4">
                      <p className="text-xs text-dark-400">
                        Connect an existing KPI or Data Field. Its latest value is what gets sent to your
                        recipient list on each run — e.g. an "Outstanding Receivables" KPI for reminders, or
                        "Daily Revenue" for a recurring report.
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={selectedKind}
                          onChange={(e) => { setSelectedKind(e.target.value as 'kpi' | 'data_field'); setSelectedId('') }}
                          className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm"
                        >
                          <option value="kpi">KPI</option>
                          <option value="data_field">Data Field</option>
                        </select>
                        <select
                          value={selectedId}
                          onChange={(e) => setSelectedId(e.target.value)}
                          className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm"
                        >
                          <option value="">
                            {isLoading ? 'Loading...' : `Select a ${selectedKind === 'kpi' ? 'KPI' : 'Data Field'}`}
                          </option>
                          {currentOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleSaveDataSource}
                          disabled={!selectedId}
                          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
                        >
                          Connect
                        </button>
                      </div>
                      {app.installation?.config?.data_source_id ? (
                        <p className="text-xs text-success-400">
                          Currently connected: {String(app.installation.config.data_source_kind)} —{' '}
                          {[...kpis, ...dataFields].find((o) => o.id === app.installation?.config?.data_source_id)?.name
                            || app.installation.config.data_source_id as string}
                        </p>
                      ) : (
                        <p className="text-xs text-warning-400">No data source connected yet.</p>
                      )}
                    </div>
                  )}

                  {tab === 'recipients' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          placeholder="Name"
                          value={newRecipient.name}
                          onChange={(e) => setNewRecipient((v) => ({ ...v, name: e.target.value }))}
                          className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm"
                        />
                        <input
                          placeholder="Phone (+91...)"
                          value={newRecipient.phone}
                          onChange={(e) => setNewRecipient((v) => ({ ...v, phone: e.target.value }))}
                          className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm"
                        />
                        <input
                          placeholder="Notes (optional)"
                          value={newRecipient.notes}
                          onChange={(e) => setNewRecipient((v) => ({ ...v, notes: e.target.value }))}
                          className="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm col-span-2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddRecipient}
                          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500"
                        >
                          Add / Update
                        </button>
                        <span className="text-dark-500 text-xs">or</span>
                        <label className="px-3 py-1.5 text-sm bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 cursor-pointer">
                          Import CSV
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
                          />
                        </label>
                        <span className="text-xs text-dark-500">columns: name, phone, notes (optional)</span>
                      </div>

                      <div className="border border-dark-700 rounded-lg divide-y divide-dark-700">
                        {isLoading ? (
                          <p className="text-center text-dark-400 py-4">Loading...</p>
                        ) : recipients.length === 0 ? (
                          <p className="text-center text-dark-400 py-4">No recipients yet.</p>
                        ) : (
                          recipients.map((r) => (
                            <div key={r.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-foreground text-sm">{r.name} · {r.phone}</p>
                                {r.notes && <p className="text-xs text-dark-400">{r.notes}</p>}
                              </div>
                              <button
                                onClick={() => handleRemoveRecipient(r.id)}
                                className="p-1.5 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'suppressions' && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          placeholder="Phone to suppress (+91...)"
                          value={newSuppressionPhone}
                          onChange={(e) => setNewSuppressionPhone(e.target.value)}
                          className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm"
                        />
                        <button
                          onClick={handleAddSuppression}
                          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-dark-400">
                        Numbers here are never messaged. Automated inbound "STOP" capture isn't built yet —
                        add numbers here manually when someone asks to opt out.
                      </p>
                      <div className="border border-dark-700 rounded-lg divide-y divide-dark-700">
                        {isLoading ? (
                          <p className="text-center text-dark-400 py-4">Loading...</p>
                        ) : suppressions.length === 0 ? (
                          <p className="text-center text-dark-400 py-4">No suppressed numbers.</p>
                        ) : (
                          suppressions.map((s) => (
                            <div key={s.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-foreground text-sm">{s.phone}</p>
                                <p className="text-xs text-dark-400">{s.reason}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveSuppression(s.phone)}
                                className="p-1.5 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'send-log' && (
                    <div className="border border-dark-700 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-dark-800 text-dark-400">
                          <tr>
                            <th className="text-left px-3 py-2">Recipient</th>
                            <th className="text-left px-3 py-2">Phone</th>
                            <th className="text-left px-3 py-2">Value</th>
                            <th className="text-left px-3 py-2">Status</th>
                            <th className="text-left px-3 py-2">When</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoading ? (
                            <tr><td colSpan={5} className="text-center text-dark-400 py-4">Loading...</td></tr>
                          ) : sendLogs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center text-dark-400 py-4">No sends yet.</td></tr>
                          ) : (
                            sendLogs.map((l) => (
                              <tr key={l.id} className="border-t border-dark-700">
                                <td className="px-3 py-2 text-foreground">{l.recipient_name || '—'}</td>
                                <td className="px-3 py-2 text-dark-300">{l.phone_masked}</td>
                                <td className="px-3 py-2 text-dark-300">{l.data_value || '—'}</td>
                                <td className="px-3 py-2 text-dark-300">{l.delivery_status}</td>
                                <td className="px-3 py-2 text-dark-400">{new Date(l.created_at).toLocaleString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-dark-300 hover:text-foreground transition-colors"
                  >
                    Close
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
