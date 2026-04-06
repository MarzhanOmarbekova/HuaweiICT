'use client'

import React, { useEffect, useState } from 'react'
import { api, Transaction } from '@/lib/api'
import { Badge, Card, LoadingPage, EmptyState, SectionHeader } from '@/components/ui'
import { ToastType } from '@/hooks/useToast'

interface PageProps {
  addToast?: (type: ToastType, title: string, msg?: string) => void
}

export default function TransactionsPage({ addToast }: PageProps) {
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ results: Transaction[] }>('/transactions/')
      .then(r => setTxs(r.results || []))
      .catch(() => addToast?.('error', 'Could not load transactions'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingPage />

  return (
    <div className="animate-in">
      <SectionHeader title="Transactions" subtitle="All energy transactions recorded on blockchain" />

      <Card>
        {txs.length === 0 ? (
          <EmptyState icon="~" title="No transactions yet" description="Transactions appear here after trading or minting energy" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Type', 'Amount', 'Price', 'Total', 'Counterparty', 'Block', 'Hash', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.map(tx => (
                  <tr key={tx.id}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                    style={{ transition: 'background 0.1s' }}>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <Badge variant={tx.tx_type === 'mint' ? 'green' : 'blue'}>
                        {tx.tx_type === 'mint' ? 'Mint' : 'Trade'}
                      </Badge>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{tx.energy_amount?.toFixed(2)} kWh</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{tx.price_per_kwh?.toFixed(4)}</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--amber)' }}>{tx.total_price?.toFixed(4)}</span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {tx.seller?.username || tx.buyer?.username || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      {tx.blockchain_block_index != null ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)' }}>#{tx.blockchain_block_index}</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>
                        {tx.contract_hash ? `${tx.contract_hash.slice(0, 10)}...` : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </span>
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
