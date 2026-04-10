"use client";

import React from "react";
import { Balance } from "@/lib/api";

interface TopbarProps {
  title?: string;
  subtitle?: string;
  balance?: Balance | null;
}

export function Topbar({ title, subtitle, balance }: TopbarProps) {
  return (
    <header
      style={{
        height: "var(--topbar-h)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {balance && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "7px 16px",
          }}
        >
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Credits:{" "}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              {(balance.available_credits || 0).toFixed(2)}
            </span>
            <span
              style={{
                color: "var(--text-muted)",
                marginLeft: "3px",
                fontSize: "11px",
              }}
            >
              kWh
            </span>
          </span>
          <span style={{ width: 1, height: 14, background: "var(--border)" }} />
          <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Coins:{" "}
            <span
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--amber)",
                fontWeight: 600,
              }}
            >
              {(balance.coin_balance || 0).toFixed(2)}
            </span>
          </span>
        </div>
      )}
    </header>
  );
}
