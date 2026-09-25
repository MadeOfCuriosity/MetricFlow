import { Fragment, ReactNode, MutableRefObject } from 'react'
import { Dialog, Transition } from '@headlessui/react'

// Note: cn() is plain clsx (no tailwind-merge), so a custom className replaces this entirely
const DEFAULT_PANEL = 'w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-xl'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  /** Full class list for the dialog panel (width, padding, surface); replaces the default */
  className?: string
  children: ReactNode
  /** Element to focus when the dialog opens (defaults to the first focusable element) */
  initialFocus?: MutableRefObject<HTMLElement | null>
}

/**
 * Shared modal shell: backdrop, centering, enter/leave animation and focus handling.
 * Put a <Dialog.Title> inside for an accessible name.
 */
export function Modal({ isOpen, onClose, className, children, initialFocus }: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} initialFocus={initialFocus}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
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
              <Dialog.Panel className={className ?? DEFAULT_PANEL}>
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
