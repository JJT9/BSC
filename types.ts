
export enum PerspectiveKey {
  FINANCIAL = 'FINANCIAL',
  CUSTOMER = 'CUSTOMER',
  INTERNAL_PROCESS = 'INTERNAL_PROCESS',
  LEARNING_GROWTH = 'LEARNING_GROWTH',
}

export interface Perspective {
  key: PerspectiveKey;
  label: string;
  description: string;
}

export interface PerspectiveData {
  objectives: string;
  metrics: string;
  targets: string;
  initiatives: string;
}

export type AllPerspectivesData = Record<PerspectiveKey, PerspectiveData>;
