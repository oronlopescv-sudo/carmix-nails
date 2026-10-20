"use client";

// Utilizadores do painel: criar, ativar/desativar, trocar passe.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, UserRoundPlus, X } from "lucide-react";
import { cx } from "@/lib/utils";
import { createUserAction, toggleUserActiveAction, changeUserPasswordAction } from "@/lib/actions/content";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAtISO: string;
};

export default function UsersManager({ users, currentUserId }: { users: Array<UserRow>; currentUserId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", email: "", password: "" });
  const [newPwFor, setNewPwFor] = useState<string | null>(null);
  const [newPwError, setNewPwError] = useState<string | null>(null);

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
    <article className="rounded-2xl bg-creme p-5 ring-1 ring-nude">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-bordo">Utilizadores do painel</h2>
          <p className="text-[12.5px] text-tinta-soft">Contas com acesso completo à gestão do estúdio.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className={cx("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition", showNew ? "bg-tinta-soft text-creme" : "bg-malva text-creme hover:opacity-90")}
        >
          <UserRoundPlus className="h-4 w-4" /> Nova conta
        </button>
      </div>

      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700 ring-1 ring-rose-200">{error}</p>}

      {showNew && (
        <div className="mt-4 rounded-xl bg-casca p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="u-name">Nome *</label>
              <input id="u-name" className="field" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="u-email">E-mail *</label>
              <input id="u-email" type="email" className="field" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="u-pw">Passe inicial (10+) *</label>
              <input id="u-pw" type="password" className="field" value={newForm.password} onChange={(e) => setNewForm({ ...newForm, password: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const res = await createUserAction({ name: newForm.name.trim(), email: newForm.email.trim(), password: newForm.password });
                  if (res.ok) {
                    setNewForm({ name: "", email: "", password: "" });
                    setShowNew(false);
                  }
                  return res;
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-bordo px-5 py-2.5 text-[13.5px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Criar conta
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="inline-flex items-center gap-1.5 text-[13.5px] text-tinta-soft hover:text-tinta">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-casca px-4 py-3 text-[13.5px] ring-1 ring-nude">
            <div>
              <p className="font-medium text-tinta">
                {u.name}
                {u.id === currentUserId && <span className="ml-2 rounded-full bg-nude px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-bordo">sua conta</span>}
              </p>
              <p className="text-[12.5px] text-tinta-soft">{u.email} · criada em {fmtDate(u.createdAtISO)}</p>
            </div>
            <span className={cx("ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-medium", u.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-1 ring-stone-200")}>
              {u.isActive ? "ativa" : "desativada"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setNewPwFor(newPwFor === u.id ? null : u.id)}
              title="Trocar passe"
              className="grid h-8 w-8 place-items-center rounded-full text-tinta-soft transition hover:bg-creme hover:text-bordo"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            {u.id !== currentUserId && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => toggleUserActiveAction(u.id, !u.isActive))}
                title={u.isActive ? "Desativar (termina as sessões)" : "Ativar"}
                className="rounded-full px-3 py-1.5 text-[12.5px] text-malva ring-1 ring-nude transition hover:ring-malva-soft disabled:opacity-50"
              >
                {u.isActive ? "Desativar" : "Ativar"}
              </button>
            )}
          </li>
        ))}
      </ul>

      {newPwFor && (
        <ChangePassword
          userId={newPwFor}
          busy={busy}
          error={newPwError}
          needsCurrent={newPwFor === currentUserId}
          onCancel={() => {
            setNewPwFor(null);
            setNewPwError(null);
          }}
          onSubmit={(pw, currPw) =>
            run(async () => {
              if (pw.length < 8) {
                setNewPwError("Pelo menos 8 caracteres.");
                return { ok: false };
              }
              const res = await changeUserPasswordAction(
                newPwFor,
                pw,
                newPwFor === currentUserId ? currPw : undefined,
              );
              if (res.ok) {
                setNewPwFor(null);
                setNewPwError(null);
              }
              return res;
            })
          }
        />
      )}
    </article>
  );
}

function ChangePassword({
  userId,
  busy,
  error,
  needsCurrent,
  onSubmit,
  onCancel,
}: {
  userId: string;
  busy: boolean;
  error: string | null;
  needsCurrent: boolean;
  onSubmit: (pw: string, currentPw?: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  const [currPw, setCurrPw] = useState("");
  return (
    <div className="mt-3 rounded-xl bg-casca p-4">
      <label className="label" htmlFor={`pw-${userId}`}>Novo passe (mínimo 5 caracteres — a conta é desligada para voltar a entrar)</label>
      <div className="max-w-md space-y-1.5">
        {needsCurrent && (
          <input
            type="password"
            className="field"
            placeholder="palavra-passe atual"
            value={currPw}
            autoComplete="current-password"
            onChange={(e) => setCurrPw(e.target.value)}
            required
          />
        )}
        <input id={`pw-${userId}`} type="password" className="field" value={pw} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} />
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit(pw, needsCurrent ? currPw : undefined)}
          className="shrink-0 rounded-full bg-bordo px-4 py-2.5 text-[13px] font-medium text-creme transition hover:bg-bordo-dark disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trocar"}
        </button>
        <button type="button" onClick={onCancel} className="shrink-0 text-[13px] text-tinta-soft hover:text-tinta">Fechar</button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-rose-600">{error}</p>}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}