import crypto from "crypto";
import { REFERENCE_ALPHABET } from "./constants";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** slug simples e seguro para URLs: "Unhas de Gel — S" -> "unhas-de-gel-s" */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Código de reserva: "CN-XXXXXX" */
export function generateReference(): string {
  let out = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `CN-${out}`;
}

/** Normaliza telefone: mantém dígitos e '+' inicial; usado para pesquisar/duplicar */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return (hasPlus ? "+" : "") + digits;
}

export function formatPhone(raw: string): string {
  if (!raw) return "";
  return raw;
}

/** Hash SHA-256 em hex — usado para hashes de token de sessão */
export function sha256hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}