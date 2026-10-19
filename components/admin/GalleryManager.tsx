"use client";

// Gestão da galeria: carregar fotos, ordenar, ocultar, editar títulos.

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import UploadField from "@/components/admin/UploadField";
import {
  createGalleryImageAction,
  updateGalleryImageAction,
  deleteGalleryImageAction,
  moveGalleryImageAction,
} from "@/lib/actions/content";

export type GalleryRow = {
  id: string;
  imageUrl: string;
  title: string | null;
  alt: string | null;
  isVisible: boolean;
};

export default function GalleryManager({ images }: { images: Array<GalleryRow> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", alt: "", isVisible: true });

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

  return (
    <div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-[13.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      <div className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
        <p className="text-[13.5px] text-tinta">Carregar nova fotografia</p>
        <p className="mt-0.5 text-[12px] text-tinta-soft">JPG/PNG/WebP/AVIF, até 8 MB. A foto entra no fim da galeria — ordene com as setas.</p>
        <div className="mt-3 max-w-md">
          <UploadField
            label=""
            value={null}
            hint=""
            onChange={(url) => {
              if (!url) return;
              void run(async () => createGalleryImageAction({ imageUrl: url }));
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.length === 0 && (
          <p className="col-span-full rounded-2xl bg-creme p-5 text-[14px] text-tinta-soft ring-1 ring-nude">Galeria vazia — carregue a primeira fotografia de trabalhos.</p>
        )}
        {images.map((g, i) => (
          <figure key={g.id} className="overflow-hidden rounded-2xl bg-creme ring-1 ring-nude">
            <div className="relative aspect-square w-full">
              <Image src={g.imageUrl} alt={g.alt ?? ""} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" unoptimized />
              {!g.isVisible && (
                <span className="absolute left-2 top-2 rounded-full bg-tinta/70 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-creme">oculta</span>
              )}
            </div>
            <figcaption className="p-3">
              {editing === g.id ? (
                <div className="grid gap-2">
                  <input className="field" value={form.title} placeholder="Título (opcional)" onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <input className="field" value={form.alt} placeholder="Texto alternativo (descrição da foto)" onChange={(e) => setForm({ ...form, alt: e.target.value })} />
                  <label className="flex items-center gap-2 text-[13px] text-tinta">
                    <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} className="h-4 w-4 accent-[#850B36]" />
                    Visível no site
                  </label>
                  <div className="mt-1 flex gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const res = await updateGalleryImageAction({ id: g.id, title: form.title, alt: form.alt, isVisible: form.isVisible });
                          if (res.ok) setEditing(null);
                          return res;
                        })
                      }
                      className="rounded-full bg-bordo px-4 py-2 text-[12.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="text-[12.5px] text-tinta-soft hover:text-tinta">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="truncate text-[13px] font-medium text-tinta">{g.title ?? `Foto ${i + 1}`}</p>
                  <p className="truncate text-[11.5px] text-tinta-soft">{g.alt ?? "sem descrição"}</p>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy || i === 0}
                      onClick={() => void run(() => moveGalleryImageAction(g.id, "up"))}
                      aria-label="Mover para cima"
                      className="grid h-7 w-7 place-items-center rounded-full text-tinta-soft transition hover:bg-casca hover:text-bordo disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || i === images.length - 1}
                      onClick={() => void run(() => moveGalleryImageAction(g.id, "down"))}
                      aria-label="Mover para baixo"
                      className="grid h-7 w-7 place-items-center rounded-full text-tinta-soft transition hover:bg-casca hover:text-bordo disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => updateGalleryImageAction({ id: g.id, title: g.title, alt: g.alt, isVisible: !g.isVisible }))}
                      aria-label={g.isVisible ? "Ocultar" : "Mostrar"}
                      className="grid h-7 w-7 place-items-center rounded-full text-tinta-soft transition hover:bg-casca hover:text-bordo disabled:opacity-50"
                    >
                      {g.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(g.id);
                        setForm({ title: g.title ?? "", alt: g.alt ?? "", isVisible: g.isVisible });
                      }}
                      className="ml-auto rounded-full px-3 py-1.5 text-[12px] text-malva ring-1 ring-nude transition hover:ring-malva-soft"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Eliminar esta fotografia do site?")) {
                          void run(() => deleteGalleryImageAction(g.id));
                        }
                      }}
                      aria-label="Eliminar"
                      className="grid h-7 w-7 place-items-center rounded-full text-tinta-soft transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

