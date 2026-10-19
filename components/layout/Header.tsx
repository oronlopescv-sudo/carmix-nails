"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/sobre", label: "Sobre" },
  { href: "/galeria", label: "Galeria" },
  { href: "/contactos", label: "Contactos" },
];

export default function Header({
  brandName,
  phone,
  whatsApp,
  bookingDisabled,
}: {
  brandName: string;
  phone?: string | null;
  whatsApp?: string | null;
  bookingDisabled?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-nude/80 bg-creme/95 backdrop-blur supports-[backdrop-filter]:bg-creme/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-bordo text-creme shadow-sm ring-2 ring-dourado/40">
            <span className="font-display text-sm font-semibold tracking-wide">CN</span>
          </span>
          <span className="leading-tight">
            <span className="block font-display text-[17px] font-semibold tracking-wide text-tinta">
              {brandName}
            </span>
            <span className="block text-[11px] uppercase tracking-[0.2em] text-malva">
              Estética &amp; Unhas
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-full px-4 py-2 text-[15px] transition-colors",
                isActive(item.href)
                  ? "bg-nude font-medium text-bordo"
                  : "text-tinta-soft hover:bg-casca hover:text-tinta",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!bookingDisabled && (
            <Link
              href="/agendar"
              className="rounded-full bg-bordo px-5 py-2.5 text-[14.5px] font-medium text-creme shadow-sm transition hover:bg-bordo-dark"
            >
              Marcar Agendamento
            </Link>
          )}
          {whatsApp && (
            <a
              href={`https://wa.me/${whatsApp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13.5px] font-medium text-malva hover:text-bordo"
            >
              WhatsApp
            </a>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full text-tinta lg:hidden"
          aria-expanded={open}
          aria-controls="menu-movel"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* menu móvel */}
      <div
        id="menu-movel"
        className={cx(
          "overflow-hidden border-t border-nude bg-creme transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[420px]" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Menu móvel">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cx(
                "rounded-xl px-4 py-3 text-[15px]",
                isActive(item.href)
                  ? "bg-nude font-medium text-bordo"
                  : "text-tinta hover:bg-casca",
              )}
            >
              {item.label}
            </Link>
          ))}
          {!bookingDisabled && (
            <Link
              href="/agendar"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-xl bg-bordo px-4 py-3 text-center text-[15px] font-medium text-creme"
            >
              Marcar Agendamento
            </Link>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="rounded-xl px-4 py-3 text-center text-[14px] text-tinta-soft">
              Ligar: {phone}
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}