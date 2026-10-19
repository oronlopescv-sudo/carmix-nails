"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { parseForm, customerAdminSchema } from "@/lib/validators";
import { normalizePhone } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/types/actions";

export async function updateCustomerAction(input: unknown): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const parsed = parseForm(customerAdminSchema, input);
  if (!parsed.ok) return { ok: false, error: "Verifique os dados.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;
  try {
    await db.customer.update({
      where: { id: data.id },
      data: {
        name: data.name,
        phone: normalizePhone(data.phone) || data.phone,
        email: data.email,
        notes: data.notes,
      },
    });
    await logAudit({ userId: user.id, action: "customer.update", entity: "customer", entityId: data.id });
    return { ok: true };
  } catch (err) {
    console.error("[carmix] updateCustomer:", err);
    return { ok: false, error: "Não foi possível guardar os dados do cliente." };
  }
}

// Eliminar/despersonalizar (RGPD). Mantém as marcações (registos) mas remove
// os dados pessoais do cliente.
export async function anonymizeCustomerAction(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };
  const customer = await db.customer.findUnique({
    where: { id },
    include: { _count: { select: { appointments: true } } },
  });
  if (!customer) return { ok: false, error: "Cliente inexistente." };

  if (customer._count.appointments === 0) {
    await db.customer.delete({ where: { id } });
    await logAudit({ userId: user.id, action: "customer.delete", entity: "customer", entityId: id });
    return { ok: true, deleted: true } as ActionResult;
  }

  await db.customer.update({
    where: { id },
    data: {
      name: "Cliente (dados removidos)",
      phone: `removido-${id.slice(0, 8)}`,
      email: null,
      notes: null,
      consentAt: null,
    },
  });
  await logAudit({ userId: user.id, action: "customer.anonymize", entity: "customer", entityId: id });
  return { ok: true, anonymized: true } as ActionResult;
}