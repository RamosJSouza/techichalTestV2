export interface FarmResponse {
  id: string;
  producerId: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  carNumber: string | null;
  carStatus: string | null;
  climateRiskScore: number | null;
  harvests: Array<{
    id: string;
    year: string;
    status: string;
    crops: string[];
  }>;
}

export interface ProducerResponse {
  id: string;
  name: string;
  document: string;
  esgStatus: string;
  esgCheckedAt: string | null;
  farms: FarmResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardFilters {
  state?: string;
  crop?: string;
  harvestYear?: string;
  esgStatus?: string;
  carStatus?: string;
  minClimateRisk?: number;
  maxClimateRisk?: number;
}

export interface DashboardStats {
  totalFarms: number;
  totalHectares: number;
  averageFarmSize: number;
  carComplianceRate: number;
  esgComplianceRate: number;
  byState: Array<{
    state: string;
    count: number;
    hectares: number;
    percentage: number;
  }>;
  byCrop: Array<{
    crop: string;
    count: number;
    percentage: number;
  }>;
  byLandUse: {
    arableHectares: number;
    vegetationHectares: number;
    arablePercentage: number;
    vegetationPercentage: number;
  };
  regionalClimateRisk: {
    averageScore: number | null;
    farmsWithScore: number;
  };
  byCarStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  byEsgStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  climateRiskByState: Array<{
    state: string;
    averageScore: number | null;
    farmsWithScore: number;
  }>;
  climateRiskByCrop: Array<{
    crop: string;
    averageScore: number | null;
    farmsWithScore: number;
  }>;
  cropsByYear: Array<{
    year: string;
    crop: string;
    count: number;
  }>;
  farmsByMonth: Array<{
    month: string;
    farms: number;
    hectares: number;
  }>;
  topCities: Array<{
    city: string;
    state: string;
    farms: number;
    hectares: number;
  }>;
}

export interface CreateProducerInput {
  name: string;
  document: string;
  farms?: Array<{
    name: string;
    city: string;
    state: string;
    totalArea: number;
    arableArea: number;
    vegetationArea: number;
    harvests?: Array<{ year: string; crops: string[] }>;
    carNumber?: string;
  }>;
}

export interface UpdateProducerInput {
  name?: string;
  document?: string;
}

export interface CreateFarmInput {
  producerId: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests?: Array<{ year: string; crops: string[] }>;
  carNumber?: string;
}

export type UpdateFarmInput = {
  name?: string;
  city?: string;
  state?: string;
  totalArea?: number;
  arableArea?: number;
  vegetationArea?: number;
  harvests?: Array<{ year: string; crops: string[] }>;
  carNumber?: string | null;
};

export interface EsgComplianceResult {
  producerId: string;
  documentMasked: string;
  esgStatus: string;
  esgCheckedAt: string | null;
  hasIbamaEmbargo: boolean;
  hasSlaveLaborFlag: boolean;
  details: string[];
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  issues?: Array<{ path?: string; message?: string }>;
}
