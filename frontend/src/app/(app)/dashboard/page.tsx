'use client'

import React, { useEffect, useState } from 'react'
import { api, DashboardData } from '@/lib/api'
import { StatCard, Card, Badge, LoadingPage, EmptyState, SectionHeader, Divider } from '@/components/ui'
import { ToastType } from '@/hooks/useToast'

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
}

export default function DashboardPage({ addToast }: PageProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardData>('/dashboard/')
      .then(setData)
      .catch(() => addToast?.('error', 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />
  if (!data) return (
    <EmptyState icon="!" title="Could not connect to backend" description="Make sure the Django server is running at http://127.0.0.1:8000" />
  )

  const { balance, stats, recent_transactions } = data

  return (
    <div className="animate-in">
      <SectionHeader title="Dashboard" subtitle="Your energy portfolio at a glance" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Available Credits" value={`${(balance.available_credits || 0).toFixed(2)} kWh`} sub={`${(balance.locked_credits || 0).toFixed(2)} kWh locked`} color="accent" icon="flash" />
        <StatCard label="Coin Balance" value={(balance.coin_balance || 0).toFixed(2)} sub="VoltCoins" color="amber" icon="coin" />
        <StatCard label="Total Generated" value={`${(stats.total_generated_kwh || 0).toFixed(1)} kWh`} sub="lifetime production" color="blue" icon="wind" />
        <StatCard label="Devices" value={stats.devices || 0} sub={`${stats.active_offers || 0} active offers`} color="violet" icon="device" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Trading overview */}
        <Card>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trading Overview</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Sales</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '30px', fontWeight: 600, color: 'var(--accent)' }}>{stats.total_sales || 0}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Purchases</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '30px', fontWeight: 600, color: 'var(--blue-light)' }}>{stats.total_purchases || 0}</p>
            </div>
          </div>
          <Divider style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Energy credit usage</p>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent), var(--blue))',
              borderRadius: '4px',
              width: `${Math.min(100, ((balance.available_credits || 0) / Math.max(1, balance.energy_credits)) * 100)}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>Available: {(balance.available_credits || 0).toFixed(2)}</span>
            <span>Total: {(balance.energy_credits || 0).toFixed(2)}</span>
          </div>
        </Card>

        {/* Recent transactions */}
        <Card>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Transactions</p>
          {!recent_transactions?.length && (
            <EmptyState icon="~" title="No transactions yet" description="Start trading to see activity here" />
          )}
          {(recent_transactions || []).slice(0, 5).map(tx => (
            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 500, color: tx.tx_type === 'mint' ? 'var(--accent)' : 'var(--blue-light)', marginBottom: '2px' }}>
                  {tx.tx_type === 'mint' ? 'Energy Minted' : 'P2P Trade'} - {tx.energy_amount?.toFixed(2)} kWh
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(tx.contract_hash || '').slice(0, 24)}...
                </p>
              </div>
              <Badge variant={tx.tx_type === 'mint' ? 'green' : 'blue'}>{tx.tx_type}</Badge>
            </div>
          ))}
        </Card>
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: '24px' }}>
        <Card style={{ background: 'linear-gradient(135deg, var(--accent-dim) 0%, transparent 60%)', borderColor: 'rgba(0,214,143,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Ready to start trading?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Add a device, record energy production, then list it on the marketplace.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
              <a href="/devices" style={{ padding: '9px 18px', background: 'var(--accent)', color: 'var(--accent-text)', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
                Add Device
              </a>
              <a href="/wind" style={{ padding: '9px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
                Run AI
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
