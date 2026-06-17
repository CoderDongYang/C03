export type ExperimentStatus = "DRAFT" | "RUNNING" | "PAUSED" | "ARCHIVED";

export interface VersionInput {
  name: string;
  weight: number;
  code: string;
  isControl: boolean;
}

export interface Version extends VersionInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Experiment {
  id: string;
  name: string;
  slug: string;
  targetEvent: string;
  description?: string | null;
  status: ExperimentStatus;
  userId: string;
  versions: Version[];
  createdAt: string;
  updatedAt: string;
}

export interface VersionStats {
  versionId: string;
  versionName: string;
  isControl: boolean;
  exposures: number;
  conversions: number;
  conversionRate: number;
  lift: number;
  liftPercent: number;
  ciLower: number;
  ciUpper: number;
  pValue: number | null;
  isSignificant: boolean;
  allConversions: Record<string, number>;
}

export interface ExperimentStats {
  stats: {
    totalExposures: number;
    totalConversions: number;
    overallConversionRate: number;
    targetEvent: string;
  };
  versions: VersionStats[];
}
