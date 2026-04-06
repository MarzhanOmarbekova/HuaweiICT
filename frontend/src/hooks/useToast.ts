'use client'

import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

// Helper to extract readable error message from API errors
export function extractError(err: unknown): string {
  if (!err) return 'Unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (e.error && typeof e.error === 'string') return e.error
    if (e.detail && typeof e.detail === 'string') return e.detail
    if (e.non_field_errors) {
      const nfe = e.non_field_errors
      if (Array.isArray(nfe)) return nfe.join(', ')
    }
    // Collect all field errors
    const msgs: string[] = []
    for (const key of Object.keys(e)) {
      const val = e[key]
      if (Array.isArray(val)) msgs.push(`${key}: ${val.join(', ')}`)
      else if (typeof val === 'string') msgs.push(`${key}: ${val}`)
    }
    if (msgs.length > 0) return msgs.join(' | ')
  }
  return 'Something went wrong'
}
