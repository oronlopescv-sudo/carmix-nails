// Feedback imediato enquanto o pedido lê a base de dados — evita a página em
// branco quando a ligação demora (fuso/hospedeiros lentos no primeiro arranque).
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-12 sm:px-6">
      <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-nude" />
      <div className="mx-auto mt-4 h-9 w-2/3 max-w-sm animate-pulse rounded-xl bg-nude" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-[1.5rem] bg-casca" />
        ))}
      </div>
    </div>
  );
}