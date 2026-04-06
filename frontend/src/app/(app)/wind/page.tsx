'use client'

import React, { useState, useEffect } from 'react'
import { api, OptimizationResult, OptimizationHistory } from '@/lib/api'
import { Button, Badge, Card, StatCard, LoadingPage, EmptyState, SectionHeader, Divider } from '@/components/ui'
import { WindMap } from '@/components/map/WindMap'
import { ToastType, extractError } from '@/hooks/useToast'

interface Coordinates {
  lat_min: number; lat_max: number; lon_min: number; lon_max: number
}

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
}

export default function WindPage({ addToast }: PageProps) {
  const [coords, setCoords] = useState<Coordinates>({ lat_min: 43.25, lat_max: 43.30, lon_min: 76.90, lon_max: 76.95 })
  const [numTurbines, setNumTurbines] = useState(3)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [history, setHistory] = useState<OptimizationHistory[]>([])
  const [histLoading, setHistLoading] = useState(true)

  useEffect(() => {
    api.get<{ history: OptimizationHistory[] }>('/optimization-history/')
      .then(r => setHistory(r.history || []))
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [result])

  const runOptimization = async () => {
    setRunning(true)
    setResult(null)
    try {
      const res = await api.post<OptimizationResult>('/optimize-wind/', {
        coordinates: coords,
        num_turbines: numTurbines,
      })
      setResult(res)
      addToast?.('success', 'Optimization complete', `Found ${res.optimal_points?.length} optimal positions`)
    } catch (e) {
      addToast?.('error', 'Optimization failed', extractError(e))
    } finally { setRunning(false) }
  }

  return (
    <div className="animate-in">
      <SectionHeader
        title="Wind AI Optimization"
        subtitle="MindSpore CNN + Open-Meteo data for turbine placement"
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Turbines:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={numTurbines}
                onChange={e => setNumTurbines(parseInt(e.target.value) || 1)}
                style={{
                  width: '64px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            </div>
            <Button variant="primary" loading={running} onClick={runOptimization}>
              {running ? 'Running CNN...' : 'Run Optimization'}
            </Button>
          </div>
        }
      />

      {/* Info banner - MindSpore + Huawei */}
      <div style={{
        background: 'var(--accent-dim)',
        border: '1px solid rgba(0,214,143,0.2)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '13px',
        color: 'var(--accent)',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>HUAWEI</span>
        <span style={{ color: 'var(--border-strong)' }}>|</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          Powered by <strong>MindSpore CNN</strong> (ModelArts) + <strong>Petal Maps</strong> + Open-Meteo wind data.
          {' '}Configure your Petal Maps key in <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>.env.local</code>.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', marginBottom: '24px' }}>
        {/* Map */}
        <Card style={{ padding: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
            Area Selection - Petal Maps
          </p>
          <WindMap
            onAreaSelected={setCoords}
            optimalPoints={result?.optimal_points || []}
            isLoading={running}
            initialCoords={coords}
          />
        </Card>

        {/* Config + results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Coords summary */}
          <Card>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Selected Area</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Lat min', val: coords.lat_min.toFixed(4) },
                { label: 'Lat max', val: coords.lat_max.toFixed(4) },
                { label: 'Lon min', val: coords.lon_min.toFixed(4) },
                { label: 'Lon max', val: coords.lon_max.toFixed(4) },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>{f.label}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>{f.val}</p>
                </div>
              ))}
            </div>
            <Divider style={{ margin: '14px 0' }} />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Turbines to place: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{numTurbines}</span></p>
          </Card>

          {/* Results */}
          {result && (
            <Card accent>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>Energy Predictions</p>
              {[
                { label: '1 month', val: result.predicted_energy['1_month'] },
                { label: '3 months', val: result.predicted_energy['3_months'] },
                { label: '6 months', val: result.predicted_energy['6_months'] },
                { label: '12 months', val: result.predicted_energy['12_months'] },
              ].map(e => (
                <div key={e.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>{e.val}</span>
                </div>
              ))}
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Avg wind: <span style={{ color: 'var(--blue-light)', fontFamily: 'var(--font-mono)' }}>{result.environmental_summary.avg_wind_speed}</span>
                </p>
              </div>
            </Card>
          )}

          {running && !result && (
            <Card>
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>Collecting wind data...</div>
                <div style={{ height: '4px', background: 'var(--bg-surface)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: '2px',
                    animation: 'shimmer 1.5s linear infinite',
                    backgroundImage: 'linear-gradient(90deg, var(--accent) 25%, var(--accent-hover) 50%, var(--accent) 75%)',
                    backgroundSize: '200% 100%',
                  }} />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>May take 30-60s (8x8 grid API calls)</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Turbine positions table */}
      {result && (
        <Card style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
            Optimal Turbine Positions ({result.optimal_points.length})
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Latitude', 'Longitude', 'Efficiency', 'Wind Speed', '12-Month kWh'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.turbine_details.map((t, i) => (
                  <tr key={i}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: '13px' }}>#{i + 1}</span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{t.latitude.toFixed(5)}</span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{t.longitude.toFixed(5)}</span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', height: '5px', background: 'var(--bg-surface)', borderRadius: '3px' }}>
                          <div style={{ width: `${(t.efficiency * 100).toFixed(0)}%`, height: '100%', background: 'var(--accent)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent)' }}>{(t.efficiency * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--blue-light)' }}>{t.wind_speed.toFixed(2)} m/s</span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--amber)' }}>{t.energy_predictions['12_months'].toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* History */}
      <Card>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
          Optimization History
        </p>
        {histLoading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
        ) : history.length === 0 ? (
          <EmptyState icon="~" title="No history yet" description="Run your first optimization above" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Turbines', 'Status', 'Energy (12mo)', 'Positions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '8px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id}>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(h.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{h.num_turbines}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={h.status === 'completed' ? 'green' : 'amber'}>{h.status}</Badge>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)' }}>{h.energy_12_months || '-'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>{h.optimal_points?.length || 0} pts</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
