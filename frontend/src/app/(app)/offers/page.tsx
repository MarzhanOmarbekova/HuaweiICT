'use client'

import React, { useEffect, useState } from 'react'
import { api, Offer, Device } from '@/lib/api'
import { Button, Badge, Card, Modal, LoadingPage, EmptyState, SectionHeader, Input, Select, Divider } from '@/components/ui'
import { ToastType, extractError } from '@/hooks/useToast'

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
}

function statusBadge(status: string) {
  const map: Record<string, 'green' | 'amber' | 'gray' | 'red'> = {
    active: 'green', partially_sold: 'amber', sold: 'gray', cancelled: 'red', expired: 'gray',
  }
  return <Badge variant={map[status] || 'gray'}>{status.replace('_', ' ')}</Badge>
}

export default function OffersPage({ addToast }: PageProps) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [rev, setRev] = useState(0)
  const [form, setForm] = useState({ energy_amount: '', price_per_kwh: '', device_id: '', description: '' })

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<{ results: Offer[] }>('/marketplace/'),
      api.get<{ devices: Device[] }>('/devices/'),
    ]).then(([off, dev]) => {
      setOffers(off.results || [])
      setDevices(dev.devices || [])
    }).catch(() => addToast?.('error', 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [rev])

  const createOffer = async () => {
    if (!form.energy_amount || !form.price_per_kwh) { addToast?.('error', 'Fill in required fields'); return }
    setCreating(true)
    try {
      await api.post('/offers/', {
        energy_amount: parseFloat(form.energy_amount),
        price_per_kwh: parseFloat(form.price_per_kwh),
        device_id: form.device_id || null,
        description: form.description,
      })
      addToast?.('success', 'Offer created', `${form.energy_amount} kWh listed at ${form.price_per_kwh} coins/kWh`)
      setShowCreate(false)
      setForm({ energy_amount: '', price_per_kwh: '', device_id: '', description: '' })
      setRev(r => r + 1)
    } catch (e) {
      addToast?.('error', 'Failed to create offer', extractError(e))
    } finally { setCreating(false) }
  }

  const cancelOffer = async (id: string) => {
    try {
      await api.delete(`/offers/${id}/`)
      addToast?.('success', 'Offer cancelled')
      setRev(r => r + 1)
    } catch (e) {
      addToast?.('error', 'Could not cancel offer', extractError(e))
    }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="animate-in">
      <SectionHeader
        title="My Offers"
        subtitle="Manage your energy listings"
        action={<Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Create Offer</Button>}
      />

      <Card>
        {offers.length === 0 ? (
          <EmptyState icon="~" title="No offers yet" description="Create your first energy listing to start selling" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Amount', 'Price/kWh', 'Available', 'Total Value', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{o.energy_amount?.toFixed(2)} kWh</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)' }}>{o.price_per_kwh?.toFixed(4)}</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{o.available_amount?.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--amber)' }}>{(o.total_value || 0).toFixed(4)}</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      {statusBadge(o.status)}
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      {o.status === 'active' && (
                        <Button variant="danger" size="sm" onClick={() => cancelOffer(o.id)}>Cancel</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Energy Offer">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <Input
            label="Energy Amount (kWh)"
            type="number"
            step="0.1"
            placeholder="100.0"
            value={form.energy_amount}
            onChange={e => setForm(p => ({ ...p, energy_amount: e.target.value }))}
          />
          <Input
            label="Price per kWh (coins)"
            type="number"
            step="0.0001"
            placeholder="0.05"
            value={form.price_per_kwh}
            onChange={e => setForm(p => ({ ...p, price_per_kwh: e.target.value }))}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <Select
            label="Device (optional)"
            value={form.device_id}
            onChange={e => setForm(p => ({ ...p, device_id: e.target.value }))}
            options={[
              { value: '', label: 'No device linked' },
              ...devices.map(d => ({ value: d.id, label: `${d.name} (${d.device_type})` })),
            ]}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '5px' }}>
            Description
          </label>
          <textarea
            placeholder="Wind energy from Almaty region..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={2}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {form.energy_amount && form.price_per_kwh && (
          <div style={{ background: 'var(--accent-dim)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            Total listing value: {(parseFloat(form.energy_amount) * parseFloat(form.price_per_kwh)).toFixed(4)} coins
          </div>
        )}

        <Button variant="primary" style={{ width: '100%' }} loading={creating} onClick={createOffer}>
          Create Offer
        </Button>
      </Modal>
    </div>
  )
}
