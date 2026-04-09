'use client'

import React, { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/api'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const user = getStoredUser()
    if (user) router.replace('/dashboard')
  }, [router])

  if (!mounted) return null

  return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        overflow: 'hidden',
      }}>

        {/* NAV */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          background: 'var(--bg-base)',
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px',
              background: 'var(--accent)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '18px',
              color: 'var(--accent-text)',
            }}>V</div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px' }}>VoltAI</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
                href="/dashboard"
                onClick={e => { e.preventDefault(); router.push('/dashboard') }}
                style={{
                  padding: '9px 20px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              Sign in
            </a>
            <a
                href="/dashboard"
                onClick={e => { e.preventDefault(); router.push('/dashboard') }}
                style={{
                  padding: '9px 20px',
                  background: 'var(--accent)',
                  color: 'var(--accent-text)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
            >
              Get started
            </a>
          </div>
        </nav>

        {/* HERO */}
        <section style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '100px 48px 80px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* glow bg */}
          <div style={{
            position: 'absolute',
            width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(0,214,143,0.07) 0%, transparent 70%)',
            top: '0', left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--accent-dim)',
            border: '1px solid rgba(0,214,143,0.25)',
            borderRadius: '20px',
            padding: '6px 16px',
            marginBottom: '32px',
            fontSize: '12px',
            color: 'var(--accent)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />
            POWERED BY HUAWEI CLOUD · MINDSPORE CNN
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '58px',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, var(--text-primary) 40%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            AI-powered<br />wind energy platform
          </h1>

          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: '620px',
            margin: '0 auto 44px',
          }}>
            Optimize turbine placement with MindSpore CNN, trade renewable energy peer-to-peer, and record every transaction on an immutable blockchain — all in one platform.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
                href="/dashboard"
                onClick={e => { e.preventDefault(); router.push('/dashboard') }}
                style={{
                  padding: '14px 32px',
                  background: 'var(--accent)',
                  color: 'var(--accent-text)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
            >
              Launch platform →
            </a>
            <a
                href="#features"
                style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
            >
              See features
            </a>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '48px',
            marginTop: '72px',
            flexWrap: 'wrap',
          }}>
            {[
              { val: '5×5', label: 'CNN grid points' },
              { val: 'SHA-256', label: 'Proof-of-Work chain' },
              { val: 'P2P', label: 'Energy trading' },
              { val: 'Real-time', label: 'Wind data · Open-Meteo' },
            ].map(s => (
                <div key={s.val} style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '22px',
                    fontWeight: 600,
                    color: 'var(--accent)',
                    marginBottom: '4px',
                  }}>{s.val}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '80px 48px',
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
          }}>Platform features</p>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '56px',
            letterSpacing: '-0.02em',
          }}>Everything for wind energy optimization</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {[
              {
                icon: '⚡',
                title: 'AI turbine placement',
                desc: 'MindSpore CNN analyzes 5×5 grid of real wind data from Open-Meteo and recommends optimal turbine coordinates.',
                color: 'var(--accent)',
                dim: 'var(--accent-dim)',
              },
              {
                icon: '🔗',
                title: 'Blockchain ledger',
                desc: 'Every energy mint and trade is recorded on a SHA-256 Proof-of-Work chain, mirrored to PostgreSQL, optionally anchored to Huawei BCS.',
                color: 'var(--violet)',
                dim: 'var(--violet-dim)',
              },
              {
                icon: '⚖',
                title: 'P2P energy trading',
                desc: 'Producers list kWh on the marketplace. Buyers purchase via smart contract with automatic VoltCoin deduction and credit transfer.',
                color: 'var(--blue-light)',
                dim: 'var(--blue-dim)',
              },
              {
                icon: '📈',
                title: 'Energy forecasting',
                desc: 'Physics-based formula (P = ½ρAV³·Cp·η) predicts production for 1, 3, 6 and 12 months per turbine position.',
                color: 'var(--amber)',
                dim: 'var(--amber-dim)',
              },
              {
                icon: '🗺',
                title: 'Interactive map',
                desc: 'Draw a 4-point selection on Google Maps to define your area. Optimal turbine pins appear on the map after CNN inference.',
                color: 'var(--accent)',
                dim: 'var(--accent-dim)',
              },
              {
                icon: '🔒',
                title: 'JWT authentication',
                desc: 'Secure login with 1-hour access tokens and 7-day refresh tokens. Session auto-renews without interrupting the user.',
                color: 'var(--red)',
                dim: 'var(--red-dim)',
              },
            ].map(f => (
                <div
                    key={f.title}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '28px',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = f.color
                      e.currentTarget.style.boxShadow = `0 0 20px ${f.dim}`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                >
                  <div style={{
                    width: '44px', height: '44px',
                    background: f.dim,
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                    marginBottom: '18px',
                  }}>{f.icon}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '16px',
                    fontWeight: 700,
                    marginBottom: '10px',
                  }}>{f.title}</h3>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                  }}>{f.desc}</p>
                </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '40px 48px 80px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '48px',
            letterSpacing: '-0.02em',
          }}>Two paths, one platform</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[
              {
                role: 'Energy producer',
                steps: [
                  'Register your wind turbine or solar device',
                  'Record energy production → credits minted on blockchain',
                  'List kWh on the marketplace with your price',
                  'Earn VoltCoins when buyers purchase your energy',
                ],
                color: 'var(--accent)',
                dim: 'var(--accent-dim)',
                border: 'rgba(0,214,143,0.2)',
              },
              {
                role: 'Energy buyer',
                steps: [
                  'Browse the marketplace for available energy',
                  'Select an offer and confirm the quantity',
                  'Smart contract executes — credits transferred instantly',
                  'Track all purchases in the blockchain explorer',
                ],
                color: 'var(--blue-light)',
                dim: 'var(--blue-dim)',
                border: 'rgba(59,130,246,0.2)',
              },
            ].map(card => (
                <div key={card.role} style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${card.border}`,
                  borderRadius: '16px',
                  padding: '32px',
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: card.color,
                    marginBottom: '24px',
                  }}>{card.role}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {card.steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '22px', height: '22px',
                            borderRadius: '50%',
                            background: card.dim,
                            color: card.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>{i + 1}</div>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</p>
                        </div>
                    ))}
                  </div>
                </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--border)',
          padding: '80px 48px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '16px',
            letterSpacing: '-0.02em',
          }}>Ready to harness wind energy?</h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            marginBottom: '36px',
          }}>
            Create an account and run your first AI optimization in minutes.
          </p>
          <a
              href="/dashboard"
              onClick={e => { e.preventDefault(); router.push('/dashboard') }}
              style={{
                padding: '14px 36px',
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 700,
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'inline-block',
              }}
          >
            Start for free →
          </a>
        </section>

        {/* FOOTER */}
        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span>VoltAI · Huawei Cloud · MindSpore · Hyperledger Fabric</span>
          <span>Wind optimization + P2P trading</span>
        </footer>
      </div>
  )
}
