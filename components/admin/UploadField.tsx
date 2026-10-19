"use client";

// Campo de imagem com upload para /api/upload (admin). Devolve o URL /uploads/…

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cx } from "@/lib/utils";

export default function UploadField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!data.ok || !data.url) {
        setError(data.error ?? "Não foi possível carregar a imagem.");
      } else {
        onChange(data.url);
      }
    } catch {
      setError("Não foi possível carregar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-nude">
            <Image src={value} alt="" fill sizes="112px" className="object-cover" unoptimized />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remover imagem"
              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-tinta/70 text-creme transition hover:bg-tinta"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-casca px-4 py-2.5 text-[13.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy ? "A carregar…" : "Carregar imagem"}
          </button>
        )}
        <div className="min-w-0">
          {value && (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="text-[13px] text-malva hover:text-bordo">
              substituir
            </button>
          )}
          {hint && <p className="text-[12px] text-tinta-soft">{hint}</p>}
          {error && <p className="mt-1 text-[12.5px] text-rose-600">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className={cx("hidden")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}