import { randomUUID } from 'node:crypto';
import type { EsgStatus } from '../policies/socio-environmental.policy.js';
import { CpfCnpj } from '../value-objects/cpf-cnpj.js';
import { Farm } from './farm.js';

export class Producer {
  private constructor(
    public readonly id: string,
    private _name: string,
    private _document: CpfCnpj,
    private readonly _farms: Farm[],
    private _esgStatus: EsgStatus,
    private _esgCheckedAt: Date | null,
    private _deletedAt: Date | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  public static create(props: {
    name: string;
    document: string;
    farms?: Farm[];
  }): Producer {
    const document = CpfCnpj.create(props.document);
    const now = new Date();
    return new Producer(
      randomUUID(),
      props.name.trim(),
      document,
      props.farms ?? [],
      'APPROVED',
      null,
      null,
      now,
      now,
    );
  }

  public static reconstitute(props: {
    id: string;
    name: string;
    document: string;
    farms: Farm[];
    esgStatus: EsgStatus;
    esgCheckedAt: Date | null;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Producer {
    return new Producer(
      props.id,
      props.name,
      CpfCnpj.create(props.document),
      [...props.farms],
      props.esgStatus,
      props.esgCheckedAt,
      props.deletedAt,
      props.createdAt,
      props.updatedAt,
    );
  }

  public get name(): string {
    return this._name;
  }

  public get document(): CpfCnpj {
    return this._document;
  }

  public get farms(): readonly Farm[] {
    return this._farms;
  }

  public get esgStatus(): EsgStatus {
    return this._esgStatus;
  }

  public get esgCheckedAt(): Date | null {
    return this._esgCheckedAt;
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

  public updateName(name: string): void {
    this._name = name.trim();
    this.touch();
  }

  public updateDocument(document: string): void {
    this._document = CpfCnpj.create(document);
    this.touch();
  }

  public applyEsgStatus(status: EsgStatus, checkedAt: Date = new Date()): void {
    this._esgStatus = status;
    this._esgCheckedAt = checkedAt;
    this.touch();
  }

  public addFarm(farm: Farm): void {
    this._farms.push(farm);
    this.touch();
  }

  public softDelete(at: Date = new Date()): void {
    this._deletedAt = at;
    for (const farm of this._farms) {
      if (!farm.isDeleted) {
        farm.softDelete(at);
      }
    }
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
