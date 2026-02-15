import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { FieldMappingStep } from './FieldMappingStep'
import { integrationsApi } from '../services/integrations'
import { dataFieldsApi } from '../services/dataFields'
import type {
  Integration,
  IntegrationProvider,
  ExternalField,
  FieldMappingInput,
  SyncSchedule,
  ProviderInfo,
  CreateIntegrationData,
} from '../types/integration'
import type { DataField } from '../types/dataField'

interface IntegrationSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  provider: IntegrationProvider | null
  editIntegration?: Integration | null
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Sync data from a Google Spreadsheet',
    authType: 'oauth',
    color: '#0F9D58',
    configFields: [
      { key: 'spreadsheet_id', label: 'Spreadsheet ID', placeholder: 'e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', type: 'text', required: true },
      { key: 'sheet_name', label: 'Sheet Name', placeholder: 'Sheet1', type: 'text', required: false },
      { key: 'date_column', label: 'Date Column Header', placeholder: 'e.g. Date', type: 'text', required: true },
    ],
  },
  {
    id: 'zoho_crm',
    name: 'Zoho CRM',
    description: 'Sync leads, deals, and contacts from Zoho CRM',
    authType: 'oauth',
    color: '#E42527',
    configFields: [
      {
        key: 'module', label: 'Module', placeholder: 'Select module', type: 'select', required: true,
        options: [
          { value: 'Leads', label: 'Leads' },
          { value: 'Deals', label: 'Deals' },
          { value: 'Contacts', label: 'Contacts' },
          { value: 'Accounts', label: 'Accounts' },
        ],
      },
      { key: 'date_field', label: 'Date Field', placeholder: 'e.g. Created_Time', type: 'text', required: true },
    ],
  },
  {
    id: 'zoho_books',
    name: 'Zoho Books',
    description: 'Sync invoices, bills, expenses from Zoho Books',
    authType: 'oauth',
    color: '#4BC882',
    configFields: [
      {
        key: 'module', label: 'Module', placeholder: 'Select module', type: 'select', required: true,
        options: [
          { value: 'invoices', label: 'Invoices' },
          { value: 'bills', label: 'Bills' },
          { value: 'expenses', label: 'Expenses' },
          { value: 'payments_received', label: 'Payments Received' },
          { value: 'payments_made', label: 'Payments Made' },
          { value: 'credit_notes', label: 'Credit Notes' },
          { value: 'sales_orders', label: 'Sales Orders' },
          { value: 'purchase_orders', label: 'Purchase Orders' },
        ],
      },
      { key: 'zoho_org_id', label: 'Zoho Books Org ID', placeholder: 'e.g. 60015296311', type: 'text', required: true },
      { key: 'date_field', label: 'Date Field', placeholder: 'date', type: 'text', required: false },
    ],
  },
  {
    id: 'zoho_sheet',
    name: 'Zoho Sheet',
    description: 'Import data from Zoho Sheet spreadsheets',
    authType: 'oauth',
    color: '#17B26A',
    configFields: [
      { key: 'resource_id', label: 'Workbook Resource ID', placeholder: 'From the URL: sheet.zoho.com/sheet/open/<resource_id>', type: 'text', required: true },
      { key: 'sheet_name', label: 'Worksheet Name', placeholder: 'Sheet1', type: 'text', required: false },
      { key: 'date_column', label: 'Date Column Header', placeholder: 'e.g. Date', type: 'text', required: true },
    ],
  },
  {
    id: 'leadsquared',
    name: 'LeadSquared',
    description: 'Sync leads and activities from LeadSquared',
    authType: 'api_key',
    color: '#FF6B35',
    configFields: [
      {
        key: 'data_type', label: 'Data Type', placeholder: 'Select type', type: 'select', required: true,
        options: [
          { value: 'leads', label: 'Leads' },
          { value: 'activities', label: 'Activities' },
        ],
      },
      { key: 'date_field', label: 'Date Field', placeholder: 'e.g. CreatedOn', type: 'text', required: false },
      { key: 'region', label: 'API Region', placeholder: 'e.g. api, api-in1', type: 'text', required: false },
    ],
  },
]

const SCHEDULE_OPTIONS: { value: SyncSchedule; label: string }[] = [
  { value: 'manual', label: 'Manual only' },
  { value: '1h', label: 'Every hour' },
  { value: '6h', label: 'Every 6 hours' },
  { value: '12h', label: 'Every 12 hours' },
  { value: '24h', label: 'Every 24 hours' },
]

export function IntegrationSetupModal({
  isOpen,
  onClose,
  onComplete,
  provider,
  editIntegration,
}: IntegrationSetupModalProps) {
  const [step, setStep] = useState(0) // 0: config, 1: mapping, 2: schedule
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 0: Config
  const [displayName, setDisplayName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')

  // Step 1: Mapping
  const [externalFields, setExternalFields] = useState<ExternalField[]>([])
  const [dataFields, setDataFields] = useState<DataField[]>([])
  const [mappings, setMappings] = useState<FieldMappingInput[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)

  // Step 2: Schedule
  const [syncSchedule, setSyncSchedule] = useState<SyncSchedule>('manual')

  // Current integration (created in step 0 for OAuth, or from edit)
  const [integration, setIntegration] = useState<Integration | null>(editIntegration || null)

  const providerInfo = provider ? PROVIDERS.find(p => p.id === provider) : null

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && provider) {
      if (editIntegration) {
        setDisplayName(editIntegration.display_name)
        setConfig(editIntegration.config as Record<string, string> || {})
        setSyncSchedule(editIntegration.sync_schedule)
        setIntegration(editIntegration)
        setStep(0)
      } else {
        setDisplayName('')
        setConfig({})
        setApiKey('')
        setApiSecret('')
        setMappings([])
        setSyncSchedule('manual')
        setIntegration(null)
        setStep(0)
      }
      setError(null)
    }
  }, [isOpen, provider, editIntegration])

  const handleConfigSubmit = async () => {
    if (!providerInfo || !displayName.trim()) {
      setError('Please enter a display name')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      if (editIntegration) {
        // Update existing
        const updated = await integrationsApi.update(editIntegration.id, {
          display_name: displayName,
          config,
        })
        setIntegration(updated)
      } else {
        // Create new
        const createData: CreateIntegrationData = {
          provider: providerInfo.id,
          display_name: displayName,
          config,
        }
        if (providerInfo.authType === 'api_key') {
          createData.api_key = apiKey
          createData.api_secret = apiSecret
        }
        const created = await integrationsApi.create(createData)
        setIntegration(created)

        // For OAuth providers, redirect to authorization
        if (providerInfo.authType === 'oauth' && created.status === 'pending_auth') {
          const { authorize_url } = await integrationsApi.getOAuthUrl(providerInfo.id, created.id)
          window.location.href = authorize_url
          return
        }
      }

      setStep(1)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoadExternalFields = async () => {
    if (!integration) return
    setIsLoadingFields(true)
    try {
      const [fieldsResp, dfResp] = await Promise.all([
        integrationsApi.getExternalFields(integration.id),
        dataFieldsApi.getAll(),
      ])
      setExternalFields(fieldsResp.fields)
      setDataFields(dfResp.data_fields)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch fields')
    } finally {
      setIsLoadingFields(false)
    }
  }

  // Load fields when entering step 1
  useEffect(() => {
    if (step === 1 && integration) {
      handleLoadExternalFields()
    }
  }, [step, integration])

  const handleMappingSubmit = async () => {
    if (!integration || mappings.length === 0) {
      setError('Please map at least one field')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await integrationsApi.setMappings(integration.id, mappings)
      setStep(2)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save mappings')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFinish = async () => {
    if (!integration) return
    setIsSubmitting(true)
    setError(null)
    try {
      await integrationsApi.update(integration.id, { sync_schedule: syncSchedule })
      onComplete()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save schedule')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!providerInfo) return null

  const steps = ['Configure', 'Map Fields', 'Schedule']

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
          <div className="fixed inset-0 bg-black/50" />
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
              <Dialog.Panel className="w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-xl shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: providerInfo.color }}
                    >
                      {providerInfo.id === 'google_sheets' ? 'GS' : providerInfo.id === 'zoho_crm' ? 'Z' : 'LS'}
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {editIntegration ? 'Configure' : 'Connect'} {providerInfo.name}
                    </Dialog.Title>
                  </div>
                  <button onClick={onClose} className="text-dark-400 hover:text-foreground transition-colors">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 px-6 py-3 border-b border-dark-700">
                  {steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        i < step ? 'bg-success-500 text-white' :
                        i === step ? 'bg-primary-500 text-white' :
                        'bg-dark-700 text-dark-400'
                      }`}>
                        {i < step ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={`text-sm ${i === step ? 'text-foreground font-medium' : 'text-dark-400'}`}>
                        {s}
                      </span>
                      {i < steps.length - 1 && <div className="w-8 h-px bg-dark-700 mx-1" />}
                    </div>
                  ))}
                </div>

                {/* Content */}
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                  {error && (
                    <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/30 rounded-lg text-sm text-danger-400">
                      {error}
                    </div>
                  )}

                  {/* Step 0: Configuration */}
                  {step === 0 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder={`e.g. ${providerInfo.name} - Sales Data`}
                          className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {providerInfo.configFields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            {field.label}
                            {field.required && <span className="text-danger-400 ml-0.5">*</span>}
                          </label>
                          {field.type === 'select' && field.options ? (
                            <select
                              value={config[field.key] || ''}
                              onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="">{field.placeholder}</option>
                              {field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={config[field.key] || ''}
                              onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                              placeholder={field.placeholder}
                              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          )}
                        </div>
                      ))}

                      {/* API key fields for LeadSquared */}
                      {providerInfo.authType === 'api_key' && !editIntegration && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              API Key <span className="text-danger-400 ml-0.5">*</span>
                            </label>
                            <input
                              type="password"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="Your LeadSquared access key"
                              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                              API Secret <span className="text-danger-400 ml-0.5">*</span>
                            </label>
                            <input
                              type="password"
                              value={apiSecret}
                              onChange={(e) => setApiSecret(e.target.value)}
                              placeholder="Your LeadSquared secret key"
                              className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Step 1: Field Mapping */}
                  {step === 1 && (
                    <div>
                      {isLoadingFields ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          <span className="ml-3 text-sm text-dark-300">Fetching fields from {providerInfo.name}...</span>
                        </div>
                      ) : externalFields.length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-dark-300 text-sm">
                            No fields found. Make sure the integration is configured correctly and has data.
                          </p>
                          <button
                            onClick={handleLoadExternalFields}
                            className="mt-3 text-sm text-primary-400 hover:text-primary-300"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <FieldMappingStep
                          provider={providerInfo.id}
                          externalFields={externalFields}
                          dataFields={dataFields}
                          onChange={setMappings}
                        />
                      )}
                    </div>
                  )}

                  {/* Step 2: Schedule */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Sync Schedule</label>
                        <div className="space-y-2">
                          {SCHEDULE_OPTIONS.map((opt) => (
                            <label
                              key={opt.value}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                syncSchedule === opt.value
                                  ? 'border-primary-500 bg-primary-500/10'
                                  : 'border-dark-600 hover:border-dark-500'
                              }`}
                            >
                              <input
                                type="radio"
                                name="schedule"
                                value={opt.value}
                                checked={syncSchedule === opt.value}
                                onChange={(e) => setSyncSchedule(e.target.value as SyncSchedule)}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                syncSchedule === opt.value ? 'border-primary-500' : 'border-dark-500'
                              }`}>
                                {syncSchedule === opt.value && (
                                  <div className="w-2 h-2 rounded-full bg-primary-500" />
                                )}
                              </div>
                              <span className="text-sm text-foreground">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-dark-700">
                  <div>
                    {step > 0 && (
                      <button
                        onClick={() => setStep(step - 1)}
                        className="inline-flex items-center gap-1 text-sm text-dark-300 hover:text-foreground transition-colors"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-dark-300 hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    {step === 0 && (
                      <button
                        onClick={handleConfigSubmit}
                        disabled={isSubmitting || !displayName.trim()}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : providerInfo.authType === 'oauth' && !editIntegration ? 'Save & Authorize' : 'Next'}
                        {!isSubmitting && <ArrowRightIcon className="w-4 h-4" />}
                      </button>
                    )}
                    {step === 1 && (
                      <button
                        onClick={handleMappingSubmit}
                        disabled={isSubmitting || mappings.length === 0}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Saving...' : 'Next'}
                        {!isSubmitting && <ArrowRightIcon className="w-4 h-4" />}
                      </button>
                    )}
                    {step === 2 && (
                      <button
                        onClick={handleFinish}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-success-500 text-white text-sm font-medium rounded-lg hover:bg-success-600 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Finishing...' : 'Activate'}
                        {!isSubmitting && <CheckIcon className="w-4 h-4" />}
                      </button>
                    )}
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
