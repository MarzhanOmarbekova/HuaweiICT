"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredUser, User, api, Balance, clearAuthData } from "@/lib/api";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AuthPage } from "./AuthPage";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { useToast } from "@/hooks/useToast";

// const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
//   '/dashboard': { title: 'Dashboard', subtitle: 'overview' },
//   '/marketplace': { title: 'Marketplace', subtitle: 'buy energy from producers' },
//   '/offers': { title: 'My Offers', subtitle: 'manage your listings' },
//   '/devices': { title: 'Devices', subtitle: 'renewable energy sources' },
//   '/wind': { title: 'Wind AI', subtitle: 'CNN-powered turbine placement' },
//   '/transactions': { title: 'Transactions', subtitle: 'all blockchain records' },
//   '/blockchain': { title: 'Blockchain', subtitle: 'immutable ledger' },
//   '/profile': { title: 'Profile', subtitle: 'account settings' },
// }

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    setUser(getStoredUser());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (user) {
      api
        .get<Balance>("/balance/")
        .then(setBalance)
        .catch(() => {});
    }
  }, [user, pathname]);

  if (!hydrated) return null;

  if (!user) {
    return (
      <>
        <AuthPage onLogin={(u) => setUser(u)} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // const pageInfo = PAGE_TITLES[pathname] || { title: 'VoltAI', subtitle: '' }

  const handleLogout = () => {
    clearAuthData();
    setUser(null);
    setBalance(null);
  };

  return (
    <div className="app-layout">
      <Sidebar username={user.username} />
      <div className="main-content">
        <Topbar balance={balance} />
        <main className="page-container">
          {/* Inject toast/logout helpers via context would be ideal;
              here we clone children with props for simplicity */}
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                addToast,
                user,
                onLogout: handleLogout,
              });
            }
            return child;
          })}
        </main>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
