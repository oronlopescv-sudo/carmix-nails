// Carregamento de fotografias (admin). Guarda em data/uploads/ e devolve
// "/uploads/<ficheiro>" para os campos imageUrl (serviço, galeria, hero…).
// UPLOAD_DIR (se definido) fixa a pasta — persistência entre deploys.

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUser } from "@/lib/auth";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

// No artefacto standalone o cwd é .next/standalone — pasta efémera entre
// deploys. Avisar em vez de perder fotografias em silêncio: defina UPLOAD_DIR.
if (!process.env.UPLOAD_DIR && process.cwd().endsWith(".next/standalone")) {
  console.warn(
    "[carmix] UPLOAD_DIR não definido no standalone — as fotografias gravam-se dentro do build e perdem-se no próximo deploy. Defina UPLOAD_DIR no painel do hospedeiro.",
  );
}

/** Sniffing do conteúdo real (o `file.type` do browser não é confiável). */
function sniffImage(b: Buffer): "jpg" | "png" | "webp" | "avif" | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (b.subarray(4, 8).toString("ascii") === "ftyp" && b.subarray(8, 12).toString("ascii") === "avif") return "avif";
  return null;
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Ficheiro em falta." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ ok: false, error: "Formato não suportado (use JPEG, PNG, WebP ou AVIF)." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Máximo 8 MB." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) {
    return NextResponse.json({ ok: false, error: "O ficheiro não parece uma imagem válida." }, { status: 400 });
  }
  const name = `${crypto.randomUUID()}.${kind}`;

  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(process.cwd(), "data", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buf);

  return NextResponse.json({ ok: true, url: `/uploads/${name}` });
}