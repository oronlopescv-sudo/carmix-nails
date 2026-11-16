// Título em letra manuscrita com as varinhas laterais do desenho do dono
// ( design/site/home-desenho.png — "Os Nossos Serviços", "A Nossa Galeria", …).
export default function SectionTitle({
  children,
  className = "",
  tone = "bordo",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "bordo" | "creme";
}) {
  const line = tone === "bordo" ? "bg-malva-soft" : "bg-white/40";
  const text = tone === "bordo" ? "text-bordo" : "text-creme";
  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-5 ${className}`}>
      <span aria-hidden className={`h-px w-10 sm:w-16 ${line}`} />
      <h2 className={`font-script text-[46px] sm:text-[56px] ${text}`}>{children}</h2>
      <span aria-hidden className={`h-px w-10 sm:w-16 ${line}`} />
    </div>
  );
}
