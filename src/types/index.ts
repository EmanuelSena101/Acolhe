import {
  type Papel,
  type StatusVisita,
  type TipoDomicilio,
  type Sexo,
  type StatusJob,
} from "@prisma/client";

export type { Papel, StatusVisita, TipoDomicilio, Sexo, StatusJob };

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeoJSONMultiPolygon {
  type: "MultiPolygon";
  coordinates: number[][][][];
}

export interface ImportLogEntry {
  linha: number;
  coluna: string;
  valor: string;
  erro: string;
  severity: "ERROR" | "WARNING";
}

export interface CondicoesMoradia {
  abastecimentoAgua?: string;
  tratamentoAgua?: string;
  tipoEsgoto?: string;
  destinoLixo?: string;
  energiaEletrica?: boolean;
  comodos?: number;
}

export interface AgendaVisitaItem {
  domicilioId: string;
  ordem: number;
  tempoEstimadoMin?: number;
}
