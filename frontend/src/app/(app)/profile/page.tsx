'use client'

import React, { useEffect, useState } from 'react'
import { api, Balance, User } from '@/lib/api'
import { Button, Badge, Card, LoadingPage, SectionHeader, Divider } from '@/components/ui'
import { ToastType } from '@/hooks/useToast'

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
  user?: User
  onLogout?: () => void
}

export default function ProfilePage({ addToast, user, onLogout }: PageProps) {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Balance>('/balance/')
      .then(setBalance)
      .catch(() => addToast?.('error', 'Could not load balance'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="animate-in">
      <SectionHeader title="Profile" subtitle="Account settings and energy portfolio" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Profile card */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '26px', color: '#fff',
              flexShrink: 0,
            }}>
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '18px', marginBottom: '3px' }}>{user?.username}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>{user?.email}</p>
              <Badge variant={user?.is_company ? 'blue' : 'green'}>{user?.is_company ? 'Company' : 'Individual'}</Badge>
            </div>
          </div>

          <Divider style={{ marginBottom: '20px' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'User ID', val: `#${user?.id}` },
              { label: 'Account type', val: user?.is_company ? 'Company' : 'Individual' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{row.val}</span>
              </div>
            ))}
          </div>

          <Button variant="danger" style={{ width: '100%' }} onClick={onLogout}>
            Sign Out
          </Button>
        </Card>

        {/* Energy portfolio */}
        {balance && (
          <Card accent>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '20px' }}>
              Energy Portfolio
            </p>

            {[
              { label: 'Total Energy Credits', val: `${balance.energy_credits.toFixed(3)} kWh`, color: 'var(--accent)' },
              { label: 'Available Credits', val: `${balance.available_credits.toFixed(3)} kWh`, color: 'var(--text-primary)' },
              { label: 'Locked in Offers', val: `${balance.locked_credits.toFixed(3)} kWh`, color: 'var(--amber)' },
              { label: 'VoltCoin Balance', val: `${balance.coin_balance.toFixed(4)} VTC`, color: 'var(--amber)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: row.color, fontSize: '13px' }}>{row.val}</span>
              </div>
            ))}

            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Credits in use</span>
                <span>{(100 - (balance.available_credits / Math.max(1, balance.energy_credits)) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ background: 'var(--bg-surface)', borderRadius: '4px', height: '6px' }}>
                <div style={{
                  width: `${(balance.locked_credits / Math.max(1, balance.energy_credits)) * 100}%`,
                  height: '100%',
                  background: 'var(--amber)',
                  borderRadius: '4px',
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Huawei services status */}
      <Card style={{ marginTop: '20px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Huawei Cloud Services
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            {
              name: 'Petal Maps',
              desc: 'Interactive wind area selection',
              status: process.env.NEXT_PUBLIC_PETAL_MAPS_KEY && process.env.NEXT_PUBLIC_PETAL_MAPS_KEY !== 'YOUR_PETAL_MAPS_KEY' ? 'configured' : 'needs key',
              link: 'https://developer.huawei.com',
              color: process.env.NEXT_PUBLIC_PETAL_MAPS_KEY && process.env.NEXT_PUBLIC_PETAL_MAPS_KEY !== 'YOUR_PETAL_MAPS_KEY' ? 'green' : 'amber',
            },
            {
              name: 'ModelArts',
              desc: 'MindSpore CNN inference',
              status: 'local model',
              link: 'https://console.huaweicloud.com/modelarts',
              color: 'blue',
            },
            {
              name: 'BCS Blockchain',
              desc: 'Immutable transaction ledger',
              status: 'local chain',
              link: 'https://console.huaweicloud.com/bcs',
              color: 'violet',
            },
          ].map(svc => (
            <div key={svc.name} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{svc.name}</span>
                <Badge variant={svc.color as any}>{svc.status}</Badge>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{svc.desc}</p>
              <a href={svc.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
                Configure ->
              </a>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
