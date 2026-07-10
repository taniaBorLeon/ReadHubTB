"use client";

import Link from "next/link";
import { LogOut, MessageCircle, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants/routes";

export function MobileMenu({
  userEmail,
  onNavigate,
  onLogout,
}: {
  userEmail: string | undefined;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="border-b border-border bg-background md:hidden">
      <nav className="container flex flex-col gap-1 py-3">
        <Button
          variant="ghost"
          className="justify-start"
          asChild
          onClick={onNavigate}
        >
          <Link href={ROUTES.home}>Inicio</Link>
        </Button>
        <Button
          variant="ghost"
          className="justify-start"
          asChild
          onClick={onNavigate}
        >
          <Link href={ROUTES.upload}>
            <PlusCircle />
            Cargar artículo
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="justify-start"
          asChild
          onClick={onNavigate}
        >
          <Link href={ROUTES.assistant}>
            <MessageCircle />
            Asistente
          </Link>
        </Button>

        <Separator className="my-2" />

        {userEmail && (
          <p className="truncate px-3 py-1 text-sm text-muted-foreground">
            {userEmail}
          </p>
        )}
        <Button
          variant="outline"
          className="justify-start"
          onClick={() => {
            onNavigate();
            onLogout();
          }}
        >
          <LogOut />
          Cerrar sesión
        </Button>
      </nav>
    </div>
  );
}
