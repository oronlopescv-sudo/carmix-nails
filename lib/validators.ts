import { z } from "zod";

// Esquemas de validação (Zod) — usados em todas as operações de escrita.
// As mensagens aparecem tal e qual nos formulários.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailField = z
  .string({ message: "E-mail inválido" })
  .trim()
  .max(120)
  .regex(EMAIL_REGEX, "E-mail inválido");
export const emailOptional = z
  .union([emailField, z.literal("")])
  .optional()
  .transform((v) => (v ? v : null));

const phoneField = z
  .string({ message: "Indique o seu telefone" })
  .trim()
  .min(7, "Telefone inválido")
  .max(20, "Telefone inválido")
  .regex(/^[+()0-9\s.-]+$/, "Telefone inválido");

const dateISOField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

const minutesField = z.coerce
  .number({ message: "Hora inválida" })
  .int()
  .min(0, "Hora inválida")
  .max(1439, "Hora inválida");

// ── Público ──────────────────────────────────────────────────────────────────

export const bookingCreateSchema = z.object({
  serviceId: z.string().min(1).max(64),
  professionalId: z.string().min(1).max(64),
  dateISO: dateISOField,
  minutes: minutesField,
  name: z
    .string({ message: "Indique o seu nome" })
    .trim()
    .min(2, "Indique o seu nome")
    .max(80, "Nome demasiado longo"),
  phone: phoneField,
  email: emailOptional,
  notes: z
    .string()
    .trim()
    .max(1000, "Observações demasiado longas")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  consent: z.boolean().refine((v) => v === true, "É necessário aceitar a política de privacidade"),
  // Honeypot: um escondido no formulário; deve chegar vazio
  website: z.string().max(0, "Pedido inválido").optional(),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const customerCancelSchema = z.object({
  reference: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase()),
  email: emailField,
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const customerRescheduleSchema = z.object({
  reference: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase()),
  email: emailField,
  dateISO: dateISOField,
  minutes: minutesField,
});

// ── Admin ────────────────────────────────────────────────────────────────────

const centsField = (label: string) =>
  z.coerce
    .number({ message: `${label} inválido` })
    .int(`${label} inválido`)
    .min(0, `${label} inválido`)
    .max(100_000_000, `${label} demasiado alto`);

export const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome demasiado curto").max(100),
  slug: z
    .string()
    .trim()
    .max(60)
    .regex(/^[a-z0-9-]*$/, "Slug só com letras minúsculas, números e travessões")
    .optional()
    .transform((v) => (v ? v : undefined)),
  description: z.string().trim().max(3000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  categoryId: z.string().max(64).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  priceMin: centsField("Preço"),
  priceMax: z
    .union([centsField("Preço máximo"), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined || v === null ? null : Number(v))),
  durationMin: z.coerce.number({ message: "Duração inválida" }).int().min(5, "Mínimo 5 minutos").max(600, "Máximo 10 horas"),
  gapAfterMinutes: z.coerce.number().int().min(0).max(240).optional().default(0),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  imageUrl: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional().default(0),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const professionalSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome demasiado curto").max(80),
  slug: z.string().trim().max(60).regex(/^[a-z0-9-]*$/, "Slug inválido").optional().transform((v) => (v ? v : undefined)),
  title: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  description: z.string().trim().max(3000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  imageUrl: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  isActive: z.boolean().optional().default(true),
  serviceIds: z.array(z.string()).max(200).optional().default([]),
});
export type ProfessionalInput = z.infer<typeof professionalSchema>;

export const availabilityRowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startMinute: z.coerce.number().int().min(0).max(1439),
  endMinute: z.coerce.number().int().min(0).max(1440),
  isActive: z.boolean().default(true),
});
export const availabilityUpdateSchema = z.object({
  professionalId: z.string().min(1),
  rows: z
    .array(availabilityRowSchema)
    .max(30, "Demasiadas janelas")
    .refine(
      (rows) => rows.every((r) => r.endMinute > r.startMinute),
      "Todas as janelas precisam de hora de fim posterior à de início",
    ),
});

export const blockedPeriodSchema = z.object({
  id: z.string().optional(),
  professionalId: z
    .string()
    .max(64)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  type: z.enum(["PAUSE", "VACATION", "HOLIDAY", "CLOSURE", "BLOCK"], { message: "Tipo inválido" }),
  startDate: dateISOField,
  endDate: dateISOField,
  startMinute: z
    .union([z.coerce.number().int().min(0).max(1439), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined || v == null ? null : Number(v))),
  endMinute: z
    .union([z.coerce.number().int().min(1).max(1440), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : Number(v))),
  reason: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : null)),
})
  .refine((v) => v.endDate >= v.startDate, "A data de fim tem de ser igual ou posterior à de início")
  .refine(
    (v) => (v.startMinute == null) === (v.endMinute == null),
    "Indique a hora de início e a de fim (ou deixe ambas em vazio para o dia completo)",
  )
  .refine(
    (v) => v.startMinute == null || v.endMinute == null || v.endMinute > v.startMinute,
    "A hora de fim tem de ser posterior à de início",
  );
export type BlockedPeriodInput = z.infer<typeof blockedPeriodSchema>;

export const customerAdminSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Nome demasiado curto").max(80),
  phone: phoneField,
  email: emailOptional,
  notes: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

export const reviewSchema = z.object({
  id: z.string().optional(),
  customerName: z.string().trim().min(2, "Indique o nome da cliente").max(80),
  rating: z.coerce.number().int().min(1, "Escolha de 1 a 5").max(5),
  text: z.string().trim().min(5, "Escreva o testemunho").max(1500),
  isPublished: z.boolean().optional().default(false),
});

export const galleryRowSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  alt: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  isVisible: z.boolean().optional().default(true),
});

export const settingsSchema = z.object({
  brandName: z.string().trim().min(2).max(80),
  ownerName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  heroTitle: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  heroSubtitle: z.string().trim().max(400).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  heroImageUrl: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  aboutTitle: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  aboutText: z.string().trim().max(6000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  aboutImageUrl: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v ? v : null)),

  phone: z.string().trim().max(30).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  whatsApp: z.string().trim().max(30).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  email: z
    .union([emailField, z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  address: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  city: z.string().trim().max(80).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  mapsUrl: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  instagram: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  facebook: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  tiktok: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => (v ? v : null)),

  timezone: z.string().trim().max(60),
  currency: z.enum(["CVE", "EUR"]),
  slotIntervalMinutes: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(120),
  minLeadMinutes: z.coerce.number().int().min(0, "Em minutos").max(10080, "Máximo 7 dias"),
  maxLeadDays: z.coerce.number().int().min(1).max(365),
  autoConfirm: z.boolean(),
  bookingEnabled: z.boolean(),
  minCancelHours: z.coerce.number().int().min(0).max(720),
  allowReschedule: z.boolean(),
  cancelPolicyText: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  servicesNote: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v ? v : null)),

  seoTitle: z.string().trim().max(160).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  seoDescription: z.string().trim().max(300).optional().or(z.literal("")).transform((v) => (v ? v : null)),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const adminRescheduleSchema = z.object({
  id: z.string().min(1),
  dateISO: dateISOField,
  minutes: minutesField,
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const adminManualBookingSchema = z.object({
  serviceId: z.string().min(1, "Escolha o serviço"),
  professionalId: z
    .string()
    .max(64)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  dateISO: dateISOField,
  minutes: minutesField,
  name: z.string().trim().min(2, "Indique o nome da cliente").max(80),
  phone: phoneField,
  email: emailOptional,
  notes: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Nome demasiado curto").max(80),
  email: emailField,
  password: z.string().min(10, "Pelo menos 10 caracteres").max(100),
});

export const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Nome demasiado curto").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// ── Utilitário de parsing para ações de servidor ────────────────────────────

export type FieldErrors = Record<string, string>;

export function parseForm<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}