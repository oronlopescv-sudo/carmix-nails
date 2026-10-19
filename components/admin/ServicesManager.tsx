"use client";

// Editor do catálogo: categorias + serviços (preços, duração, fotos, ordem).

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { formatPrice } from "@/lib/pricing";
import UploadField from "@/components/admin/UploadField";
import {
  saveServiceAction,
  deleteServiceAction,
  toggleServiceActiveAction,
  saveCategoryAction,
  deleteCategoryAction,
} from "@/lib/actions/services";

export type CatRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};
export type SvcRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  priceMin: number;
  priceMax: number | null;
  durationMin: number;
  gapAfterMinutes: number;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  sortOrder: number;
};

const emptyService = {
  id: undefined as string | undefined,
  name: "",
  categoryId: "" as string,
  priceMinESC: "",
  priceMaxESC: "",
  durationMin: "45",
  gapAfterMinutes: "0",
  sortOrder: "0",
  isActive: true,
  isFeatured: false,
  imageUrl: null as string | null,
  description: "",
};

type ServiceForm = typeof emptyService;
type CategoryForm = { id?: string; name: string; description: string; sortOrder: string; isActive: boolean };

export default function ServicesManager({
  currency,
  categories,
  services,
}: {
  currency: string;
  categories: Array<CatRow>;
  services: Array<SvcRow>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svcForm, setSvcForm] = useState<ServiceForm | null>(null);
  const [catForm, setCatForm] = useState<CategoryForm | null>(null);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Não foi possível.");
      return false;
    }
    router.refresh();
    return true;
  }

  function editService(s: SvcRow) {
    setSvcForm({
      id: s.id,
      name: s.name,
      categoryId: s.categoryId ?? "",
      priceMinESC: String(Math.round(s.priceMin / 100)),
      priceMaxESC: s.priceMax == null ? "" : String(Math.round(s.priceMax / 100)),
      durationMin: String(s.durationMin),
      gapAfterMinutes: String(s.gapAfterMinutes),
      sortOrder: String(s.sortOrder),
      isActive: s.isActive,
      isFeatured: s.isFeatured,
      imageUrl: s.imageUrl,
      description: s.description ?? "",
    });
  }

  function submitService() {
    if (!svcForm) return;
    const name = svcForm.name.trim();
    if (name.length < 2) {
      setError("Indique o nome do serviço.");
      return;
    }
    const priceMin = Number(svcForm.priceMinESC || "0");
    const priceMaxRaw = svcForm.priceMaxESC.trim();
    void run(async () => {
      const res = await saveServiceAction({
        id: svcForm.id,
        name,
        description: svcForm.description.trim(),
        categoryId: svcForm.categoryId || "",
        priceMin: priceMin * 100,
        priceMax: priceMaxRaw === "" ? null : Number(priceMaxRaw) * 100,
        durationMin: Number(svcForm.durationMin),
        gapAfterMinutes: Number(svcForm.gapAfterMinutes || "0"),
        sortOrder: Number(svcForm.sortOrder || "0"),
        isActive: svcForm.isActive,
        isFeatured: svcForm.isFeatured,
        imageUrl: svcForm.imageUrl ?? "",
      });
      if (res.ok) setSvcForm(null);
      return res;
    });
  }

  function submitCategory() {
    if (!catForm) return;
    void run(async () => {
      const res = await saveCategoryAction({
        id: catForm.id,
        name: catForm.name.trim(),
        description: catForm.description.trim(),
        sortOrder: Number(catForm.sortOrder || "0"),
        isActive: catForm.isActive,
      });
      if (res.ok) setCatForm(null);
      return res;
    });
  }

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {/* categorias */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-bordo">Categorias</h2>
        <button
          type="button"
          onClick={() => setCatForm({ name: "", description: "", sortOrder: String(categories.length), isActive: true })}
          className="inline-flex items-center gap-1.5 rounded-full bg-malva px-4 py-2 text-[13px] font-medium text-creme transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nova categoria
        </button>
      </div>

      {catForm && (
        <div className="mt-3 rounded-2xl bg-casca p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="cat-name">Nome *</label>
              <input id="cat-name" className="field" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Ex.: Unhas de gel com fibras" />
            </div>
            <div>
              <label className="label" htmlFor="cat-order">Ordem</label>
              <input id="cat-order" type="number" min={0} className="field" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="cat-desc">Descrição (aparece na página de serviços)</label>
              <textarea id="cat-desc" rows={2} className="field resize-y" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-[13.5px] text-tinta">
              <input type="checkbox" checked={catForm.isActive} onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
              Categoria visível no site
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" disabled={busy} onClick={submitCategory} className="inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar categoria
            </button>
            <button type="button" onClick={() => setCatForm(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Cancelar</button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {categories.map((c) => {
          const list = services.filter((s) => s.categoryId === c.id);
          const open = openCats[c.id] ?? true;
          return (
            <section key={c.id} className={cx("rounded-2xl bg-creme p-5 ring-1 transition", c.isActive ? "ring-nude" : "opacity-70 ring-nude")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setOpenCats({ ...openCats, [c.id]: !open })} className="flex items-center gap-2 text-left">
                  {open ? <ChevronUp className="h-4 w-4 text-tinta-soft" /> : <ChevronDown className="h-4 w-4 text-tinta-soft" />}
                  <h3 className="font-display text-lg text-bordo">{c.name}</h3>
                  <span className="text-[12.5px] text-tinta-soft">({list.length} serviço{list.length === 1 ? "" : "s"})</span>
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCatForm({ id: c.id, name: c.name, description: c.description ?? "", sortOrder: String(c.sortOrder), isActive: c.isActive })} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => deleteCategoryAction(c.id))}
                    title="Eliminar categoria"
                    className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {c.description && <p className="mt-1 text-[13px] text-tinta-soft">{c.description}</p>}

              {open && (
                <div className="mt-3 space-y-2">
                  {list.length === 0 && <p className="text-[13.5px] text-tinta-soft">Sem serviços nesta categoria.</p>}
                  {list.map((s) => (
                    <div key={s.id} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-creme px-4 py-3 ring-1 transition", s.isActive ? "ring-nude" : "opacity-55 ring-nude")}>
                      {s.imageUrl ? (
                        <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-nude">
                          <Image src={s.imageUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />
                        </span>
                      ) : (
                        <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg bg-casca text-tinta-soft ring-1 ring-nude">
                          <Sparkles className="h-4 w-4 opacity-50" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-medium text-tinta">
                          {s.name}
                          {s.isFeatured && <span className="ml-2 rounded-full bg-nude px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-bordo">destaque</span>}
                        </p>
                        <p className="text-[12.5px] text-tinta-soft">
                          {formatPrice(s.priceMin, currency)}{s.priceMax != null ? ` – ${formatPrice(s.priceMax, currency)}` : ""} · {s.durationMin} min
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => toggleServiceActiveAction(s.id, !s.isActive))}
                          title={s.isActive ? "Desativar (some do site)" : "Ativar"}
                          className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-casca hover:text-bordo"
                        >
                          {s.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => editService(s)}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Eliminar “${s.name}”? Só é possível se não tiver marcações.`)) {
                              void run(() => deleteServiceAction(s.id));
                            }
                          }}
                          title="Eliminar serviço"
                          className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSvcForm({ ...emptyService, categoryId: c.id })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-malva-soft px-4 py-2 text-[13px] text-malva transition hover:border-malva hover:text-bordo"
                    >
                      <Plus className="h-4 w-4" /> Novo serviço nesta categoria
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
        {categories.length === 0 && (
          <p className="rounded-2xl bg-creme p-5 text-[14px] text-tinta-soft ring-1 ring-nude">Ainda não existem categorias — crie a primeira.</p>
        )}
      </div>

      {/* editor de serviço (modal) */}
      {svcForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-tinta/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Editor de serviço">
          <div className="mx-auto my-8 w-[94%] max-w-2xl rounded-[1.5rem] bg-creme p-6 shadow-xl sm:my-12">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-bordo">{svcForm.id ? "Editar serviço" : "Novo serviço"}</h2>
              <button type="button" onClick={() => setSvcForm(null)} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full text-tinta-soft transition hover:bg-casca">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="svc-name">Nome *</label>
                <input id="svc-name" className="field" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="Ex.: Gel com fibras — S (pequeno)" />
              </div>
              <div>
                <label className="label" htmlFor="svc-cat">Categoria</label>
                <select id="svc-cat" className="field" value={svcForm.categoryId} onChange={(e) => setSvcForm({ ...svcForm, categoryId: e.target.value })}>
                  <option value="">— sem categoria —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="svc-duration">Duração (minutos) *</label>
                <input id="svc-duration" type="number" min={5} max={600} className="field" value={svcForm.durationMin} onChange={(e) => setSvcForm({ ...svcForm, durationMin: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="svc-price">Preço (escudos) *</label>
                <input id="svc-price" type="number" min={0} className="field" value={svcForm.priceMinESC} onChange={(e) => setSvcForm({ ...svcForm, priceMinESC: e.target.value })} placeholder="2200" />
                <p className="mt-1 text-[12px] text-tinta-soft">Pré-visualização: {formatPrice((Number(svcForm.priceMinESC || "0")) * 100, currency)}</p>
              </div>
              <div>
                <label className="label" htmlFor="svc-price-max">Preço até (escudos)</label>
                <input id="svc-price-max" type="number" min={0} className="field" value={svcForm.priceMaxESC} onChange={(e) => setSvcForm({ ...svcForm, priceMaxESC: e.target.value })} placeholder="vazio = preço fixo" />
              </div>
              <div>
                <label className="label" htmlFor="svc-gap">Pausa após (minutos)</label>
                <input id="svc-gap" type="number" min={0} max={240} className="field" value={svcForm.gapAfterMinutes} onChange={(e) => setSvcForm({ ...svcForm, gapAfterMinutes: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="svc-sort">Ordem</label>
                <input id="svc-sort" type="number" min={0} className="field" value={svcForm.sortOrder} onChange={(e) => setSvcForm({ ...svcForm, sortOrder: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="svc-desc">Descrição</label>
                <textarea id="svc-desc" rows={3} className="field resize-y" value={svcForm.description} onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })} placeholder="O que está incluído, para quem é indicado…" />
              </div>
              <div className="sm:col-span-2">
                <UploadField label="Fotografia do serviço" value={svcForm.imageUrl} onChange={(url) => setSvcForm({ ...svcForm, imageUrl: url })} hint="JPG/PNG/WebP até 8 MB. Opcional — sem foto usa um padrão elegante." />
              </div>
              <label className="flex items-center gap-2 text-[13.5px] text-tinta">
                <input type="checkbox" checked={svcForm.isActive} onChange={(e) => setSvcForm({ ...svcForm, isActive: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
                Ativo (reservável e visível)
              </label>
              <label className="flex items-center gap-2 text-[13.5px] text-tinta">
                <input type="checkbox" checked={svcForm.isFeatured} onChange={(e) => setSvcForm({ ...svcForm, isFeatured: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
                Destaque na página inicial
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button type="button" disabled={busy} onClick={submitService} className="inline-flex items-center gap-2 rounded-full bg-bordo px-6 py-3 text-[14px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Guardar serviço
              </button>
              <button type="button" onClick={() => setSvcForm(null)} className="text-[13.5px] text-tinta-soft hover:text-tinta">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}