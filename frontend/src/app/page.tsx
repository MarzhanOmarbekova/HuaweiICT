"use client";

import React, { useEffect, useRef, useState } from "react";
import { getStoredUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Wind } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Keyframe definitions — injected once via <style> at root level.
   Keeping them here (not inside <nav>) is valid HTML.
───────────────────────────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes navSlide {
    from { opacity: 0; transform: translateY(-14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes heroBadge {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes heroTitle {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes heroSub {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes heroBtns {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes statPop {
    from { opacity: 0; transform: scale(0.82) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Scroll-reveal hook
   - options param removed (was never used at call sites, and caused
     a missing-deps ESLint warning with the empty [] dep array)
───────────────────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []); // stable — no external deps

  return { ref, visible };
}

/* ─────────────────────────────────────────────────────────────────
   Animated wrapper components
───────────────────────────────────────────────────────────────── */
interface FadeProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
}

function FadeUp({ children, delay = 0, y = 28, style }: FadeProps) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : `translateY(${y}px)`,
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FadeIn({ children, delay = 0, style }: FadeProps) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity 0.6s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getStoredUser();
    if (user) router.replace("/dashboard");
  }, [router]);

  if (!mounted) return null;

  return (
    <>
      {/* FIX: <style> must not live inside <nav>. Injected here at fragment root. */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-body)",
          // FIX: was overflow:"hidden" which breaks position:sticky on the nav.
          // Only clip the horizontal axis.
          overflowX: "hidden",
        }}
      >
        {/* ── NAV ── */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 48px",
            borderBottom: "1px solid var(--border)",
            position: "sticky",
            top: 0,
            background: "var(--bg-base)",
            zIndex: 100,
            animation: "navSlide 0.5s ease both",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* FIX: removed stray fontWeight/fontFamily from this wrapper div;
                those props do nothing on a div that only contains an SVG icon. */}
            <div
              style={{
                width: "34px",
                height: "34px",
                background: "var(--accent)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* FIX: pass explicit size to Wind so it doesn't inherit container font-size */}
              <Wind size={18} color="white" />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "18px",
              }}
            >
              VoltAI
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                router.push("/dashboard");
              }}
              style={{
                padding: "9px 20px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer",
                // FIX: was "all 0.15s" — too broad, only transition what changes
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              Sign in
            </a>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                router.push("/dashboard");
              }}
              style={{
                padding: "9px 20px",
                background: "var(--accent)",
                color: "var(--accent-text)",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              Get started
            </a>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "100px 48px 80px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* ambient glow — decorative only */}
          <div
            style={{
              position: "absolute",
              width: "600px",
              height: "600px",
              background:
                "radial-gradient(circle, rgba(0,214,143,0.07) 0%, transparent 70%)",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          />

          {/* badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--accent-dim)",
              border: "1px solid rgba(0,214,143,0.25)",
              borderRadius: "20px",
              padding: "6px 16px",
              marginBottom: "32px",
              fontSize: "12px",
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              animation: "heroBadge 0.55s ease 0.1s both",
            }}
          >
            {/* FIX: added flexShrink:0 so dot never collapses */}
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--accent)",
                flexShrink: 0,
              }}
            />
            POWERED BY HUAWEI CLOUD · MINDSPORE CNN
          </div>

          {/* title */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "58px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "24px",
              background:
                "linear-gradient(135deg, var(--text-primary) 40%, var(--accent) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "heroTitle 0.65s ease 0.25s both",
            }}
          >
            AI-powered
            <br />
            wind energy platform
          </h1>

          {/* subtitle */}
          <p
            style={{
              fontSize: "18px",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              maxWidth: "620px",
              margin: "0 auto 44px",
              animation: "heroSub 0.6s ease 0.4s both",
            }}
          >
            Optimize turbine placement with MindSpore CNN, trade renewable
            energy peer-to-peer, and record every transaction on an immutable
            blockchain — all in one platform.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: "flex",
              gap: "14px",
              justifyContent: "center",
              flexWrap: "wrap",
              animation: "heroBtns 0.55s ease 0.55s both",
            }}
          >
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                router.push("/dashboard");
              }}
              style={{
                padding: "14px 32px",
                background: "var(--accent)",
                color: "var(--accent-text)",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 700,
                textDecoration: "none",
                cursor: "pointer",
                letterSpacing: "-0.01em",
              }}
            >
              Launch platform →
            </a>
            <a
              href="#features"
              style={{
                padding: "14px 32px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 500,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              See features
            </a>
          </div>

          {/* stat pills */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "48px",
              marginTop: "72px",
              flexWrap: "wrap",
            }}
          >
            {[
              { val: "5×5", label: "CNN grid points" },
              { val: "SHA-256", label: "Proof-of-Work chain" },
              { val: "P2P", label: "Energy trading" },
              { val: "Real-time", label: "Wind data · Open-Meteo" },
            ].map((s, i) => (
              <div
                key={s.val}
                style={{
                  textAlign: "center",
                  animation: `statPop 0.5s ease ${0.7 + i * 0.1}s both`,
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "22px",
                    fontWeight: 600,
                    color: "var(--accent)",
                    marginBottom: "4px",
                  }}
                >
                  {s.val}
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding: "80px 48px",
          }}
        >
          <FadeUp>
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
                textAlign: "center",
                marginBottom: "12px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Platform features
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "36px",
                fontWeight: 700,
                textAlign: "center",
                marginBottom: "56px",
                letterSpacing: "-0.02em",
              }}
            >
              Everything for wind energy optimization
            </h2>
          </FadeUp>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {[
              {
                icon: "⚡",
                title: "AI turbine placement",
                desc: "MindSpore CNN analyzes 5×5 grid of real wind data from Open-Meteo and recommends optimal turbine coordinates.",
                color: "var(--accent)",
                dim: "var(--accent-dim)",
              },
              {
                icon: "🔗",
                title: "Blockchain ledger",
                desc: "Every energy mint and trade is recorded on a SHA-256 Proof-of-Work chain, mirrored to PostgreSQL, optionally anchored to Huawei BCS.",
                color: "var(--violet)",
                dim: "var(--violet-dim)",
              },
              {
                icon: "⚖️",
                title: "P2P energy trading",
                desc: "Producers list kWh on the marketplace. Buyers purchase via smart contract with automatic VoltCoin deduction and credit transfer.",
                color: "var(--blue-light)",
                dim: "var(--blue-dim)",
              },
              {
                icon: "📈",
                title: "Energy forecasting",
                desc: "Physics-based formula (P = ½ρAV³·Cp·η) predicts production for 1, 3, 6 and 12 months per turbine position.",
                color: "var(--amber)",
                dim: "var(--amber-dim)",
              },
              {
                icon: "🗺️",
                title: "Interactive map",
                desc: "Draw a 4-point selection on Google Maps to define your area. Optimal turbine pins appear on the map after CNN inference.",
                color: "var(--accent)",
                dim: "var(--accent-dim)",
              },
              {
                icon: "🔒",
                title: "JWT authentication",
                desc: "Secure login with 1-hour access tokens and 7-day refresh tokens. Session auto-renews without interrupting the user.",
                color: "var(--red)",
                dim: "var(--red-dim)",
              },
            ].map((f, i) => (
              <FadeUp key={f.title} delay={i * 70} y={24}>
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "28px",
                    height: "100%",
                    // FIX: added boxSizing so height:100% + padding don't overflow grid cell
                    boxSizing: "border-box",
                    transition:
                      "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = f.color;
                    e.currentTarget.style.boxShadow = `0 0 20px ${f.dim}`;
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background: f.dim,
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      marginBottom: "18px",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      fontWeight: 700,
                      marginBottom: "10px",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.65,
                      // FIX: reset browser default paragraph margin
                      margin: 0,
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "40px 48px 80px",
          }}
        >
          <FadeUp>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "32px",
                fontWeight: 700,
                textAlign: "center",
                marginBottom: "48px",
                letterSpacing: "-0.02em",
              }}
            >
              Two paths, one platform
            </h2>
          </FadeUp>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            {[
              {
                role: "Energy producer",
                steps: [
                  "Register your wind turbine or solar device",
                  "Record energy production → credits minted on blockchain",
                  "List kWh on the marketplace with your price",
                  "Earn VoltCoins when buyers purchase your energy",
                ],
                color: "var(--accent)",
                dim: "var(--accent-dim)",
                border: "rgba(0,214,143,0.2)",
                delay: 0,
              },
              {
                role: "Energy buyer",
                steps: [
                  "Browse the marketplace for available energy",
                  "Select an offer and confirm the quantity",
                  "Smart contract executes — credits transferred instantly",
                  "Track all purchases in the blockchain explorer",
                ],
                color: "var(--blue-light)",
                dim: "var(--blue-dim)",
                border: "rgba(59,130,246,0.2)",
                delay: 120,
              },
            ].map((card) => (
              <FadeUp key={card.role} delay={card.delay} y={20}>
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${card.border}`,
                    borderRadius: "16px",
                    padding: "32px",
                    height: "100%",
                    // FIX: added boxSizing so height:100% + padding don't overflow
                    boxSizing: "border-box",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "18px",
                      fontWeight: 700,
                      color: card.color,
                      marginBottom: "24px",
                    }}
                  >
                    {card.role}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    {card.steps.map((step, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: card.dim,
                            color: card.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </div>
                        <p
                          style={{
                            fontSize: "14px",
                            color: "var(--text-secondary)",
                            lineHeight: 1.5,
                            // FIX: reset browser default paragraph margin
                            margin: 0,
                          }}
                        >
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          style={{
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--border)",
            padding: "80px 48px",
            textAlign: "center",
          }}
        >
          <FadeUp y={20}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "36px",
                fontWeight: 700,
                marginBottom: "16px",
                letterSpacing: "-0.02em",
              }}
            >
              Ready to harness wind energy?
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                marginBottom: "36px",
              }}
            >
              Create an account and run your first AI optimization in minutes.
            </p>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                router.push("/dashboard");
              }}
              style={{
                padding: "14px 36px",
                background: "var(--accent)",
                color: "var(--accent-text)",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: 700,
                textDecoration: "none",
                cursor: "pointer",
                display: "inline-block",
                transition: "transform 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.03)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              Start for free →
            </a>
          </FadeUp>
        </section>

        {/* ── FOOTER ── */}
        <FadeIn>
          <footer
            style={{
              borderTop: "1px solid var(--border)",
              padding: "24px 48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>VoltAI · Huawei Cloud · MindSpore · Hyperledger Fabric</span>
            <span>Wind optimization + P2P trading</span>
          </footer>
        </FadeIn>
      </div>
    </>
  );
}
