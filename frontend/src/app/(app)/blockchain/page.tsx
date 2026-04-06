'use client'

import React, { useEffect, useState } from 'react'
import { api, BlockchainBlock } from '@/lib/api'
import { Badge, Card, LoadingPage, EmptyState, SectionHeader, Divider } from '@/components/ui'
import { ToastType, extractError } from '@/hooks/useToast'

interface BlockchainData {
  is_valid: boolean
  total_blocks: number
  blocks: BlockchainBlock[]
}

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
}

function HashDisplay({ hash }: { hash: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: 'var(--accent)',
      background: 'var(--accent-dim)',
      padding: '2px 7px',
      borderRadius: '4px',
      display: 'inline-block',
      maxWidth: '180px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
    }}
      title={hash}
      onClick={() => navigator.clipboard?.writeText(hash)}
    >
      {hash.slice(0, 16)}...
    </span>
  )
}

export default function BlockchainPage({ addToast }: PageProps) {
  const [data, setData] = useState<BlockchainData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [searchId, setSearchId] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    api.get<BlockchainData>('/blockchain/')
      .then(setData)
      .catch(() => addToast?.('error', 'Could not load blockchain'))
      .finally(() => setLoading(false))
  }, [])

  const searchTx = async () => {
    if (!searchId.trim()) return
    setSearching(true)
    setSearchResult(null)
    try {
      const res = await api.get<any>(`/blockchain/tx/${searchId.trim()}/`)
      setSearchResult(res)
    } catch (e) {
      addToast?.('error', 'Transaction not found', extractError(e))
    } finally { setSearching(false) }
  }

  if (loading) return <LoadingPage />
  if (!data) return <EmptyState icon="!" title="Could not load blockchain data" />

  return (
    <div className="animate-in">
      <SectionHeader
        title="Blockchain Explorer"
        subtitle="Immutable ledger of all energy transactions"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge variant={data.is_valid ? 'green' : 'red'}>
              {data.is_valid ? 'Chain Valid' : 'Chain Invalid'}
            </Badge>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {data.total_blocks} blocks
            </span>
          </div>
        }
      />

      {/* Chain stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Card>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Total Blocks</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: 'var(--accent)' }}>{data.total_blocks}</p>
        </Card>
        <Card>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Total Transactions</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: 'var(--blue-light)' }}>
            {data.blocks.reduce((sum, b) => sum + b.transaction_count, 0)}
          </p>
        </Card>
        <Card>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Chain Integrity</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 600, color: data.is_valid ? 'var(--accent)' : 'var(--red)' }}>
            {data.is_valid ? 'Valid' : 'Error'}
          </p>
        </Card>
      </div>

      {/* TX Search */}
      <Card style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Search Transaction</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            placeholder="Transaction ID..."
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchTx()}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '9px 14px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            onClick={searchTx}
            disabled={searching}
            style={{
              padding: '9px 20px',
              background: 'var(--accent)',
              color: 'var(--accent-text)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: 500,
              opacity: searching ? 0.6 : 1,
            }}
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>

        {searchResult && (
          <div style={{ marginTop: '16px', padding: '14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
              Found in: {searchResult.found_in}
            </p>
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              overflow: 'auto',
              maxHeight: '200px',
              lineHeight: 1.6,
            }}>
              {JSON.stringify(searchResult.transaction || searchResult, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      {/* Blocks */}
      {data.blocks.length === 0 ? (
        <EmptyState icon="~" title="No blocks yet" description="Blocks appear as energy transactions occur" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.blocks.map(block => (
            <Card
              key={block.index}
              onClick={() => setExpanded(expanded === block.index ? null : block.index)}
              style={{
                borderLeft: `3px solid var(--accent)`,
                cursor: 'pointer',
                padding: '16px 20px',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
                    #{block.index}
                  </span>
                  <Badge variant="green">{block.transaction_count} tx</Badge>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>hash: <HashDisplay hash={block.block_hash} /></span>
                  <span>nonce: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{block.nonce}</span></span>
                  <span>{new Date(block.timestamp * 1000).toLocaleString()}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>{expanded === block.index ? '-' : '+'}</span>
                </div>
              </div>

              {expanded === block.index && (
                <div style={{ marginTop: '16px' }} onClick={e => e.stopPropagation()}>
                  <Divider style={{ marginBottom: '14px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Full hash: </span>
                      <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{block.block_hash}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Prev hash: </span>
                      <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{block.previous_hash}</span>
                    </div>
                  </div>

                  {block.transactions_data?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Transactions</p>
                      {block.transactions_data.map((tx: any, i) => (
                        <div key={i} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>
                              {(tx.tx_type || '').toUpperCase()} - {tx.energy_amount} kWh
                            </span>
                            <Badge variant={tx.tx_type === 'mint' ? 'green' : 'blue'}>{tx.status || 'confirmed'}</Badge>
                          </div>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            id: {tx.transaction_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
