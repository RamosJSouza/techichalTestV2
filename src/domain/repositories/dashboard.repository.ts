export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface StateDistributionItem {
  state: string;
  count: number;
  hectares: number;
  percentage: number;
}

export interface CropDistributionItem {
  crop: string;
  count: number;
  percentage: number;
}

export interface LandUseDistribution {
  arableHectares: number;
  vegetationHectares: number;
  arablePercentage: number;
  vegetationPercentage: number;
}

export interface DashboardStats {
  totalFarms: number;
  totalHectares: number;
  byState: StateDistributionItem[];
  byCrop: CropDistributionItem[];
  byLandUse: LandUseDistribution;
}

export interface IDashboardRepository {
  getStats(): Promise<DashboardStats>;
}
