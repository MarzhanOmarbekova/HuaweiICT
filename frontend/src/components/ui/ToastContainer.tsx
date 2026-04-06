'use client'

import React from 'react'
import { Toast } from '@/hooks/useToast'

const icons: Record<string, string> = {
  success: '+',
  error: '!',
  info: 'i',
  warning: '~',
}

const colors: Record<string, string> = {
  success: 'var(--accent)',
  error: 'var(--red)',
  info: 'var(--blue)',
  warning: 'var(--amber)',
}

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: number) => void
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '380px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          style={{
            background: 'var(--bg-card)',
            border: `1px solid var(--border-strong)`,
            borderLeft: `3px solid ${colors[t.type]}`,
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            boxShadow: 'var(--shadow-lg)',
            cursor: 'pointer',
            pointerEvents: 'all',
            animation: 'fadeInRight 0.25s ease',
          }}
        >
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: colors[t.type],
              color: t.type === 'success' ? 'var(--accent-text)' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              flexShrink: 0,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {icons[t.type]}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</p>
            {t.message && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-word' }}>{t.message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
