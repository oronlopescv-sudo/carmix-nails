// Servir imagens carregadas (data/uploads) com caminho seguro.
// Cache imutável: os nomes são UUID-únicos por upload.

import path from "node:path";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  if (!parts || parts.length !== 1) {
    return new NextResponse("Não encontrado", { status: 404 });
  }
  const name = path.basename(parts[0]); // bloqueia ../ e subdiretórios
  const ext = path.extname(name).toLowerCase();
  if (!TYPES[ext]) return new NextResponse("Não encontrado", { status: 404 });

  const { open } = await import("node:fs/promises");
  try {
    const file = await open(path.join(process.cwd(), "data", "uploads", name), "r");
    try {
      const stat = await file.stat();
      const body = Buffer.from(await file.readFile());
      return new NextResponse(new Uint8Array(body), {
        status: 200,
        headers: {
          "Content-Type": TYPES[ext],
          "Content-Length": String(stat.size),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } finally {
      await file.close();
    }
  } catch {
    return new NextResponse("Não encontrado", { status: 404 });
  }
}