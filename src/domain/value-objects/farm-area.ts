import { InvalidFarmAreaException } from '../exceptions/invalid-farm-area.exception.js';

export class FarmArea {
  private constructor(
    public readonly totalArea: number,
    public readonly arableArea: number,
    public readonly vegetationArea: number,
  ) {}

  public static create(
    totalArea: number,
    arableArea: number,
    vegetationArea: number,
  ): FarmArea {
    if (!Number.isFinite(totalArea) || totalArea <= 0) {
      throw new InvalidFarmAreaException('A área total deve ser maior que zero.');
    }

    if (
      !Number.isFinite(arableArea) ||
      !Number.isFinite(vegetationArea) ||
      arableArea < 0 ||
      vegetationArea < 0
    ) {
      throw new InvalidFarmAreaException(
        'Áreas agricultável e de vegetação não podem ser negativas.',
      );
    }

    if (arableArea + vegetationArea > totalArea) {
      throw new InvalidFarmAreaException(
        `A soma da área agricultável (${arableArea}ha) e vegetação (${vegetationArea}ha) excede a área total (${totalArea}ha).`,
      );
    }

    return new FarmArea(totalArea, arableArea, vegetationArea);
  }
}
