import type { Farm } from '../../domain/entities/farm.js';
import { validateCar } from '../../domain/policies/car-validation.policy.js';
import { calculateClimateRisk } from '../../domain/policies/climate-risk.policy.js';

export function applyFarmCompliancePolicies(
  farm: Farm,
  carEnabled: boolean,
): void {
  if (carEnabled && farm.carNumber) {
    const result = validateCar({
      carNumber: farm.carNumber.value,
      totalArea: farm.area.totalArea,
      vegetationArea: farm.area.vegetationArea,
    });
    farm.applyCarValidation(result.status);
  }

  const crops = farm.harvests.flatMap((h) => h.crops.map((c) => c.name));
  farm.setClimateRiskScore(
    calculateClimateRisk({
      city: farm.city,
      state: farm.state,
      crops,
    }),
  );
}
