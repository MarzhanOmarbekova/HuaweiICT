"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { api, setAuthData, User } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { extractError } from "@/hooks/useToast";

interface AuthPageProps {
  onLogin: (user: User) => void;
}

const FLOATING_WINDS = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: 20 + Math.random() * 28,
  duration: 4 + Math.random() * 4,
  delay: Math.random() * 5,
  yRange: -(20 + Math.random() * 40),
  opacity: 0.15 + Math.random() * 0.25,
}));

// Wind icon as raw SVG — 3 green lines, no background box
function WindIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      let data: any;
      if (tab === "login") {
        data = await api.post<any>("/auth/login/", {
          email: form.email,
          password: form.password,
        });
      } else {
        data = await api.post<any>("/auth/register/", {
          username: form.username,
          email: form.email,
          password: form.password,
        });
      }
      setAuthData(data.tokens, data.user);
      onLogin(data.user);
    } catch (e) {
      setError(extractError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Floating wind icons — just the 3 green lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {FLOATING_WINDS.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: "absolute",
              left: p.left,
              top: p.top,
              opacity: p.opacity,
            }}
            animate={{
              y: [0, p.yRange, 0],
              opacity: [p.opacity, p.opacity + 0.2, p.opacity],
              x: [0, 8, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          >
            <WindIcon size={p.size} color="#10b981" />
          </motion.div>
        ))}
      </div>

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: "700px",
          height: "700px",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          top: "-150px",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          padding: "44px",
          width: "420px",
          boxShadow: "var(--shadow-lg)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            style={{
              width: "52px",
              height: "52px",
              background: "var(--accent)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              cursor: "default",
            }}
          >
            <WindIcon size={26} color="white" />
          </motion.div>
          <h1
            style={{
              fontSize: "30px",
              fontFamily: "monospace",
              marginBottom: "0.5rem",
            }}
          >
            VoltAI
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginTop: "4px",
            }}
          >
            Intelligent Energy Trading Platform
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-card)",
            borderRadius: "var(--radius)",
            padding: "3px",
            marginBottom: "24px",
            gap: "2px",
          }}
        >
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "calc(var(--radius) - 2px)",
                border: "none",
                background: tab === t ? "var(--bg-surface)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-muted)",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "var(--font-body)",
                fontWeight: tab === t ? 500 : 400,
                transition: "all 0.15s",
                boxShadow: tab === t ? "var(--shadow-sm)" : "none",
              }}
            >
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Form */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: tab === "login" ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          {tab === "register" && (
            <Input
              label="Username"
              placeholder="voltauser"
              value={form.username}
              onChange={(e) =>
                setForm((p) => ({ ...p, username: e.target.value }))
              }
              autoComplete="username"
            />
          )}
          <Input
            label="Email"
            type="email"
            placeholder="user@voltai.com"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="min 8 characters"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "var(--red-dim)",
                border: "1px solid var(--red)",
                borderRadius: "var(--radius)",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--red)",
              }}
            >
              {error}
            </motion.div>
          )}

          <Button
            variant="primary"
            size="lg"
            loading={loading}
            onClick={handleSubmit}
            style={{
              color: "white",
              fontFamily: "var(--font-mono)",
              background: "var(--accent)",
              width: "100%",
              padding: "12px 0",
              fontSize: "16px",
              fontWeight: 600,
              borderRadius: "8px",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
          >
            {tab === "login" ? "Sign In" : "Create Account"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
