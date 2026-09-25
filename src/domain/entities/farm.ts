import { randomUUID } from 'node:crypto';
import type { ExternalValidationStatus } from '../constants/external-validation-status.js';
import { InvalidDomainValueException } from '../exceptions/invalid-domain-value.exception.js';
import { CarNumber } from '../value-objects/car-number.js';
import { FarmArea } from '../value-objects/farm-area.js';

type CarStatus = 'ACTIVE' | 'PENDING' | 'CANCELLED';
export type HarvestStatus = 'ACTIVE' | 'ARCHIVED';

export class Crop {
  private constructor(
    public readonly id: string,
    public readonly name: string,
  ) {}

  public static create(name: string): Crop {
    return new Crop(randomUUID(), name.trim());
  }

  public static reconstitute(id: string, name: string): Crop {
    return new Crop(id, name);
  }
}

export class Harvest {
  private constructor(
    public readonly id: string,
    public readonly year: string,
    private _status: HarvestStatus,
    private readonly _crops: Crop[],
  ) {}

  public static create(year: string, cropNames: string[] = []): Harvest {
    const crops = cropNames.map((name) => Crop.create(name));
    return new Harvest(randomUUID(), year, 'ACTIVE', crops);
  }

  public static reconstitute(
    id: string,
    year: string,
    crops: Crop[],
    status: HarvestStatus = 'ACTIVE',
  ): Harvest {
    return new Harvest(id, year, status, crops);
  }

  public get status(): HarvestStatus {
    return this._status;
  }

  public get crops(): readonly Crop[] {
    return this._crops;
  }

  public replaceCrops(cropNames: string[]): void {
    const next = cropNames.map((name) => Crop.create(name));
    this._crops.splice(0, this._crops.length, ...next);
  }

  public archive(): void {
    this._status = 'ARCHIVED';
  }
}

export class Farm {
  private constructor(
    public readonly id: string,
    public readonly producerId: string,
    private _name: string,
    private _city: string,
    private _state: string,
    private _area: FarmArea,
    private readonly _harvests: Harvest[],
    private _carNumber: CarNumber | null,
    private _climateRiskScore: number | null,
    private _carStatus: CarStatus | null,
    private _territorialValidationStatus: ExternalValidationStatus,
    private _territorialValidationPendingAt: Date | null,
    private _territorialValidationPendingReason: string | null,
    private _deletedAt: Date | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  public static create(props: {
    producerId: string;
    name: string;
    city: string;
    state: string;
    totalArea: number;
    arableArea: number;
    vegetationArea: number;
    harvests?: Array<{ year: string; crops: string[] }>;
    carNumber?: string;
    territorialValidationStatus?: ExternalValidationStatus;
    territorialValidationPendingReason?: string | null;
  }): Farm {
    const area = FarmArea.create(
      props.totalArea,
      props.arableArea,
      props.vegetationArea,
    );
    const now = new Date();
    const harvests = (props.harvests ?? []).map((h) =>
      Harvest.create(h.year, h.crops),
    );
    const carNumber =
      props.carNumber !== undefined ? CarNumber.create(props.carNumber) : null;
    const status = props.territorialValidationStatus ?? 'VALIDATED';
    const pending =
      status === 'PENDING_EXTERNAL_VALIDATION'
        ? {
            at: now,
            reason: props.territorialValidationPendingReason ?? 'unknown',
          }
        : { at: null, reason: null };

    return new Farm(
      randomUUID(),
      props.producerId,
      props.name.trim(),
      props.city.trim(),
      props.state.trim().toUpperCase(),
      area,
      harvests,
      carNumber,
      null,
      null,
      status,
      pending.at,
      pending.reason,
      null,
      now,
      now,
    );
  }

  public static reconstitute(props: {
    id: string;
    producerId: string;
    name: string;
    city: string;
    state: string;
    totalArea: number;
    arableArea: number;
    vegetationArea: number;
    harvests: Harvest[];
    carNumber: string | null;
    carStatus: CarStatus | null;
    climateRiskScore: number | null;
    territorialValidationStatus: ExternalValidationStatus;
    territorialValidationPendingAt?: Date | null;
    territorialValidationPendingReason?: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Farm {
    const area = FarmArea.create(
      props.totalArea,
      props.arableArea,
      props.vegetationArea,
    );
    return new Farm(
      props.id,
      props.producerId,
      props.name,
      props.city,
      props.state,
      area,
      [...props.harvests],
      props.carNumber ? CarNumber.create(props.carNumber) : null,
      props.climateRiskScore,
      props.carStatus,
      props.territorialValidationStatus,
      props.territorialValidationPendingAt ?? null,
      props.territorialValidationPendingReason ?? null,
      props.deletedAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  public get name(): string {
    return this._name;
  }

  public get city(): string {
    return this._city;
  }

  public get state(): string {
    return this._state;
  }

  public get area(): FarmArea {
    return this._area;
  }

  public get harvests(): readonly Harvest[] {
    return this._harvests;
  }

  public get carNumber(): CarNumber | null {
    return this._carNumber;
  }

  public get climateRiskScore(): number | null {
    return this._climateRiskScore;
  }

  public get carStatus(): CarStatus | null {
    return this._carStatus;
  }

  public get territorialValidationStatus(): ExternalValidationStatus {
    return this._territorialValidationStatus;
  }

  public get territorialValidationPendingAt(): Date | null {
    return this._territorialValidationPendingAt;
  }

  public get territorialValidationPendingReason(): string | null {
    return this._territorialValidationPendingReason;
  }

  public get deletedAt(): Date | null {
    return this._deletedAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  public updateDetails(props: {
    name?: string;
    city?: string;
    state?: string;
    totalArea?: number;
    arableArea?: number;
    vegetationArea?: number;
    carNumber?: string | null;
  }): void {
    if (props.name !== undefined) {
      this._name = props.name.trim();
    }
    if (props.city !== undefined) {
      this._city = props.city.trim();
    }
    if (props.state !== undefined) {
      this._state = props.state.trim().toUpperCase();
    }
    if (props.carNumber !== undefined) {
      this._carNumber =
        props.carNumber === null ? null : CarNumber.create(props.carNumber);
      if (props.carNumber === null) {
        this._carStatus = null;
      }
    }

    const total = props.totalArea ?? this._area.totalArea;
    const arable = props.arableArea ?? this._area.arableArea;
    const vegetation = props.vegetationArea ?? this._area.vegetationArea;
    this._area = FarmArea.create(total, arable, vegetation);
    this.touch();
  }

  public replaceHarvests(
    items: Array<{ year: string; crops: string[] }>,
  ): void {
    this._harvests.splice(
      0,
      this._harvests.length,
      ...items.map((item) => Harvest.create(item.year, item.crops)),
    );
    this.touch();
  }

  public mergeHarvests(
    items: Array<{ year: string; crops: string[] }>,
  ): void {
    const normalized = items.map((item) => ({
      year: item.year.trim(),
      crops: item.crops,
    }));
    const seen = new Set<string>();
    for (const item of normalized) {
      if (seen.has(item.year)) {
        throw new InvalidDomainValueException(
          `Safra duplicada no mesmo pedido: ${item.year}.`,
        );
      }
      seen.add(item.year);
    }

    for (const item of normalized) {
      const existing = this._harvests.find(
        (harvest) => harvest.year.trim() === item.year,
      );
      if (existing) {
        existing.replaceCrops(item.crops);
      } else {
        this._harvests.push(Harvest.create(item.year, item.crops));
      }
    }
    this.touch();
  }

  public removeHarvestYears(years: string[]): void {
    const drop = new Set(
      years.map((year) => year.trim()).filter((year) => year.length > 0),
    );
    if (drop.size === 0) {
      return;
    }
    const next = this._harvests.filter(
      (harvest) => !drop.has(harvest.year.trim()),
    );
    if (next.length === this._harvests.length) {
      return;
    }
    this._harvests.splice(0, this._harvests.length, ...next);
    this.touch();
  }

  public applyCarValidation(status: CarStatus): void {
    this._carStatus = status;
    this.touch();
  }

  public setClimateRiskScore(score: number): void {
    this._climateRiskScore = Number(score.toFixed(2));
    this.touch();
  }

  public setTerritorialValidationStatus(
    status: ExternalValidationStatus,
    pendingReason: string | null = null,
  ): void {
    this._territorialValidationStatus = status;
    if (status === 'PENDING_EXTERNAL_VALIDATION') {
      this._territorialValidationPendingAt = new Date();
      this._territorialValidationPendingReason = pendingReason ?? 'unknown';
    } else if (status === 'REJECTED') {
      this._territorialValidationPendingAt = new Date();
      this._territorialValidationPendingReason = pendingReason ?? 'rejected';
    } else {
      this._territorialValidationPendingAt = null;
      this._territorialValidationPendingReason = null;
    }
    this.touch();
  }

  public softDelete(at: Date = new Date()): void {
    this._deletedAt = at;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
