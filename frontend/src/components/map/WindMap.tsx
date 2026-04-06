'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Card, Spinner } from '@/components/ui'
import { OptimalPoint } from '@/lib/api'

interface Coordinates {
  lat_min: number
  lat_max: number
  lon_min: number
  lon_max: number
}

interface WindMapProps {
  onAreaSelected: (coords: Coordinates) => void
  optimalPoints?: OptimalPoint[]
  isLoading?: boolean
  initialCoords?: Coordinates
}

// Petal Maps Web JS SDK endpoint
// Get API key from: https://developer.huawei.com > Petal Maps > Web Service
const PETAL_MAPS_API_KEY = process.env.NEXT_PUBLIC_PETAL_MAPS_KEY || 'YOUR_PETAL_MAPS_KEY'

export function WindMap({ onAreaSelected, optimalPoints = [], isLoading = false, initialCoords }: WindMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const rectangleRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [selectionMode, setSelectionMode] = useState<'rect' | 'points'>('rect')
  const [cornerPoints, setCornerPoints] = useState<{ lat: number; lon: number }[]>([])
  const [coords, setCoords] = useState<Coordinates>(
    initialCoords || { lat_min: 43.20, lat_max: 43.35, lon_min: 76.85, lon_max: 77.00 }
  )
  const [manualInput, setManualInput] = useState(false)

  // Load Petal Maps SDK
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already loaded
    if ((window as any).PetalMaps) {
      initMap()
      return
    }

    const script = document.createElement('script')
    script.src = `https://mapkit.map.huawei.com/5.0.0/js/hw-mapkit-ext.min.js?key=${PETAL_MAPS_API_KEY}&callback=onPetalMapsReady`
    script.async = true
    script.onerror = () => {
      console.warn('Petal Maps SDK failed to load - using fallback map')
      setMapError(true)
    }

    ;(window as any).onPetalMapsReady = () => {
      setMapReady(true)
    }

    document.head.appendChild(script)
    return () => {
      delete (window as any).onPetalMapsReady
    }
  }, [])

  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !(window as any).HWMapJsSDK) return

    try {
      const HWMapJsSDK = (window as any).HWMapJsSDK
      mapRef.current = new HWMapJsSDK.HWMap(mapContainerRef.current, {
        center: {
          lat: (coords.lat_min + coords.lat_max) / 2,
          lng: (coords.lon_min + coords.lon_max) / 2,
        },
        zoom: 11,
        language: 'en',
      })

      mapRef.current.on('click', handleMapClick)
      drawInitialRect()
    } catch (e) {
      console.error('Map init error:', e)
      setMapError(true)
    }
  }, [coords])

  useEffect(() => {
    if (mapReady) initMap()
  }, [mapReady, initMap])

  const handleMapClick = (e: any) => {
    if (selectionMode !== 'points') return
    const lat = e.latlng?.lat
    const lng = e.latlng?.lng
    if (!lat || !lng) return

    setCornerPoints(prev => {
      const next = [...prev, { lat, lon: lng }]
      if (next.length === 4) {
        const lats = next.map(p => p.lat)
        const lons = next.map(p => p.lon)
        const newCoords = {
          lat_min: Math.min(...lats),
          lat_max: Math.max(...lats),
          lon_min: Math.min(...lons),
          lon_max: Math.max(...lons),
        }
        setCoords(newCoords)
        onAreaSelected(newCoords)
        return []
      }
      return next
    })
  }

  const drawInitialRect = () => {
    if (!mapRef.current || !(window as any).HWMapJsSDK) return
    const HWMapJsSDK = (window as any).HWMapJsSDK

    if (rectangleRef.current) {
      rectangleRef.current.setMap(null)
    }

    rectangleRef.current = new HWMapJsSDK.Rectangle({
      bounds: {
        sw: { lat: coords.lat_min, lng: coords.lon_min },
        ne: { lat: coords.lat_max, lng: coords.lon_max },
      },
      strokeColor: '#00d68f',
      strokeWeight: 2,
      fillColor: 'rgba(0,214,143,0.1)',
    })
    rectangleRef.current.setMap(mapRef.current)
  }

  // Draw optimal turbine points on map
  useEffect(() => {
    if (!mapRef.current || !(window as any).HWMapJsSDK) return
    const HWMapJsSDK = (window as any).HWMapJsSDK

    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    optimalPoints.forEach((pt, i) => {
      const marker = new HWMapJsSDK.Marker({
        position: { lat: pt.lat, lng: pt.lon },
        label: {
          content: `T${i + 1}`,
          color: '#00d68f',
        },
      })
      marker.setMap(mapRef.current)
      markersRef.current.push(marker)
    })
  }, [optimalPoints])

  const handleManualApply = () => {
    onAreaSelected(coords)
  }

  // ---- FALLBACK MAP (CSS grid visualization when SDK unavailable) ----
  if (mapError || PETAL_MAPS_API_KEY === 'YOUR_PETAL_MAPS_KEY') {
    return <FallbackMap coords={coords} setCoords={setCoords} onAreaSelected={onAreaSelected} optimalPoints={optimalPoints} isLoading={isLoading} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant={selectionMode === 'rect' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => { setSelectionMode('rect'); setManualInput(true) }}
        >
          Manual coords
        </Button>
        <Button
          variant={selectionMode === 'points' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => { setSelectionMode('points'); setManualInput(false) }}
        >
          Click 4 corners on map
        </Button>
        {selectionMode === 'points' && cornerPoints.length > 0 && (
          <span style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {4 - cornerPoints.length} more click{cornerPoints.length < 3 ? 's' : ''} needed
          </span>
        )}
      </div>

      {/* Map */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '400px' }} />
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(7,11,18,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '12px',
          }}>
            <Spinner size={32} />
            <p style={{ color: 'var(--accent)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>Running CNN optimization...</p>
          </div>
        )}
      </div>

      {/* Manual input */}
      {manualInput && (
        <ManualCoordsInput coords={coords} setCoords={setCoords} onApply={handleManualApply} />
      )}
    </div>
  )
}

// ---- Fallback interactive map (no Petal Maps SDK) ----
function FallbackMap({
  coords, setCoords, onAreaSelected, optimalPoints, isLoading
}: {
  coords: Coordinates
  setCoords: (c: Coordinates) => void
  onAreaSelected: (c: Coordinates) => void
  optimalPoints: OptimalPoint[]
  isLoading: boolean
}) {
  const GRID = 16
  const [dragging, setDragging] = useState<{ startRow: number; startCol: number } | null>(null)
  const [selection, setSelection] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(null)

  const cellToLatLon = (row: number, col: number) => {
    // Map from a wider area centered around Almaty
    const LAT_CENTER = 43.25
    const LON_CENTER = 76.92
    const SPAN = 0.6
    const lat = LAT_CENTER + SPAN * 0.5 - (row / GRID) * SPAN
    const lon = LON_CENTER - SPAN * 0.5 + (col / GRID) * SPAN
    return { lat, lon }
  }

  const handleMouseDown = (row: number, col: number) => {
    setDragging({ startRow: row, startCol: col })
    setSelection({ r1: row, c1: col, r2: row, c2: col })
  }

  const handleMouseEnter = (row: number, col: number) => {
    if (!dragging) return
    setSelection({
      r1: Math.min(dragging.startRow, row),
      c1: Math.min(dragging.startCol, col),
      r2: Math.max(dragging.startRow, row),
      c2: Math.max(dragging.startCol, col),
    })
  }

  const handleMouseUp = () => {
    if (selection) {
      const sw = cellToLatLon(selection.r2, selection.c1)
      const ne = cellToLatLon(selection.r1, selection.c2)
      const newCoords = {
        lat_min: parseFloat(sw.lat.toFixed(4)),
        lat_max: parseFloat(ne.lat.toFixed(4)),
        lon_min: parseFloat(sw.lon.toFixed(4)),
        lon_max: parseFloat(ne.lon.toFixed(4)),
      }
      setCoords(newCoords)
      onAreaSelected(newCoords)
    }
    setDragging(null)
  }

  const isInSelection = (row: number, col: number) => {
    if (!selection) return false
    return row >= selection.r1 && row <= selection.r2 && col >= selection.c1 && col <= selection.c2
  }

  const isTurbineCell = (row: number, col: number) => {
    return optimalPoints.some(pt => {
      const cell = latLonToCell(pt.lat, pt.lon)
      return cell.row === row && cell.col === col
    })
  }

  const latLonToCell = (lat: number, lon: number) => {
    const LAT_CENTER = 43.25; const LON_CENTER = 76.92; const SPAN = 0.6
    const row = Math.round(((LAT_CENTER + SPAN * 0.5 - lat) / SPAN) * GRID)
    const col = Math.round(((lon - (LON_CENTER - SPAN * 0.5)) / SPAN) * GRID)
    return { row: Math.max(0, Math.min(GRID - 1, row)), col: Math.max(0, Math.min(GRID - 1, col)) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--accent-dim)',
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}>
        <strong style={{ color: 'var(--accent)' }}>Map Mode:</strong> Drag to select area for turbine placement.
        Configure your Huawei Petal Maps API key in <code style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>.env.local</code> for the full interactive map.
      </div>

      {/* Grid map */}
      <div
        style={{
          position: 'relative',
          background: '#0a1520',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: '8px',
          userSelect: 'none',
        }}
        onMouseLeave={() => { setDragging(null) }}
        onMouseUp={handleMouseUp}
      >
        {/* Axis labels */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', paddingLeft: '32px' }}>
          {Array.from({ length: GRID }).map((_, c) => {
            const { lon } = cellToLatLon(0, c)
            return c % 4 === 0 ? (
              <div key={c} style={{ flex: 1, fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                {lon.toFixed(2)}
              </div>
            ) : <div key={c} style={{ flex: 1 }} />
          })}
        </div>

        <div style={{ display: 'flex' }}>
          {/* Y axis */}
          <div style={{ width: '28px', display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: GRID }).map((_, r) => {
              const { lat } = cellToLatLon(r, 0)
              return r % 4 === 0 ? (
                <div key={r} style={{ flex: 1, display: 'flex', alignItems: 'center', fontSize: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', justifyContent: 'flex-end', paddingRight: '4px' }}>
                  {lat.toFixed(2)}
                </div>
              ) : <div key={r} style={{ flex: 1 }} />
            })}
          </div>

          {/* Grid cells */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            gap: '2px',
          }}>
            {Array.from({ length: GRID * GRID }).map((_, idx) => {
              const row = Math.floor(idx / GRID)
              const col = idx % GRID
              const inSel = isInSelection(row, col)
              const turbine = isTurbineCell(row, col)
              const turbineData = turbine ? optimalPoints.find(pt => {
                const cell = latLonToCell(pt.lat, pt.lon)
                return cell.row === row && cell.col === col
              }) : null

              // Terrain color simulation
              const hue = 150 + (row * 3 + col * 2) % 30
              const lightness = 8 + (row + col) % 8

              return (
                <div
                  key={idx}
                  onMouseDown={() => handleMouseDown(row, col)}
                  onMouseEnter={() => handleMouseEnter(row, col)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: '2px',
                    background: turbine
                      ? 'rgba(0,214,143,0.3)'
                      : inSel
                        ? 'rgba(0,214,143,0.15)'
                        : `hsl(${hue},30%,${lightness}%)`,
                    border: turbine
                      ? '1px solid var(--accent)'
                      : inSel
                        ? '1px solid rgba(0,214,143,0.4)'
                        : '1px solid transparent',
                    cursor: 'crosshair',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    transition: 'background 0.1s',
                    position: 'relative',
                  }}
                >
                  {turbine && (
                    <span title={`Efficiency: ${((turbineData?.efficiency || 0) * 100).toFixed(1)}%`} style={{ color: 'var(--accent)', fontSize: '10px', lineHeight: 1 }}>
                      *
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 'var(--radius-lg)',
            background: 'rgba(7,11,18,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px',
          }}>
            <Spinner size={32} />
            <p style={{ color: 'var(--accent)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>CNN model running...</p>
          </div>
        )}
      </div>

      <ManualCoordsInput coords={coords} setCoords={setCoords} onApply={() => onAreaSelected(coords)} />
    </div>
  )
}

function ManualCoordsInput({ coords, setCoords, onApply }: {
  coords: Coordinates
  setCoords: (c: Coordinates) => void
  onApply: () => void
}) {
  const fields: { key: keyof Coordinates; label: string }[] = [
    { key: 'lat_min', label: 'Lat Min' },
    { key: 'lat_max', label: 'Lat Max' },
    { key: 'lon_min', label: 'Lon Min' },
    { key: 'lon_max', label: 'Lon Max' },
  ]

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
      <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
        Area Coordinates
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
        {fields.map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{f.label}</label>
            <input
              type="number"
              step="0.001"
              value={coords[f.key]}
              onChange={e => setCoords({ ...coords, [f.key]: parseFloat(e.target.value) || 0 })}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '7px 10px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        ))}
      </div>
      <Button variant="primary" size="sm" onClick={onApply} style={{ width: '100%' }}>
        Apply Coordinates
      </Button>
    </div>
  )
}
