"use client";

import { useState } from "react";
import { Eye, EyeOff, Shield, ArrowRight, AlertCircle } from "lucide-react";

const TEAM_COLORS = ["#1B4F6B", "#0F766E", "#D97706", "#BE123C"];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const govbrEnabled = false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha invalidos.");
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--acolhe-bg)" }}>
      {/* Painel esquerdo — marca e contexto institucional */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ backgroundColor: "var(--acolhe-primary)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <AcolheLogo size={36} />
          <span
            className="text-2xl font-semibold tracking-tight text-white"
            style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
          >
            Acolhe
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <div
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <Shield size={12} />
            <span>Plataforma oficial da Secretaria Municipal de Saude</span>
          </div>
          <h1
            className="text-4xl font-bold leading-tight text-balance text-white"
            style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
          >
            Cuidar de quem cuida comeca aqui
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "rgba(232,241,246,0.75)" }}>
            Apoio as equipes de Atencao Basica na gestao de visitas domiciliares,
            territorios e indicadores de saude da familia.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {["E1", "E2", "E3", "E4"].map((label, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white"
                style={{
                  backgroundColor: TEAM_COLORS[i],
                  borderColor: "var(--acolhe-primary)",
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <p className="text-sm" style={{ color: "rgba(232,241,246,0.65)" }}>
            <strong style={{ color: "rgba(232,241,246,0.9)" }}>Campo Limpo Paulista</strong>
            {" · "}
            <strong style={{ color: "rgba(232,241,246,0.9)" }}>Varzea Paulista</strong>
          </p>
        </div>
      </div>

      {/* Painel direito — formulario */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <AcolheLogo size={28} dark />
          <span
            className="text-xl font-semibold"
            style={{
              color: "var(--acolhe-primary)",
              fontFamily: "var(--font-plus-jakarta), sans-serif",
            }}
          >
            Acolhe
          </span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8 space-y-1">
            <h2
              className="text-2xl font-bold text-balance"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Entrar na plataforma
            </h2>
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              Use suas credenciais institucionais para acessar.
            </p>
          </div>

          <button
            type="button"
            disabled={!govbrEnabled}
            title={!govbrEnabled ? "Configurar credenciais gov.br no .env" : "Entrar com gov.br"}
            onClick={async () => {
              if (!govbrEnabled) return;
              const { signIn } = await import("next-auth/react");
              void signIn("govbr", { callbackUrl: "/dashboard" });
            }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] mb-6 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "#1351B4",
              color: "white",
              boxShadow: "var(--acolhe-shadow-md)",
            }}
            aria-label="Entrar com login gov.br"
          >
            <GovBrIcon />
            Entrar com{" "}
            <span style={{ fontFamily: "monospace", letterSpacing: "0.02em" }}>gov.br</span>
          </button>

          <div className="relative flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--acolhe-border)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--acolhe-muted-fg)" }}>
              ou use e-mail e senha
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--acolhe-border)" }} />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "var(--acolhe-danger-light)",
                  color: "var(--acolhe-danger)",
                  border: "1px solid rgba(155,28,28,0.15)",
                }}
                role="alert"
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: "var(--acolhe-fg)" }}
              >
                E-mail institucional
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nome@saude.municipio.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{
                  border: "1px solid var(--acolhe-border)",
                  backgroundColor: "var(--acolhe-card)",
                  color: "var(--acolhe-fg)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium"
                  style={{ color: "var(--acolhe-fg)" }}
                >
                  Senha
                </label>
                <button
                  type="button"
                  className="text-xs font-medium underline-offset-2 hover:underline"
                  style={{ color: "var(--acolhe-primary)" }}
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 pr-11 rounded-lg text-sm outline-none transition-all"
                  style={{
                    border: "1px solid var(--acolhe-border)",
                    backgroundColor: "var(--acolhe-card)",
                    color: "var(--acolhe-fg)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded"
                  style={{ color: "var(--acolhe-muted-fg)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--acolhe-primary)",
                color: "var(--acolhe-primary-foreground)",
                boxShadow: "var(--acolhe-shadow-sm)",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <p
            className="mt-6 text-xs text-center leading-relaxed"
            style={{ color: "var(--acolhe-muted-fg)" }}
          >
            Acesso restrito a profissionais de saude autorizados pela Secretaria Municipal.
          </p>
        </div>
      </div>
    </div>
  );
}

function AcolheLogo({ size = 32, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Logo Acolhe"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="20" fill={dark ? "#1B4F6B" : "rgba(255,255,255,0.15)"} />
      <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="2.5" />
      <rect x="18.5" y="13" width="3" height="14" rx="1.5" fill="white" />
      <rect x="13" y="18.5" width="14" height="3" rx="1.5" fill="white" />
    </svg>
  );
}

function GovBrIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#FFCD07" />
      <polygon points="16,6 26,22 6,22" fill="#009c3b" />
      <circle cx="16" cy="17" r="5" fill="#009c3b" />
      <circle cx="16" cy="17" r="3.5" fill="#002776" />
      <path d="M11.5 17 Q16 13 20.5 17" stroke="white" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
