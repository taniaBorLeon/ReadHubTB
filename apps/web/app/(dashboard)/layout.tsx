"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ROUTES } from "@/lib/constants/routes";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    const success = await logout();
    if (success) {
      router.push(`${ROUTES.login}?loggedOut=1`);
      router.refresh();
    }
  }

  return (
    <DashboardShell userEmail={user?.email} onLogout={handleLogout}>
      {children}
    </DashboardShell>
  );
}
