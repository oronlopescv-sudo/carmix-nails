// Horários gerais: encerramentos do estúdio + vista resumida dos horários da equipa.

import { db } from "@/lib/db";
import StudioHorarios from "@/components/admin/StudioHorarios";
import type { ProFull } from "@/components/admin/ProfissionaisManager";

export default async function HorariosPage() {
  const [blocked, pros, availability] = await Promise.all([
    db.blockedPeriod.findMany({ where: { professionalId: null }, orderBy: [{ startDate: "asc" }] }),
    db.professional.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.availability.findMany(),
  ]);

  const studioBlocked: Array<ProFull["blocked"][number]> = blocked.map((b) => ({
    id: b.id,
    type: b.type,
    startDateISO: toISO(b.startDate),
    endDateISO: toISO(b.endDate),
    startMinute: b.startMinute,
    endMinute: b.endMinute,
    reason: b.reason,
  }));

  const prosWithWindows = pros.map((p) => ({
    name: p.name,
    windows: availability
      .filter((a) => a.professionalId === p.id)
      .map((a) => ({ weekday: a.weekday, startMinute: a.startMinute, endMinute: a.endMinute, isActive: a.isActive })),
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Horários</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">
        Encerramentos que valem para toda a equipa. As janelas individuais de cada profissional editam-se em Profissionais → Horários.
      </p>
      <div className="mt-6">
        <StudioHorarios blocked={studioBlocked} professionals={prosWithWindows} />
      </div>
    </div>
  );
}

function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}