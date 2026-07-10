"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LogOut,
  Menu,
  MessageCircle,
  PlusCircle,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MobileMenu } from "@/components/navigation/MobileMenu";
import { ROUTES } from "@/lib/constants/routes";

export function Navbar({
  userEmail,
  onLogout,
}: {
  userEmail?: string | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <BookOpen className="size-6 text-primary" />
          <span>ReadHub</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.home}>Inicio</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.upload}>
              <PlusCircle />
              Cargar artículo
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.assistant}>
              <MessageCircle />
              Asistente
            </Link>
          </Button>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <span className="max-w-[10rem] truncate text-sm text-muted-foreground lg:max-w-[14rem]">
            {userEmail}
          </span>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut />
            Cerrar sesión
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          {menuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {menuOpen && (
        <MobileMenu
          userEmail={userEmail ?? undefined}
          onNavigate={() => setMenuOpen(false)}
          onLogout={onLogout}
        />
      )}
    </header>
  );
}
