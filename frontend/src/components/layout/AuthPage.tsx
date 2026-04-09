"use client";

import React, { useState } from "react";
import { api, setAuthData, User } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { extractError } from "@/hooks/useToast";

interface AuthPageProps {
  onLogin: (user: User) => void;
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
      {/* Background decoration */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(0,214,143,0.06) 0%, transparent 70%)",
          top: "-100px",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-xl)",
          padding: "44px",
          width: "420px",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeIn 0.3s ease",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              background: "var(--accent)",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "26px",
              color: "var(--accent-text)",
              margin: "0 auto 12px",
            }}
          >
            V
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "24px",
              letterSpacing: "-0.02em",
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
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
            <div
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
            </div>
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
        </div>
      </div>
    </div>
  );
}
