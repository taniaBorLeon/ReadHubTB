import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReadHub",
  description: "Plataforma de publicación y lectura de artículos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
