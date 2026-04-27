import { type Papel } from "@prisma/client";

export const ROLE_HIERARCHY: Record<Papel, number> = {
  SUPERADMIN: 100,
  COORD_MUNICIPAL: 80,
  GERENTE_UBS: 60,
  ACS: 40,
  VISUALIZADOR: 20,
};

export function hasRole(userRole: Papel, requiredRoles: Papel[]): boolean {
  return requiredRoles.includes(userRole);
}

export function isAtLeast(userRole: Papel, minimumRole: Papel): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}
