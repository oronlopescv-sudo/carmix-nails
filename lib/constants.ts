// Constantes partilhadas — nomes/etiquetas em português (PT-PT)

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

// Ordem segunda-primeira — para calendários cuja grelha começa à segunda e
// termina no domingo (índice do dia: (getUTCDay() + 6) % 7)
export const WEEKDAY_SHORT_MON = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-sky-50 text-sky-700 border-sky-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  NO_SHOW: "bg-stone-100 text-stone-600 border-stone-300",
};

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  PAUSE: "Pausa",
  VACATION: "Férias",
  HOLIDAY: "Feriado",
  CLOSURE: "Encerramento",
  BLOCK: "Bloqueio manual",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  CREATED: "Marcação criada",
  CONFIRMED: "Confirmada",
  RESCHEDULED: "Remarcada",
  CANCELLED: "Cancelada",
  COMPLETED: "Concluída",
  NO_SHOW: "Falta de comparência",
  NOTIFIED: "Notificação",
  UPDATED: "Atualizada",
};

export const EVENT_ACTOR_LABELS: Record<string, string> = {
  CUSTOMER: "Cliente",
  ADMIN: "Administrador",
  SYSTEM: "Sistema",
};

// Caracteres sem ambiguidade (sem 0/O, 1/I/L) para códigos de reserva
export const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const BRAND_TIMEZONE_FALLBACK = "Atlantic/Cape_Verde";