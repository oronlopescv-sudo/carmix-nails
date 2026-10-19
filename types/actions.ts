import type { FieldErrors } from "@/lib/validators";

export type ActionErr = {
  ok: false;
  error: string;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
};

export type ActionResult<T = Record<string, unknown>> = ({ ok: true } & T) | ActionErr;

export type SlotDTO = {
  minutes: number;
  time: string;
  iso: string;
};