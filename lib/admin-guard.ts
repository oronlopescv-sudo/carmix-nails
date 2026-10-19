import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

/** Guarda de páginas admin (Server Components): redireciona se não está autenticado. */
export async function requireAdmin() {
  const user = await getAuthUser();
  if (!user) redirect("/admin/login");
  return user;
}