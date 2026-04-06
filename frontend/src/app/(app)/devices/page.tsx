'use client'

import React, { useEffect, useState } from 'react'
import { api, Device } from '@/lib/api'
import { Button, Badge, Card, Modal, LoadingPage, EmptyState, SectionHeader, Input, Select } from '@/components/ui'
import { ToastType, extractError } from '@/hooks/useToast'

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
}

const DEVICE_ICONS: Record<string, string> = { wind: 'W', solar: 'S', hybrid: 'H' }
const DEVICE_COLORS: Record<string, string> = {
  wind: 'linear-gradient(135deg, var(--accent), var(--blue))',
  solar: 'linear-gradient(135deg, var(--amber), #f97316)',
  hybrid: 'linear-gradient(135deg, var(--violet), var(--blue))',
}

export default function DevicesPage({ addToast }: PageProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [recordDevice, setRecordDevice] = useState<Device | null>(null)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState(0)
  const [form, setForm] = useState({ name: '', device_type: 'wind', capacity_kw: '', latitude: '', longitude: '' })
  const [recordKwh, setRecordKwh] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get<{ devices: Device[] }>('/devices/')
      .then(r => setDevices(r.devices || []))
      .catch(() => addToast?.('error', 'Could not load devices'))
      .finally(() => setLoading(false))
  }, [rev])

  const createDevice = async () => {
    if (!form.name || !form.capacity_kw) { addToast?.('error', 'Name and capacity are required'); return }
    setBusy(true)
    try {
      await api.post('/devices/', {
        name: form.name,
        device_type: form.device_type,
        capacity_kw: parseFloat(form.capacity_kw),
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      })
      addToast?.('success', 'Device added', form.name)
      setShowCreate(false)
      setForm({ name: '', device_type: 'wind', capacity_kw: '', latitude: '', longitude: '' })
      setRev(r => r + 1)
    } catch (e) {
      addToast?.('error', 'Failed to add device', extractError(e))
    } finally { setBusy(false) }
  }

  const recordEnergy = async () => {
    if (!recordDevice || !recordKwh) return
    const kwh = parseFloat(recordKwh)
    if (isNaN(kwh) || kwh <= 0) { addToast?.('error', 'Enter a valid kWh value'); return }
    setBusy(true)
    try {
      const res: any = await api.post('/energy/record/', { device_id: recordDevice.id, energy_kwh: kwh })
      addToast?.('success', 'Energy recorded and minted', `${kwh} kWh - Block #${res.blockchain?.block_index}`)
      setRecordDevice(null)
      setRecordKwh('')
    } catch (e) {
      addToast?.('error', 'Recording failed', extractError(e))
    } finally { setBusy(false) }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="animate-in">
      <SectionHeader
        title="Energy Devices"
        subtitle="Your renewable energy sources"
        action={<Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Add Device</Button>}
      />

      {devices.length === 0 ? (
        <EmptyState icon="~" title="No devices yet" description="Add your first wind turbine, solar panel, or hybrid device" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {devices.map((d, i) => (
            <Card key={d.id} className="animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '12px',
                  background: DEVICE_COLORS[d.device_type] || 'var(--bg-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: '#fff',
                  flexShrink: 0,
                }}>
                  {DEVICE_ICONS[d.device_type] || 'D'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{d.device_type} - {d.capacity_kw} kW rated</p>
                </div>
              </div>

              {d.latitude && d.longitude && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
                  {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                <Badge variant={d.is_active ? 'green' : 'gray'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Since {new Date(d.installed_at).toLocaleDateString()}</span>
              </div>

              <Button variant="primary" style={{ width: '100%' }} onClick={() => { setRecordDevice(d); setRecordKwh('') }}>
                Record Energy Production
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Add device modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Energy Device">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input label="Device Name" placeholder="Wind Turbine #1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Select
              label="Type"
              value={form.device_type}
              onChange={e => setForm(p => ({ ...p, device_type: e.target.value }))}
              options={[
                { value: 'wind', label: 'Wind Turbine' },
                { value: 'solar', label: 'Solar Panel' },
                { value: 'hybrid', label: 'Hybrid' },
              ]}
            />
            <Input label="Capacity (kW)" type="number" placeholder="2000" value={form.capacity_kw} onChange={e => setForm(p => ({ ...p, capacity_kw: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Latitude (opt)" type="number" placeholder="43.25" value={form.latitude} onChange={e => setForm(p => ({ ...p, latitude: e.target.value }))} />
            <Input label="Longitude (opt)" type="number" placeholder="76.90" value={form.longitude} onChange={e => setForm(p => ({ ...p, longitude: e.target.value }))} />
          </div>
          <Button variant="primary" style={{ width: '100%', marginTop: '4px' }} loading={busy} onClick={createDevice}>
            Add Device
          </Button>
        </div>
      </Modal>

      {/* Record energy modal */}
      <Modal open={!!recordDevice} onClose={() => setRecordDevice(null)} title="Record Energy Production">
        {recordDevice && (
          <>
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', padding: '14px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{recordDevice.device_type} device</p>
              <p style={{ fontSize: '15px', fontWeight: 600 }}>{recordDevice.name}</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Rated: {recordDevice.capacity_kw} kW</p>
            </div>
            <Input
              label="Energy Produced (kWh)"
              type="number"
              step="0.1"
              placeholder="50.0"
              value={recordKwh}
              onChange={e => setRecordKwh(e.target.value)}
              hint="Credits will be minted and recorded on the blockchain"
            />
            <Button variant="primary" style={{ width: '100%', marginTop: '20px' }} loading={busy} onClick={recordEnergy}>
              Mint Energy Credits
            </Button>
          </>
        )}
      </Modal>
    </div>
  )
}
