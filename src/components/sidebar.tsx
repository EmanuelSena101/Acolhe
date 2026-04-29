"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Map,
  Home,
  ClipboardList,
  Calendar,
  ArrowUpDown,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "VISUALIZADOR"],
  },
  {
    href: "/territorio",
    label: "Territorio",
    icon: <Map className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/territorio/microareas",
    label: "Microareas",
    icon: <Map className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/domicilios",
    label: "Domicilios",
    icon: <Home className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"],
  },
  {
    href: "/visitas",
    label: "Visitas",
    icon: <ClipboardList className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"],
  },
  {
    href: "/minha-agenda",
    label: "Minha Agenda",
    icon: <Calendar className="h-[18px] w-[18px]" />,
    roles: ["ACS"],
  },
  {
    href: "/esus",
    label: "e-SUS APS",
    icon: <ArrowUpDown className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    icon: <BarChart3 className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "VISUALIZADOR"],
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: <Shield className="h-[18px] w-[18px]" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL"],
  },
];

const SIDEBAR_BG = "#1B4F6B";
const SIDEBAR_BORDER = "#163F57";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.papel ?? "";
  const userName = session?.user?.nome ?? "";

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));
  const initials = getInitials(userName);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: SIDEBAR_BG,
          borderRight: `1px solid ${SIDEBAR_BORDER}`,
        }}
      >
        <div
          className="flex h-14 items-center justify-between px-5"
          style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <AcolheLogo />
            <span
              className="text-lg font-semibold text-white"
              style={{ fontFamily: "var(--font-plus-jakarta), sans-serif" }}
            >
              Acolhe
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-white/70 hover:text-white lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname.startsWith(item.href + "/") &&
                  !visibleItems.some(
                    (other) =>
                      other !== item &&
                      other.href.length > item.href.length &&
                      pathname.startsWith(other.href),
                  ));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
                    style={
                      isActive
                        ? {
                            backgroundColor: "rgba(255,255,255,0.15)",
                            color: "white",
                            fontWeight: 500,
                          }
                        : { color: "rgba(232,241,246,0.65)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                        e.currentTarget.style.color = "rgba(232,241,246,0.9)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "rgba(232,241,246,0.65)";
                      }
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3" style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
          <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: "var(--acolhe-primary-light)",
                color: "var(--acolhe-primary)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs" style={{ color: "rgba(232,241,246,0.55)" }}>
                {formatRole(userRole)}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-shrink-0 rounded-md p-1.5 transition-colors"
              style={{ color: "rgba(232,241,246,0.6)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "rgba(232,241,246,0.6)";
              }}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function AcolheLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Logo Acolhe">
      <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="2.5" />
      <rect x="18.5" y="13" width="3" height="14" rx="1.5" fill="white" />
      <rect x="13" y="18.5" width="14" height="3" rx="1.5" fill="white" />
    </svg>
  );
}

function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    SUPERADMIN: "Super-administrador",
    COORD_MUNICIPAL: "Coordenador Municipal",
    GERENTE_UBS: "Gerente UBS",
    ACS: "Agente Comunitario",
    VISUALIZADOR: "Visualizador",
  };
  return map[role] ?? role;
}
