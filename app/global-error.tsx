"use client";

// Última linha de defesa: erro no próprio layout raiz (o app/error.tsx não o
// cobre). Renderiza html/body sem o layout normal — o CSS do site não chega
// cá, daí os estilos inline com os mesmos tons da paleta.

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt">
      <body style={{ margin: 0 }}>
        <div
          style={{
            display: "grid",
            minHeight: "100vh",
            placeItems: "center",
            background: "#fffcf8",
            color: "#30232a",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <div>
            <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.3em", color: "#a94c80" }}>Ups</p>
            <h1 style={{ fontSize: 34, color: "#850b36", margin: "8px 0 0" }}>Algo correu mal</h1>
            <p style={{ maxWidth: 380, margin: "12px auto 0", fontSize: 15, opacity: 0.75 }}>
              Não foi possível carregar esta página. Volte a tentar dentro de momentos.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 28,
                padding: "12px 24px",
                border: 0,
                borderRadius: 9999,
                background: "#850b36",
                color: "#fffcf8",
                fontSize: 14.5,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}