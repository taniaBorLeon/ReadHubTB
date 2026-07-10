import type { ReactNode } from "react";

import { Navbar } from "@/components/navigation/Navbar";

export function DashboardShell({
  userEmail,
  onLogout,
  children,
}: {
  userEmail?: string | null;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar userEmail={userEmail} onLogout={onLogout} />
      <main className="container py-8">{children}</main>
    </div>
  );
}
