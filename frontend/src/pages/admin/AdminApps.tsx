import { useState, useEffect, useCallback } from 'react'
import { Cog6ToothIcon, PlayIcon, TrashIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../context/ToastContext'
import { AppConfigModal } from '../../components/AppConfigModal'
import { DeleteConfirmModal } from '../../components/DeleteConfirmModal'
import { WhatsAppNotifierPanel } from '../../components/WhatsAppNotifierPanel'
import { appsApi } from '../../services/apps'
import type { AppSummary } from '../../types/app'
import { formatDistanceToNow } from 'date-fns'

export function AdminApps() {
  const { success, error: showError } = useToast()
  const [apps, setApps] = useState<AppSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set())
  const [configApp, setConfigApp] = useState<AppSummary | null>(null)
  const [uninstallApp, setUninstallApp] = useState<AppSummary | null>(null)
  const [isUninstalling, setIsUninstalling] = useState(false)
  const [lastRunSummary, setLastRunSummary] = useState<Record<string, string>>({})
  const [dataPanelAppKey, setDataPanelAppKey] = useState<string | null>(null)
  const dataPanelApp = apps.find((a) => a.key === dataPanelAppKey) || null

  const fetchApps = useCallback(async () => {
    try {
      const resp = await appsApi.getAll()
      setApps(resp.apps)
    } catch {
      showError('Failed to load apps')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyKeys((prev) => new Set(prev).add(key))
    try {
      await fn()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Something went wrong')
    } finally {
      setBusyKeys((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  const handleInstall = (app: AppSummary) =>
    withBusy(app.key, async () => {
      await appsApi.install(app.key)
      success('Installed', `${app.name} has been installed.`)
      fetchApps()
    })

  const handleEnableToggle = (app: AppSummary) =>
    withBusy(app.key, async () => {
      if (app.installation?.is_enabled) {
        await appsApi.disable(app.key)
        success('Disabled', `${app.name} has been disabled.`)
      } else {
        await appsApi.enable(app.key)
        success('Enabled', `${app.name} is now enabled.`)
      }
      fetchApps()
    })

  const handleRun = (app: AppSummary) =>
    withBusy(app.key, async () => {
      const run = await appsApi.run(app.key)
      setLastRunSummary((prev) => ({ ...prev, [app.key]: run.summary || run.status }))
      if (run.status === 'success') {
        success('Run Complete', run.summary || 'Finished successfully.')
      } else {
        showError(run.summary || run.error || 'Run failed')
      }
    })

  const handleSaveConfig = async (config: Record<string, unknown>) => {
    if (!configApp) return
    try {
      await appsApi.configure(configApp.key, config)
      success('Saved', `${configApp.name} configuration updated.`)
      setConfigApp(null)
      fetchApps()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to save configuration')
    }
  }

  const handleSaveSecrets = async (secretConfig: Record<string, unknown>) => {
    if (!configApp) return
    try {
      await appsApi.configureSecrets(configApp.key, secretConfig)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to save credentials')
      throw err
    }
  }

  const handleUninstall = async () => {
    if (!uninstallApp) return
    setIsUninstalling(true)
    try {
      await appsApi.uninstall(uninstallApp.key)
      success('Uninstalled', `${uninstallApp.name} has been removed.`)
      setUninstallApp(null)
      fetchApps()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to uninstall')
    } finally {
      setIsUninstalling(false)
    }
  }

  const installedCount = apps.filter((a) => a.installation).length
  const enabledCount = apps.filter((a) => a.installation?.is_enabled).length

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <p className="text-sm text-dark-400">Installed</p>
          <p className="text-xl font-bold text-foreground mt-1">{installedCount}</p>
        </div>
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <p className="text-sm text-dark-400">Enabled</p>
          <p className="text-xl font-bold text-success-400 mt-1">{enabledCount}</p>
        </div>
      </div>

      {/* App cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-8 text-center text-dark-300 bg-dark-900 border border-dark-700 rounded-xl">
            Loading apps...
          </div>
        ) : apps.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-dark-300 bg-dark-900 border border-dark-700 rounded-xl">
            No apps available yet.
          </div>
        ) : (
          apps.map((app) => {
            const installed = !!app.installation
            const enabled = !!app.installation?.is_enabled
            const busy = busyKeys.has(app.key)
            const entitlementBlocked =
              app.installation &&
              ['required', 'revoked'].includes(app.installation.entitlement_status)

            return (
              <div
                key={app.key}
                className="bg-dark-900 border border-dark-700 rounded-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-foreground font-medium">{app.name}</p>
                    <p className="text-sm text-dark-400 mt-1">{app.description}</p>
                  </div>
                  {installed && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        enabled
                          ? 'bg-success-500/10 text-success-400'
                          : 'bg-dark-700 text-dark-300'
                      }`}
                    >
                      {enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs text-dark-400">
                  {app.triggers.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-dark-800 rounded-full capitalize">
                      {t.replace('_', ' ')}
                    </span>
                  ))}
                  {app.requires_entitlement && (
                    <span className="px-2 py-0.5 bg-dark-800 rounded-full">Requires entitlement</span>
                  )}
                </div>

                {entitlementBlocked && (
                  <p className="text-xs text-warning-400">
                    Entitlement not granted yet — contact support to enable this app.
                  </p>
                )}

                {lastRunSummary[app.key] && (
                  <p className="text-xs text-dark-400 truncate">Last run: {lastRunSummary[app.key]}</p>
                )}

                {app.installation && (
                  <p className="text-xs text-dark-500">
                    Installed {formatDistanceToNow(new Date(app.installation.installed_at), { addSuffix: true })}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-auto pt-2">
                  {!installed ? (
                    <button
                      onClick={() => handleInstall(app)}
                      disabled={busy}
                      className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-50"
                    >
                      Install
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEnableToggle(app)}
                        disabled={busy || Boolean(!enabled && entitlementBlocked)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                          enabled
                            ? 'bg-dark-700 text-dark-200 hover:bg-dark-600'
                            : 'bg-primary-600 text-white hover:bg-primary-500'
                        }`}
                      >
                        {enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleRun(app)}
                        disabled={busy || !enabled}
                        title="Run now"
                        className="p-2 text-dark-300 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-30"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfigApp(app)}
                        title="Configure"
                        className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-600 rounded-lg transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                      </button>
                      {app.key === 'whatsapp_notifier' && (
                        <button
                          onClick={() => setDataPanelAppKey(app.key)}
                          title="Manage data source, recipients & suppressions"
                          className="p-2 text-dark-300 hover:text-foreground hover:bg-dark-600 rounded-lg transition-colors"
                        >
                          <TableCellsIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setUninstallApp(app)}
                        title="Uninstall"
                        className="p-2 text-dark-300 hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors ml-auto"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <AppConfigModal
        isOpen={!!configApp}
        onClose={() => setConfigApp(null)}
        onSave={handleSaveConfig}
        onSaveSecrets={handleSaveSecrets}
        app={configApp}
      />

      <WhatsAppNotifierPanel
        isOpen={!!dataPanelApp}
        onClose={() => setDataPanelAppKey(null)}
        app={dataPanelApp}
        onConfigChanged={fetchApps}
      />

      {uninstallApp && (
        <DeleteConfirmModal
          isOpen={!!uninstallApp}
          onClose={() => setUninstallApp(null)}
          onConfirm={handleUninstall}
          title="Uninstall App"
          message={`Are you sure you want to uninstall "${uninstallApp.name}"? This removes its configuration, entitlement state, and any scheduled runs.`}
          isDeleting={isUninstalling}
        />
      )}
    </div>
  )
}
