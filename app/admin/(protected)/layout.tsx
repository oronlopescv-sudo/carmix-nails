// Casca do painel protegido: guarda de sessão + navegação lateral.
// As páginas em app/admin/(protected)/ partilham este layout.

import Link from "next/link";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  UserRound,
  CalendarClock,
  Images,
  MessageSquareHeart,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/agendamentos", label: "Agendamentos", icon: CalendarDays },
  { href: "/admin/servicos", label: "Serviços", icon: Scissors },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/profissionais", label: "Profissionais", icon: UserRound },
  { href: "/admin/horarios", label: "Horários", icon: CalendarClock },
  { href: "/admin/galeria", label: "Galeria", icon: Images },
  { href: "/admin/testemunhos", label: "Testemunhos", icon: MessageSquareHeart },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const s = await getSettings();

  return (
    <div className="min-h-dvh bg-casca">
      {/* barra superior (móvel) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-nude bg-creme px-4 lg:hidden">
        <Link href="/admin" className="font-display text-[17px] text-bordo">{s.brandName}</Link>
        <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Navegação do painel">
          {NAV.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              className="grid h-9 w-9 place-items-center rounded-lg text-tinta-soft transition hover:bg-nude hover:text-bordo"
            >
              <Icon className="h-4.5 w-4.5" />
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* lateral (desktop) */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-nude bg-creme p-5 lg:flex">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-bordo text-creme shadow-sm ring-2 ring-dourado/40">
              <span className="font-display text-sm font-semibold">CN</span>
            </span>
            <span>
              <span className="block font-display text-[15.5px] font-semibold text-bordo">{s.brandName}</span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-malva">Painel</span>
            </span>
          </Link>

          <nav className="mt-8 flex flex-col gap-0.5" aria-label="Navegação do painel">
            {NAV.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] text-tinta-soft transition hover:bg-nude hover:text-bordo"
              >
                <Icon className="h-4.5 w-4.5" /> {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3 text-[13px]">
            <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-tinta-soft hover:text-malva">
              <ExternalLink className="h-4 w-4" /> Ver site público
            </a>
            <p className="text-tinta-soft">
              Olá, <span className="font-medium text-tinta">{user.name}</span>
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-nude px-3.5 py-2 text-tinta-soft transition hover:border-rose-300 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}