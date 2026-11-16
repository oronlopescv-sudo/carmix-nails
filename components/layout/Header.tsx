"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, Lock, Menu, X } from "lucide-react";
import { cx } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/sobre", label: "Sobre Nós" },
  { href: "/galeria", label: "Galeria" },
  { href: "/#testemunhos", label: "Depoimentos" },
  { href: "/contactos", label: "Contacto" },
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

  // Na home, a barra flutua transparente sobre o herói (desenho do dono:
  // a fotografia passa por baixo). Nas restantes páginas fica fixa e sólida.
  const naHome = pathname === "/";

  const isActive = (href: string) =>
    href === "/#testemunhos"
      ? false
      : href === "/"
        ? pathname === "/"
        : pathname.startsWith(href);

  return (
    <header
      className={cx(
        "z-50 border-b",
        naHome ? "absolute inset-x-0 top-0 border-b-transparent bg-transparent md:hidden" : "sticky top-0 border-casca bg-creme/95 backdrop-blur supports-[backdrop-filter]:bg-creme/90",
      )}
    >
      <div className="mx-auto flex h-[108px] max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className={cx("-my-4 flex shrink-0 items-center", naHome ? "self-start pt-1" : "")}
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/carmix-logo.png"
            alt={brandName}
            width={104}
            height={110}
            priority
            className={cx("w-auto self-start drop-shadow-sm transition-transform group-hover:scale-105", naHome ? "-mt-2 h-[168px]" : "h-[100px]")}
          />
        </Link>

        {/* pílula de vidro com o menu (tal e qual o desenho) */}
        <nav
          className={cx(
            "hidden items-center gap-1 rounded-full px-2 py-1.5 lg:flex",
            naHome ? "bg-creme/55 shadow-sm ring-1 ring-white/40 backdrop-blur" : "",
          )}
          aria-label="Navegação principal"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-full px-4 py-2 font-display text-[15.5px] transition-colors",
                isActive(item.href)
                  ? "bg-malva font-medium text-white shadow-sm"
                  : naHome
                    ? "text-tinta hover:bg-creme/80 hover:text-bordo"
                    : "text-tinta hover:bg-nude hover:text-bordo",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!bookingDisabled ? (
            <Link
              href="/agendar"
              className="inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 font-display text-[14.5px] font-medium text-creme shadow-md shadow-bordo/25 transition hover:bg-bordo-dark"
            >
              <Calendar className="h-4 w-4" /> Marcar Horário
            </Link>
          ) : (
            <span className="rounded-full bg-nude px-5 py-2.5 text-[14px] text-tinta-soft">
              Marcações desativadas
            </span>
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
          <Link
            href="/admin"
            title="Área reservada (admin)"
            aria-label="Área reservada (admin)"
            className="grid h-9 w-9 place-items-center rounded-full text-tinta-soft transition hover:bg-casca hover:text-bordo"
          >
            <Lock className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          className={cx(
            "grid h-10 w-10 place-items-center rounded-full lg:hidden",
            naHome ? "bg-creme/60 text-tinta backdrop-blur" : "text-tinta hover:bg-nude",
          )}
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
          "overflow-hidden border-t border-casca bg-creme transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[560px]" : "max-h-0",
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
                isActive(item.href) ? "bg-malva font-medium text-white" : "text-tinta hover:bg-nude",
              )}
            >
              {item.label}
            </Link>
          ))}
          {!bookingDisabled && (
            <Link
              href="/agendar"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-bordo px-4 py-3 text-center text-[15px] font-medium text-creme"
            >
              <Calendar className="h-4 w-4" /> Marcar Horário
            </Link>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className="rounded-xl px-4 py-3 text-center text-[14px] text-tinta-soft">
              Ligar: {phone}
            </a>
          )}
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] text-tinta-soft hover:bg-nude"
          >
            <Lock className="h-4 w-4" /> Área reservada (admin)
          </Link>
        </nav>
      </div>
    </header>
  );
}
