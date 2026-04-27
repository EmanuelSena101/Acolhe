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
  Upload,
  Download,
  BarChart3,
  LogOut,
  User,
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
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "VISUALIZADOR"],
  },
  {
    href: "/territorio",
    label: "Territorio",
    icon: <Map className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/territorio/microareas",
    label: "Microareas",
    icon: <Map className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/domicilios",
    label: "Domicilios",
    icon: <Home className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"],
  },
  {
    href: "/visitas",
    label: "Visitas",
    icon: <ClipboardList className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"],
  },
  {
    href: "/minha-agenda",
    label: "Minha Agenda",
    icon: <Calendar className="h-5 w-5" />,
    roles: ["ACS"],
  },
  {
    href: "/importacao",
    label: "Importacao",
    icon: <Upload className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/exportacao",
    label: "Exportacao",
    icon: <Download className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"],
  },
  {
    href: "/relatorios",
    label: "Relatorios",
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "VISUALIZADOR"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRole = session?.user?.papel ?? "";
  const userName = session?.user?.nome ?? "";

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-lg transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="text-xl font-bold text-blue-900">
            SaudeTerritorio
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname.startsWith(item.href + "/") &&
                  !visibleItems.some((other) => other !== item && pathname.startsWith(other.href)));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <User className="h-4 w-4 text-blue-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
