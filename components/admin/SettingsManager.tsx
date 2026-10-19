"use client";

// Configurações gerais: identidade, textos, contactos, motor de agendamento, SEO.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import UploadField from "@/components/admin/UploadField";
import { updateSettingsAction } from "@/lib/actions/content";

export type SettingsData = {
  brandName: string;
  ownerName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  aboutTitle: string;
  aboutText: string;
  aboutImageUrl: string | null;
  phone: string;
  whatsApp: string;
  email: string;
  address: string;
  city: string;
  mapsUrl: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  timezone: string;
  currency: string;
  slotIntervalMinutes: string;
  minLeadMinutes: string;
  maxLeadDays: string;
  minCancelHours: string;
  autoConfirm: boolean;
  bookingEnabled: boolean;
  allowReschedule: boolean;
  cancelPolicyText: string;
  servicesNote: string;
  seoTitle: string;
  seoDescription: string;
};

const ZONES = ["Atlantic/Cape_Verde", "Europe/Lisbon", "UTC", "America/New_York", "Europe/Madrid"];

export default function SettingsManager({ initial }: { initial: SettingsData }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof SettingsData>(k: K, v: SettingsData[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await updateSettingsAction({
      brandName: form.brandName.trim(),
      ownerName: form.ownerName.trim(),
      tagline: form.tagline.trim(),
      heroTitle: form.heroTitle.trim(),
      heroSubtitle: form.heroSubtitle.trim(),
      heroImageUrl: form.heroImageUrl ?? "",
      aboutTitle: form.aboutTitle.trim(),
      aboutText: form.aboutText.trim(),
      aboutImageUrl: form.aboutImageUrl ?? "",
      phone: form.phone.trim(),
      whatsApp: form.whatsApp.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      mapsUrl: form.mapsUrl.trim(),
      instagram: form.instagram.trim(),
      facebook: form.facebook.trim(),
      tiktok: form.tiktok.trim(),
      timezone: form.timezone.trim(),
      currency: form.currency,
      slotIntervalMinutes: Number(form.slotIntervalMinutes),
      minLeadMinutes: Number(form.minLeadMinutes),
      maxLeadDays: Number(form.maxLeadDays),
      minCancelHours: Number(form.minCancelHours),
      autoConfirm: form.autoConfirm,
      bookingEnabled: form.bookingEnabled,
      allowReschedule: form.allowReschedule,
      cancelPolicyText: form.cancelPolicyText.trim(),
      servicesNote: form.servicesNote.trim(),
      seoTitle: form.seoTitle.trim(),
      seoDescription: form.seoDescription.trim(),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Não foi possível guardar.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="grid gap-6">
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}
      {saved && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-[13.5px] text-emerald-700 ring-1 ring-emerald-200">Configurações guardadas.</p>}

      <Section title="Identidade" note="Nome do estúdio e dona — aparece no site, no painel e nas mensagens.">
        <Field label="Nome do estúdio *" value={form.brandName} onChange={(v) => set("brandName", v)} req />
        <Field label="Nome da dona/gestora *" value={form.ownerName} onChange={(v) => set("ownerName", v)} req />
        <Field label="Slogan (aparece sob o nome)" value={form.tagline} onChange={(v) => set("tagline", v)} />
      </Section>

      <Section title="Página inicial" note="Título e apresentação do topo. Sem texto, o site usa valores elegantes por omissão.">
        <Field label="Título do topo" value={form.heroTitle} onChange={(v) => set("heroTitle", v)} />
        <Field label="Subtítulo do topo" value={form.heroSubtitle} onChange={(v) => set("heroSubtitle", v)} wide />
        <UploadField label="Imagem do topo" value={form.heroImageUrl} onChange={(url) => set("heroImageUrl", url)} hint="Recomendado: foto ampla do estúdio ou um trabalho de destaque." />
      </Section>

      <Section title="Sobre" note="Texto da secção “Sobre” na página inicial e página /sobre.">
        <Field label="Título da secção" value={form.aboutTitle} onChange={(v) => set("aboutTitle", v)} />
        <Field label="Texto" value={form.aboutText} onChange={(v) => set("aboutText", v)} wide textarea rows={5} />
        <UploadField label="Imagem" value={form.aboutImageUrl} onChange={(url) => set("aboutImageUrl", url)} />
      </Section>

      <Section title="Contactos" note="Mostrados no site e usados nos links de WhatsApp/maps.">
        <Field label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label="WhatsApp (com indicativo)" value={form.whatsApp} onChange={(v) => set("whatsApp", v)} />
        <Field label="E-mail" value={form.email} onChange={(v) => set("email", v)} />
        <Field label="Endereço" value={form.address} onChange={(v) => set("address", v)} />
        <Field label="Cidade" value={form.city} onChange={(v) => set("city", v)} />
        <Field label="Instagram (URL)" value={form.instagram} onChange={(v) => set("instagram", v)} />
        <Field label="Facebook (URL)" value={form.facebook} onChange={(v) => set("facebook", v)} />
        <Field label="TikTok (URL)" value={form.tiktok} onChange={(v) => set("tiktok", v)} />
        <Field label="Link de Google Maps (embed)" value={form.mapsUrl} onChange={(v) => set("mapsUrl", v)} wide />
      </Section>

      <Section title="Agendamento" note="Regras do motor de reservas: intervalo entre horários, antecedência mínima/máxima, confirmação.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tz">Fuso horário *</label>
            <input id="tz" className="field" list="tz-list" value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
            <datalist id="tz-list">
              {ZONES.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="cur">Moeda</label>
            <select id="cur" className="field" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              <option value="CVE">Escudos cabo-verdianos (CVE)</option>
              <option value="EUR">Euro (EUR)</option>
            </select>
          </div>
          <Field label="Intervalo entre horários (minutos) *" value={form.slotIntervalMinutes} onChange={(v) => set("slotIntervalMinutes", v)} num />
          <Field label="Antecedência mínima (minutos) *" value={form.minLeadMinutes} onChange={(v) => set("minLeadMinutes", v)} num />
          <Field label="Agendar até X dias à frente *" value={form.maxLeadDays} onChange={(v) => set("maxLeadDays", v)} num />
          <Field label="Horas mínimas para cancelar *" value={form.minCancelHours} onChange={(v) => set("minCancelHours", v)} num />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Check label="Confirmação automática" hint="Marcações entram já confirmadas" checked={form.autoConfirm} onChange={(v) => set("autoConfirm", v)} />
          <Check label="Agendamento online ativo" hint="Desligado = o site esconde o fluxo" checked={form.bookingEnabled} onChange={(v) => set("bookingEnabled", v)} />
          <Check label="Cliente pode remarcar" hint="Na sua página de reserva" checked={form.allowReschedule} onChange={(v) => set("allowReschedule", v)} />
        </div>
      </Section>

      <Section title="Políticas e notas" note="Texto de cancelamento mostrado na marcação; nota sobre preços na página de serviços.">
        <Field label="Política de cancelamento" value={form.cancelPolicyText} onChange={(v) => set("cancelPolicyText", v)} wide textarea rows={3} />
        <Field label="Nota sobre serviços/preços" value={form.servicesNote} onChange={(v) => set("servicesNote", v)} wide rows={3} />
      </Section>

      <Section title="SEO" note="Como o site aparece no Google e ao partilhar o link.">
        <Field label="Título (tab do navegador)" value={form.seoTitle} onChange={(v) => set("seoTitle", v)} />
        <Field label="Descrição" value={form.seoDescription} onChange={(v) => set("seoDescription", v)} wide rows={2} />
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-bordo px-7 py-3 text-[14.5px] font-medium text-creme shadow-lg transition hover:bg-bordo-dark disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar configurações
        </button>
      </div>
    </form>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
      <h2 className="font-display text-xl text-bordo">{title}</h2>
      <p className="mt-0.5 text-[12.5px] text-tinta-soft">{note}</p>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  wide,
  textarea,
  rows = 2,
  num,
  req,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
  textarea?: boolean;
  rows?: number;
  num?: boolean;
  req?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea rows={rows} className="field resize-y" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={num ? "number" : "text"} className="field" value={value} required={req} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Check({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 rounded-xl bg-casca px-4 py-3 ring-1 ring-nude">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#850B36]" />
      <span>
        <span className="block text-[13.5px] font-medium text-tinta">{label}</span>
        <span className="block text-[12px] text-tinta-soft">{hint}</span>
      </span>
    </label>
  );
}