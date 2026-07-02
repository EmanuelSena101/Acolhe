import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "var(--acolhe-bg)" }}
    >
      <svg width={64} height={64} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <circle cx="20" cy="20" r="20" fill="var(--acolhe-primary-light)" />
        <circle
          cx="20"
          cy="20"
          r="10"
          fill="none"
          stroke="var(--acolhe-primary)"
          strokeWidth="2.5"
        />
        <rect x="18.5" y="13" width="3" height="14" rx="1.5" fill="var(--acolhe-primary)" />
        <rect x="13" y="18.5" width="14" height="3" rx="1.5" fill="var(--acolhe-primary)" />
      </svg>

      <p
        className="mt-6 text-5xl font-bold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-primary)",
        }}
      >
        404
      </p>
      <h1
        className="mt-2 text-xl font-semibold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        Pagina nao encontrada
      </h1>
      <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
        O endereco que voce acessou nao existe ou foi movido. Verifique o link ou volte para o
        inicio.
      </p>

      <Link
        href="/dashboard"
        className="mt-6 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{
          backgroundColor: "var(--acolhe-primary)",
          boxShadow: "var(--acolhe-shadow-sm)",
        }}
      >
        Voltar ao inicio
      </Link>
    </div>
  );
}
