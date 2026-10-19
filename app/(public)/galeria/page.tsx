import type { Metadata } from "next";
import Image from "next/image";
import { getVisibleGallery } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Galeria",
  description: "Fotografias dos trabalhos realizados na Carmix Nails.",
};

export default async function GaleriaPage() {
  const [images, s] = await Promise.all([getVisibleGallery(), getSettings()]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6">
      <div className="text-center">
        <p className="text-[12px] uppercase tracking-[0.3em] text-malva">Galeria</p>
        <h1 className="mt-2 font-display text-4xl text-bordo sm:text-5xl">Trabalhos recentes</h1>
        <p className="mx-auto mt-4 max-w-xl text-[15.5px] text-tinta-soft">
          Uma amostra do nosso trabalho — unhas de gel com fibras, decorações e cuidados.
        </p>
      </div>

      {images.length === 0 ? (
        <p className="mx-auto mt-16 max-w-md text-center text-sm text-tinta-soft">
          A galeria está a ser preparada. Volte em breve ou fale connosco
          {s.whatsApp ? (
            <a
              href={`https://wa.me/${s.whatsApp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-malva underline underline-offset-2"
            >
              &nbsp;pelo WhatsApp
            </a>
          ) : null}
          .
        </p>
      ) : (
        <div className="mt-12 columns-2 gap-4 md:columns-3 [&>*]:mb-4">
          {images.map((img, i) => (
            <Reveal key={img.id} delay={Math.min(i * 0.04, 0.3)}>
              <figure className="relative break-inside-avoid overflow-hidden rounded-2xl bg-casca ring-1 ring-nude">
                <Image
                  src={img.imageUrl}
                  alt={img.alt || img.title || "Trabalho da Carmix Nails"}
                  width={640}
                  height={640}
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="h-auto w-full object-cover"
                />
                {img.title && (
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bordo/70 to-transparent px-4 pb-3 pt-8 text-[13px] text-creme">
                    {img.title}
                  </figcaption>
                )}
              </figure>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}