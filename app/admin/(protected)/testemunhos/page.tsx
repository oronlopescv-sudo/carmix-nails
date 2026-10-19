// Testemunhos: apenas reais, publicados manualmente.

import { db } from "@/lib/db";
import ReviewsManager, { type ReviewRow } from "@/components/admin/ReviewsManager";

export default async function TestemunhosPage() {
  const reviews = await db.review.findMany({ orderBy: [{ isPublished: "desc" }, { reviewedAt: "desc" }] });

  const rows: Array<ReviewRow> = reviews.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    text: r.text,
    isPublished: r.isPublished,
    reviewedAtISO: r.reviewedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <h1 className="font-display text-3xl text-bordo">Testemunhos</h1>
      <p className="mt-1 text-[14px] text-tinta-soft">Só aparecem no site os publicados. Nunca se inventam testemunhos.</p>
      <div className="mt-6">
        <ReviewsManager reviews={rows} />
      </div>
    </div>
  );
}