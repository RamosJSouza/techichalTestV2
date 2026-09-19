import { randomUUID } from 'node:crypto';
import { FarmArea } from '../value-objects/farm-area.js';

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
    private readonly _crops: Crop[],
  ) {}

  public static create(year: string, cropNames: string[] = []): Harvest {
    const crops = cropNames.map((name) => Crop.create(name));
    return new Harvest(randomUUID(), year, crops);
  }

  public static reconstitute(
    id: string,
    year: string,
    crops: Crop[],
  ): Harvest {
    return new Harvest(id, year, crops);
  }

  public get crops(): readonly Crop[] {
    return this._crops;
  }

  public addCrop(name: string): void {
    this._crops.push(Crop.create(name));
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

    return new Farm(
      randomUUID(),
      props.producerId,
      props.name.trim(),
      props.city.trim(),
      props.state.trim().toUpperCase(),
      area,
      harvests,
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

    const total = props.totalArea ?? this._area.totalArea;
    const arable = props.arableArea ?? this._area.arableArea;
    const vegetation = props.vegetationArea ?? this._area.vegetationArea;
    this._area = FarmArea.create(total, arable, vegetation);
    this.touch();
  }

  public addHarvest(year: string, crops: string[]): Harvest {
    const harvest = Harvest.create(year, crops);
    this._harvests.push(harvest);
    this.touch();
    return harvest;
  }

  public softDelete(at: Date = new Date()): void {
    this._deletedAt = at;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
