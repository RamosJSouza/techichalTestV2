export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface DashboardFilters {
  state?: string;
  crop?: string;
  harvestYear?: string;
  esgStatus?: string;
  carStatus?: string;
  minClimateRisk?: number;
  maxClimateRisk?: number;
}

interface StateDistributionItem {
  state: string;
  count: number;
  hectares: number;
  percentage: number;
}

interface CropDistributionItem {
  crop: string;
  count: number;
  percentage: number;
}

interface LandUseDistribution {
  arableHectares: number;
  vegetationHectares: number;
  arablePercentage: number;
  vegetationPercentage: number;
}

interface CarStatusItem {
  status: string;
  count: number;
  percentage: number;
}

interface EsgStatusItem {
  status: string;
  count: number;
  percentage: number;
}

interface ClimateRiskByStateItem {
  state: string;
  averageScore: number | null;
  farmsWithScore: number;
}

interface ClimateRiskByCropItem {
  crop: string;
  averageScore: number | null;
  farmsWithScore: number;
}

interface CropByYearItem {
  year: string;
  crop: string;
  count: number;
}

interface FarmsByMonthItem {
  month: string;
  farms: number;
  hectares: number;
}

interface TopCityItem {
  city: string;
  state: string;
  farms: number;
  hectares: number;
}

export interface DashboardStats {
  totalFarms: number;
  totalHectares: number;
  averageFarmSize: number;
  carComplianceRate: number;
  esgComplianceRate: number;
  byState: StateDistributionItem[];
  byCrop: CropDistributionItem[];
  byLandUse: LandUseDistribution;
  regionalClimateRisk: {
    averageScore: number | null;
    farmsWithScore: number;
  };
  byCarStatus: CarStatusItem[];
  byEsgStatus: EsgStatusItem[];
  climateRiskByState: ClimateRiskByStateItem[];
  climateRiskByCrop: ClimateRiskByCropItem[];
  cropsByYear: CropByYearItem[];
  farmsByMonth: FarmsByMonthItem[];
  topCities: TopCityItem[];
}

export type DashboardSummary = Pick<
  DashboardStats,
  | 'totalFarms'
  | 'totalHectares'
  | 'averageFarmSize'
  | 'carComplianceRate'
  | 'esgComplianceRate'
  | 'byState'
  | 'byCrop'
  | 'byLandUse'
  | 'regionalClimateRisk'
  | 'byCarStatus'
  | 'byEsgStatus'
>;

export type DashboardAnalytics = Pick<
  DashboardStats,
  | 'climateRiskByState'
  | 'climateRiskByCrop'
  | 'cropsByYear'
  | 'farmsByMonth'
  | 'topCities'
>;

export interface IDashboardRepository {
  getStats(filters?: DashboardFilters): Promise<DashboardStats>;
  getSummary(filters?: DashboardFilters): Promise<DashboardSummary>;
  getAnalytics(filters?: DashboardFilters): Promise<DashboardAnalytics>;
}
