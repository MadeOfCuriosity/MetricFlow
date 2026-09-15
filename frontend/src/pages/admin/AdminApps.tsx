import { useState, useEffect, useCallback } from 'react'
import { Cog6ToothIcon, PlayIcon, TrashIcon, TableCellsIcon, Squares2X2Icon, CheckCircleIcon } from '@heroicons/react/24/outline'
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
  }, [showError])

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
      success('Saved', `${configApp.name} secret configuration updated.`)
      setConfigApp(null)
      fetchApps()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to save secret configuration')
    }
  }

  const handleUninstall = async () => {
    if (!uninstallApp) return
    setIsUninstalling(true)
    try {
      await appsApi.uninstall(uninstallApp.key)
      success('Uninstalled', `${uninstallApp.name} has been uninstalled.`)
      setUninstallApp(null)
      fetchApps()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      showError(e.response?.data?.detail || 'Failed to uninstall app')
    } finally {
      setIsUninstalling(false)
    }
  }

  const installedCount = apps.filter((a) => Boolean(a.installation)).length
  const enabledCount = apps.filter((a) => Boolean(a.installation?.is_enabled)).length

  return (
    <div className="space-y-6">
      {/* Subtle Summary Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <Squares2X2Icon className="w-3.5 h-3.5 text-dark-400 stroke-[1.8]" />
          <span className="text-dark-400">Total Apps:</span>
          <span className="font-semibold text-foreground">{apps.length}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400 stroke-[1.8]" />
          <span className="text-dark-400">Installed:</span>
          <span className="font-semibold text-foreground">{installedCount}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700/70 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
          <span className="text-dark-400">Enabled:</span>
          <span className="font-semibold text-foreground">{enabledCount}</span>
        </div>
      </div>

      {/* App cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-xs text-dark-400 bg-dark-900 border border-dark-700 rounded-2xl">
            Loading extension apps...
          </div>
        ) : apps.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-dark-400 bg-dark-900 border border-dark-700 rounded-2xl">
            No extension apps available yet.
          </div>
        ) : (
          apps.map((app) => {
            const installed = Boolean(app.installation)
            const enabled = Boolean(app.installation?.is_enabled)
            const busy = busyKeys.has(app.key)
            const entitlementBlocked =
              app.installation &&
              ['required', 'revoked'].includes(app.installation.entitlement_status)

            return (
              <div
                key={app.key}
                className="bg-dark-900 border border-dark-700 rounded-2xl p-6 flex flex-col justify-between gap-4 shadow-sm hover:border-dark-600 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground tracking-tight">{app.name}</p>
                      <p className="text-xs text-dark-400 mt-1 line-clamp-2 leading-relaxed">{app.description}</p>
                    </div>
                    {installed && (
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md border flex-shrink-0 ${
                          enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-dark-800 text-dark-400 border-dark-700'
                        }`}
                      >
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-dark-400 mt-3">
                    {app.triggers.map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-dark-950 border border-dark-800 rounded-md capitalize font-medium">
                        {t.replace('_', ' ')}
                      </span>
                    ))}
                    {app.requires_entitlement && (
                      <span className="px-2 py-0.5 bg-dark-950 border border-dark-800 rounded-md text-amber-400/80">Requires entitlement</span>
                    )}
                  </div>

                  {entitlementBlocked && (
                    <p className="text-xs text-amber-400 mt-2 font-medium">
                      Entitlement not granted yet — contact support to enable this app.
                    </p>
                  )}

                  {lastRunSummary[app.key] && (
                    <p className="text-xs text-dark-400 truncate mt-2">Last run: {lastRunSummary[app.key]}</p>
                  )}

                  {app.installation && (
                    <p className="text-[11px] text-dark-500 mt-2">
                      Installed {formatDistanceToNow(new Date(app.installation.installed_at), { addSuffix: true })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-dark-800">
                  {!installed ? (
                    <button
                      type="button"
                      onClick={() => handleInstall(app)}
                      disabled={busy}
                      className="px-4 py-2 text-xs font-semibold bg-foreground text-dark-950 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      Install App
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEnableToggle(app)}
                        disabled={busy || Boolean(!enabled && entitlementBlocked)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
                          enabled
                            ? 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-foreground hover:bg-dark-700'
                            : 'bg-foreground text-dark-950 hover:opacity-90 shadow-sm'
                        }`}
                      >
                        {enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRun(app)}
                        disabled={busy || !enabled}
                        title="Run now"
                        className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                      >
                        <PlayIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfigApp(app)}
                        title="Configure"
                        className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                      </button>
                      {app.key === 'whatsapp_notifier' && (
                        <button
                          type="button"
                          onClick={() => setDataPanelAppKey(app.key)}
                          title="Manage data source, recipients & suppressions"
                          className="p-1.5 text-dark-400 hover:text-foreground hover:bg-dark-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <TableCellsIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setUninstallApp(app)}
                        title="Uninstall"
                        className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto cursor-pointer"
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
        isOpen={Boolean(configApp)}
        onClose={() => setConfigApp(null)}
        onSave={handleSaveConfig}
        onSaveSecrets={handleSaveSecrets}
        app={configApp}
      />

      <WhatsAppNotifierPanel
        isOpen={Boolean(dataPanelApp)}
        onClose={() => setDataPanelAppKey(null)}
        app={dataPanelApp}
        onConfigChanged={fetchApps}
      />

      {uninstallApp && (
        <DeleteConfirmModal
          isOpen={Boolean(uninstallApp)}
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
