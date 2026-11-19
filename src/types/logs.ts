// src/types/logs.ts
// D1 bazasida saqlanadigan tajriba natijalari bilan bog'liq tiplar.

export type ResultSummary = Record<string, string | number | boolean>;

export interface ExperimentLog {
  id: number;
  studentName: string;
  subjectId: string;
  simulationId: string;
  simulationTitle: string;
  resultSummary: ResultSummary;
  createdAt: string;
}

export interface CreateLogInput {
  studentName: string;
  subjectId: string;
  simulationId: string;
  simulationTitle: string;
  resultSummary: ResultSummary;
}
