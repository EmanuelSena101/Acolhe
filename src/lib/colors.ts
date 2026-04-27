export const TEAM_COLORS = [
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#9B59B6",
  "#1ABC9C",
  "#E67E22",
  "#34495E",
  "#16A085",
  "#C0392B",
  "#2980B9",
  "#27AE60",
] as const;

export function getTeamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

export const STATUS_COLORS = {
  em_dia: "#2ECC71",
  proximo_prazo: "#F39C12",
  atrasado: "#E74C3C",
} as const;
