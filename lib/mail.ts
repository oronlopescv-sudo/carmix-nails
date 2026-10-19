// E-mail transacional via Resend.
//
// Sem RESEND_API_KEY o sistema continua a funcionar: nenhuma marcação falha
// por falta de e-mail — apenas não é enviado nada e o ambiente de
// desenvolvimento mostra um aviso claro na consola e no painel.

import { Resend } from "resend";
import { formatPrice } from "@/lib/pricing";
import { getSettings, mailConfigured } from "@/lib/settings";
import type { Appointment } from "@prisma/client";
import { truncate } from "@/lib/utils";

export type MailResult = { sent: boolean; reason?: string };

const globalForMail = globalThis as unknown as { carmixResend?: Resend };

function getClient(): Resend | null {
  if (!mailConfigured()) return null;
  if (!globalForMail.carmixResend) {
    globalForMail.carmixResend = new Resend(process.env.RESEND_API_KEY!.trim());
  }
  return globalForMail.carmixResend;
}

export async function sendEmail(opts: { to: string | null; subject: string; html: string }): Promise<MailResult> {
  if (!opts.to || !opts.to.includes("@")) return { sent: false, reason: "sem-destinatário" };
  const client = getClient();
  if (!client) {
    console.warn(
      `[carmix] E-mail NÃO enviado (RESEND_API_KEY não configurada) — assunto: "${opts.subject}" — destinatário: ${opts.to}`,
    );
    return { sent: false, reason: "nao-configurado" };
  }
  try {
    const from = process.env.MAIL_FROM?.trim() || "Carmix Nails <onboarding@resend.dev>";
    const { error } = await client.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      console.error("[carmix] Resend devolveu erro:", error.message);
      return { sent: false, reason: "erro-resend" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[carmix] falha ao enviar e-mail:", err);
    return { sent: false, reason: "exceção" };
  }
}

export async function adminRecipient(): Promise<string | null> {
  const env = process.env.MAIL_ADMIN_TO?.trim();
  if (env && env.includes("@")) return env;
  const settings = await getSettings();
  return settings.email && settings.email.includes("@") ? settings.email : null;
}

// ── Formatação de data/hora nos e-mails ─────────────────────────────────────

export function fmtDateTimeEmail(instant: Date, tz: string): string {
  const date = new Intl.DateTimeFormat("pt-PT", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
  const time = new Intl.DateTimeFormat("pt-PT", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
  return `${cap(date)} às ${time}`;
}

export function fmtTimeEmail(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

// ── Modelo do e-mail ────────────────────────────────────────────────────────

const COLORS = {
  bordo: "#850B36",
  malva: "#A94C80",
  dourado: "#C99A42",
  nude: "#F2E5E8",
  branco: "#FFFCF8",
  texto: "#30232A",
  fundo: "#F8F0F3",
};

function emailShell(title: string, bodyHtml: string, footerNote?: string): string {
  return `<!doctype html>
<html lang="pt">
<body style="margin:0;padding:0;background:${COLORS.fundo};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.fundo};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.branco};border-radius:14px;overflow:hidden;border:1px solid ${COLORS.nude};">
        <tr>
          <td style="background:${COLORS.bordo};padding:26px 32px;text-align:center;">
            <span style="color:#FFFDF9;font-size:22px;letter-spacing:2px;">CARMIX NAILS</span>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 32px 8px;color:${COLORS.texto};">
            <h1 style="margin:0 0 16px;font-size:21px;font-weight:normal;color:${COLORS.bordo};">${title}</h1>
            <div style="font-family: Arial, Helvetica, sans-serif; font-size:14.5px; line-height:1.7; color:${COLORS.texto};">
              ${bodyHtml}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 30px;">
            ${footerNote ? `<p style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#6b5560;margin:0 0 6px;">${footerNote}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:${COLORS.nude};padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b5560;text-align:center;">
            Este e-mail foi enviado pelo sistema de marcações online da Carmix Nails.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailCard(appt: ApptFull, tz: string, currency: string): string {
  const when = fmtDateTimeEmail(appt.startAt, tz);
  const dur = Math.round(
    (appt.endAt.getTime() - appt.startAt.getTime()) / 60000,
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.nude};border-radius:10px;border:1px solid #e3cdd5;margin:14px 0 6px;">
    <tr>
      <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.texto};">
        <strong style="color:${COLORS.bordo};">${appt.service?.name ?? "Tratamento"}</strong><br>
        <span style="font-size:13.5px;">${when} • duração aprox. ${dur} min</span><br>
        <span style="font-size:13.5px;">Preço: ${formatPrice(appt.priceAtBooking, currency)}</span><br>
        <span style="font-size:12px;background:${COLORS.branco};border:1px solid #d8bfc8;border-radius:6px;padding:4px 10px;display:inline-block;margin-top:8px;">
          Nº de reserva: <strong>${appt.reference}</strong>
        </span>
      </td>
    </tr>
  </table>`;
}

// ── E-mails concretos ───────────────────────────────────────────────────────

type ApptFull = Appointment & {
  service: { name: string };
  professional: { name: string };
  customer: { name: string; email: string | null; phone: string };
};

export async function mailBookingCreated(appt: ApptFull): Promise<MailResult> {
  const s = await getSettings();
  const manage = `${siteUrl()}/reserva/${encodeURIComponent(appt.reference)}`;
  const confirmed = appt.status === "CONFIRMED";
  const statusLine = confirmed
    ? "A sua marcação já está <strong>confirmada</strong>."
    : "A sua marcação foi recebida e está <strong>pendente de confirmação</strong> — avisamos por e-mail quando estiver confirmada.";
  const body = `
    <p>Olá ${escapeHtml(appt.customer.name.split(" ")[0])},</p>
    <p>${statusLine}</p>
    ${detailCard(appt, s.timezone, s.currency)}
    <p>Gerir a marcação (consultar, remarcar ou cancelar):<br>
      <a href="${manage}" style="color:${COLORS.malva};">${manage}</a></p>
    <p>Com um sorriso,<br><strong>${escapeHtml(s.ownerName)}</strong> — ${escapeHtml(s.brandName)}</p>`;
  const html = emailShell("Marcação recebida 🌸", body, s.cancelPolicyText ? truncate(s.cancelPolicyText, 300) : undefined);
  return sendEmail({ to: appt.customer.email, subject: `${s.brandName} — marcação ${appt.reference}`, html });
}

export async function mailBookingAdminNotice(appt: ApptFull): Promise<MailResult> {
  const s = await getSettings();
  const body = `
    <p style="font-family:Arial,Helvetica,sans-serif;">Nova marcação de cliente:</p>
    ${detailCard(appt, s.timezone, s.currency)}
    <p style="font-family:Arial,Helvetica,sans-serif;">
      Cliente: <strong>${escapeHtml(appt.customer.name)}</strong> — ${escapeHtml(appt.customer.phone)}<br>
      Estado: ${appt.status === "CONFIRMED" ? "Confirmada" : "Pendente"}<br>
      Notas: ${appt.notes ? escapeHtml(truncate(appt.notes, 300)) : "—"}
    </p>`;
  return sendEmail({ to: await adminRecipient(), subject: `Nova marcação ${appt.reference} — ${appt.service?.name ?? ""}`, html: emailShell("Nova marcação", body) });
}

export async function mailBookingConfirmed(appt: ApptFull): Promise<MailResult> {
  const s = await getSettings();
  const body = `
    <p>Olá ${escapeHtml(appt.customer.name.split(" ")[0])},</p>
    <p>A boa notícia: a sua marcação está <strong>confirmada</strong>.</p>
    ${detailCard(appt, s.timezone, s.currency)}
    <p>Até lá,<br><strong>${escapeHtml(s.ownerName)}</strong></p>`;
  return sendEmail({
    to: appt.customer.email,
    subject: `${s.brandName} — marcação confirmada (${appt.reference})`,
    html: emailShell("Marcação confirmada ✨", body),
  });
}

export async function mailBookingRescheduled(appt: ApptFull, oldStart: Date): Promise<MailResult> {
  const s = await getSettings();
  const body = `
    <p>Olá ${escapeHtml(appt.customer.name.split(" ")[0])},</p>
    <p>A sua marcação foi <strong>remarcada</strong>. Novo horário:</p>
    ${detailCard(appt, s.timezone, s.currency)}
    <p>Horário anterior: ${fmtDateTimeEmail(oldStart, s.timezone)}</p>
    <p>Se este horário não lhe der jeito, pode gerar a marcação em
      <a href="${siteUrl()}/reserva/${encodeURIComponent(appt.reference)}" style="color:${COLORS.malva};">${siteUrl()}/reserva/${encodeURIComponent(appt.reference)}</a></p>
    <p>Até breve,<br><strong>${escapeHtml(s.ownerName)}</strong></p>`;
  return sendEmail({
    to: appt.customer.email,
    subject: `${s.brandName} — marcação remarcada (${appt.reference})`,
    html: emailShell("Marcação remarcada", body),
  });
}

export async function mailBookingCancelled(appt: ApptFull, reason: string | null): Promise<MailResult> {
  const s = await getSettings();
  const body = `
    <p>Olá ${escapeHtml(appt.customer.name.split(" ")[0])},</p>
    <p>A marcação <strong>${appt.reference}</strong> (${appt.service?.name ?? ""}) foi <strong>cancelada</strong>.</p>
    ${reason ? `<p>Motivo: ${escapeHtml(reason)}</p>` : ""}
    ${detailCard(appt, s.timezone, s.currency)}
    <p>Quando quiser voltar, marque em
      <a href="${siteUrl()}/agendar" style="color:${COLORS.malva};">${siteUrl()}/agendar</a></p>
    <p>${escapeHtml(s.ownerName)}</p>`;
  return sendEmail({
    to: appt.customer.email,
    subject: `${s.brandName} — marcação cancelada (${appt.reference})`,
    html: emailShell("Marcação cancelada", body),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}