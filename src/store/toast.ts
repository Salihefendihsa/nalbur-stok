import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
}

interface AddOptions {
  action?: ToastAction
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: ToastType, opts?: AddOptions) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'success', opts) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, message, type, action: opts?.action }] }))
    const duration = opts?.duration ?? 4000
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function useToast() {
  const add = useToastStore((s) => s.add)
  return {
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
    undo: (msg: string, onUndo: () => void) =>
      add(msg, 'success', { action: { label: 'Geri Al', onClick: onUndo }, duration: 5000 }),
  }
}
