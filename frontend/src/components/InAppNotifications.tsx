import { useEffect, useState } from 'react'
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MegaphoneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { notificationsService, ActiveNotification } from '../services/notifications'

const SEVERITY_STYLES: Record<string, { bg: string; icon: any }> = {
  info: { bg: 'bg-primary-500/10 border-primary-500/30 text-primary-300', icon: InformationCircleIcon },
  warning: { bg: 'bg-warning-500/10 border-warning-500/30 text-warning-300', icon: ExclamationTriangleIcon },
  success: { bg: 'bg-success-500/10 border-success-500/30 text-success-300', icon: CheckCircleIcon },
  announcement: { bg: 'bg-primary-500/10 border-primary-500/30 text-primary-300', icon: MegaphoneIcon },
}

export function InAppNotifications() {
  const [items, setItems] = useState<ActiveNotification[]>([])

  useEffect(() => {
    notificationsService.getActive().then(setItems).catch(() => setItems([]))
  }, [])

  const handleDismiss = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    try {
      await notificationsService.dismiss(id)
    } catch {
      // silent — banner is already gone locally
    }
  }

  if (items.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {items.map((n) => {
        const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.info
        const Icon = style.icon
        return (
          <div
            key={n.id}
            className={`relative rounded-lg border px-4 py-3 ${style.bg}`}
          >
            <div className="flex items-start gap-3 pr-8">
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{n.title}</div>
                <div className="text-sm text-dark-200 whitespace-pre-wrap mt-0.5">
                  {n.body}
                </div>
                {n.cta_label && n.cta_url && (
                  <a
                    href={n.cta_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-2 text-sm font-medium underline"
                  >
                    {n.cta_label}
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDismiss(n.id)}
              className="absolute top-2 right-2 p-1 text-dark-300 hover:text-foreground rounded"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
