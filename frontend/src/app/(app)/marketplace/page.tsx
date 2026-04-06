'use client'

import React, { useEffect, useState } from 'react'
import { api, Offer, User } from '@/lib/api'
import { Button, Badge, Card, Modal, LoadingPage, EmptyState, SectionHeader, Input, Spinner } from '@/components/ui'
import { ToastType } from '@/hooks/useToast'
import { extractError } from '@/hooks/useToast'

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
  user?: User
}

function statusBadge(status: string) {
  const map: Record<string, 'green' | 'amber' | 'gray' | 'red'> = {
    active: 'green',
    partially_sold: 'amber',
    sold: 'gray',
    cancelled: 'red',
    expired: 'gray',
  }
  return <Badge variant={map[status] || 'gray'}>{status.replace('_', ' ')}</Badge>
}

export default function MarketplacePage({ addToast, user }: PageProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [buyModal, setBuyModal] = useState<Offer | null>(null)
  const [buyAmount, setBuyAmount] = useState('')
  const [buying, setBuying] = useState(false)
  const [rev, setRev] = useState(0)

  useEffect(() => {
    setLoading(true)
    api.get<{ results: Offer[] }>('/marketplace/')
      .then(r => setOffers(r.results || []))
      .catch(() => addToast?.('error', 'Could not load marketplace'))
      .finally(() => setLoading(false))
  }, [rev])

  const handleBuy = async () => {
    if (!buyModal || !buyAmount) return
    const amount = parseFloat(buyAmount)
    if (isNaN(amount) || amount <= 0) { addToast?.('error', 'Enter a valid amount'); return }
    setBuying(true)
    try {
      const res: any = await api.post('/buy/', { offer_id: buyModal.id, energy_amount: amount })
      addToast?.('success', 'Purchase complete', `${amount} kWh acquired. TX: ${res.transaction_id?.slice(0, 14)}...`)
      setBuyModal(null)
      setBuyAmount('')
      setRev(r => r + 1)
    } catch (e) {
      addToast?.('error', 'Purchase failed', extractError(e))
    } finally { setBuying(false) }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="animate-in">
      <SectionHeader
        title="Energy Marketplace"
        subtitle="Buy renewable energy from producers worldwide"
        action={<Button variant="ghost" size="sm" onClick={() => setRev(r => r + 1)}>Refresh</Button>}
      />

      {offers.length === 0 && (
        <EmptyState icon="~" title="No active offers" description="Be the first to list energy on the marketplace" />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {offers.map((offer, i) => (
          <Card key={offer.id} style={{ animationDelay: `${i * 0.04}s` }} className="animate-in">
            {/* Seller */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                  {(offer.seller?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500 }}>{offer.seller?.username}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Producer</p>
                </div>
              </div>
              {statusBadge(offer.status)}
            </div>

            {/* Amount */}
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {offer.energy_amount.toFixed(2)}
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '6px' }}>kWh</span>
              </p>
              <p style={{ fontSize: '13px', color: 'var(--accent)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                {offer.price_per_kwh.toFixed(4)} coins/kWh
              </p>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px', fontFamily: 'var(--font-mono)' }}>
                <span>Available: {offer.available_amount.toFixed(2)} kWh</span>
                <span>Total: {(offer.total_value || 0).toFixed(2)} coins</span>
              </div>
              <div style={{ background: 'var(--bg-surface)', borderRadius: '4px', height: '5px' }}>
                <div style={{
                  width: `${(offer.available_amount / offer.energy_amount) * 100}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  borderRadius: '4px',
                  transition: 'width 0.4s',
                }} />
              </div>
            </div>

            {offer.description && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>{offer.description}</p>
            )}

            <Button
              variant="primary"
              style={{ width: '100%' }}
              disabled={offer.status !== 'active' && offer.status !== 'partially_sold' || offer.seller?.id === user?.id}
              onClick={() => { setBuyModal(offer); setBuyAmount(offer.available_amount.toString()) }}
            >
              {offer.seller?.id === user?.id ? 'Your Offer' : 'Buy Now'}
            </Button>
          </Card>
        ))}
      </div>

      {/* Buy modal */}
      <Modal open={!!buyModal} onClose={() => setBuyModal(null)} title="Buy Energy">
        {buyModal && (
          <>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>From {buyModal.seller?.username}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600 }}>{buyModal.energy_amount.toFixed(2)} kWh</p>
              <p style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>{buyModal.price_per_kwh.toFixed(4)} coins/kWh</p>
            </div>

            <Input
              label="Amount to buy (kWh)"
              type="number"
              step="0.1"
              min="0.1"
              max={buyModal.available_amount}
              value={buyAmount}
              onChange={e => setBuyAmount(e.target.value)}
              hint={`Max: ${buyModal.available_amount.toFixed(2)} kWh`}
            />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '20px', fontFamily: 'var(--font-mono)' }}>
              Total cost: <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{(parseFloat(buyAmount || '0') * buyModal.price_per_kwh).toFixed(4)} coins</span>
            </p>

            <Button variant="primary" style={{ width: '100%' }} loading={buying} onClick={handleBuy}>
              Confirm Purchase
            </Button>
          </>
        )}
      </Modal>
    </div>
  )
}
