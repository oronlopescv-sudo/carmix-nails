// Clientes: base automática criada pelas marcações (RGPD: dados mínimos + direito ao esquecimento).

import { db } from "@/lib/db";
import CustomersManager, { type CustomerRow } from "@/components/admin/CustomersManager";
import { Search } from "lucide-react";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ name: "asc" }],
    take: 300,
    include: {
      _count: { select: { appointments: true } },
      appointments: {
        orderBy: { startAt: "desc" },
        take: 1,
        select: { startAt: true },
      },
    },
  });

  const rows: Array<CustomerRow> = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    count: c._count.appointments,
    lastVisitISO: c.appointments[0]?.startAt.toISOString() ?? null,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-bordo">Clientes</h1>
          <p className="mt-1 text-[14px] text-tinta-soft">{rows.length} cliente(s){q ? ` — filtro: “${q}”` : ""}</p>
        </div>
        <form className="flex w-full max-w-sm items-center gap-2 rounded-xl bg-creme px-3 py-2 ring-1 ring-nude" action="/admin/clientes" method="get">
          <Search className="h-4 w-4 shrink-0 text-tinta-soft" />
          <input name="q" defaultValue={q} placeholder="Procurar por nome, telefone ou e-mail…" className="w-full bg-transparent text-[14px] outline-none placeholder:text-tinta-soft" />
          {q && (
            <a href="/admin/clientes" className="shrink-0 text-[12.5px] text-malva hover:text-bordo">limpar</a>
          )}
        </form>
      </div>
      <div className="mt-6">
        <CustomersManager customers={rows} />
      </div>
    </div>
  );
}