import { Crop, Farm, Harvest } from '../../../domain/entities/farm.js';
import type { HarvestStatus } from '../../../domain/entities/farm.js';
import { Producer } from '../../../domain/entities/producer.js';
import {
  isExternalValidationStatus,
  parseExternalValidationStatus,
  UNKNOWN_EXTERNAL_VALIDATION_REASON,
} from '../../../domain/constants/external-validation-status.js';
import type { EsgStatus } from '../../../domain/policies/socio-environmental.policy.js';
import type { CryptoService } from '../../crypto/crypto.service.js';
import { farms, farmCrops, harvests, producers } from '../schema/index.js';

type ProducerRow = typeof producers.$inferSelect;
type FarmRow = typeof farms.$inferSelect;
type HarvestRow = typeof harvests.$inferSelect;
type CropRow = typeof farmCrops.$inferSelect;

function toEsgStatus(value: string): EsgStatus {
  if (value === 'WARNING' || value === 'BLOCKED' || value === 'APPROVED') {
    return value;
  }
  return 'APPROVED';
}

function toHarvestStatus(value: string): HarvestStatus {
  if (value === 'ARCHIVED') {
    return 'ARCHIVED';
  }
  return 'ACTIVE';
}

function toCarStatus(value: string | null): 'ACTIVE' | 'PENDING' | 'CANCELLED' | null {
  if (value === 'ACTIVE' || value === 'PENDING' || value === 'CANCELLED') {
    return value;
  }
  return null;
}

export class ProducerMapper {
  public static toDomain(
    row: ProducerRow,
    farmRows: FarmRow[],
    harvestRows: HarvestRow[],
    cropRows: CropRow[],
    crypto: CryptoService,
  ): Producer {
    const plainDocument = crypto.decrypt(row.document);
    const domainFarms = farmRows.map((farmRow) =>
      FarmMapper.toDomain(farmRow, harvestRows, cropRows),
    );

    const rawDocStatus = row.documentValidationStatus;
    const documentValidationStatus = parseExternalValidationStatus(rawDocStatus);
    const documentValidationPendingReason = isExternalValidationStatus(
      rawDocStatus,
    )
      ? row.documentValidationPendingReason
      : (row.documentValidationPendingReason ??
        UNKNOWN_EXTERNAL_VALIDATION_REASON);
    const documentValidationPendingAt =
      documentValidationStatus === 'PENDING_EXTERNAL_VALIDATION'
        ? (row.documentValidationPendingAt ?? new Date())
        : row.documentValidationPendingAt;

    return Producer.reconstitute({
      id: row.id,
      name: row.name,
      document: plainDocument,
      farms: domainFarms,
      esgStatus: toEsgStatus(row.esgStatus),
      esgCheckedAt: row.esgCheckedAt,
      documentValidationStatus,
      documentValidationPendingAt,
      documentValidationPendingReason,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  public static toPersistence(
    producer: Producer,
    crypto: CryptoService,
  ): {
    id: string;
    name: string;
    document: string;
    documentHash: string;
    esgStatus: string;
    esgCheckedAt: Date | null;
    documentValidationStatus: string;
    documentValidationPendingAt: Date | null;
    documentValidationPendingReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: producer.id,
      name: producer.name,
      document: crypto.encrypt(producer.document.value),
      documentHash: crypto.blindIndex(producer.document.value),
      esgStatus: producer.esgStatus,
      esgCheckedAt: producer.esgCheckedAt,
      documentValidationStatus: producer.documentValidationStatus,
      documentValidationPendingAt: producer.documentValidationPendingAt,
      documentValidationPendingReason:
        producer.documentValidationPendingReason,
      createdAt: producer.createdAt,
      updatedAt: producer.updatedAt,
      deletedAt: producer.deletedAt,
    };
  }
}

export class FarmMapper {
  public static toDomain(
    farmRow: FarmRow,
    harvestRows: HarvestRow[],
    cropRows: CropRow[],
  ): Farm {
    const farmHarvests = harvestRows
      .filter((h) => h.farmId === farmRow.id)
      .map((h) => {
        const crops = cropRows
          .filter((c) => c.harvestId === h.id)
          .map((c) => Crop.reconstitute(c.id, c.cropName));
        return Harvest.reconstitute(
          h.id,
          h.year,
          crops,
          toHarvestStatus(h.status),
        );
      });

    const rawTerritorial = farmRow.territorialValidationStatus;
    const territorialValidationStatus =
      parseExternalValidationStatus(rawTerritorial);
    const territorialValidationPendingReason = isExternalValidationStatus(
      rawTerritorial,
    )
      ? farmRow.territorialValidationPendingReason
      : (farmRow.territorialValidationPendingReason ??
        UNKNOWN_EXTERNAL_VALIDATION_REASON);
    const territorialValidationPendingAt =
      territorialValidationStatus === 'PENDING_EXTERNAL_VALIDATION'
        ? (farmRow.territorialValidationPendingAt ?? new Date())
        : farmRow.territorialValidationPendingAt;

    return Farm.reconstitute({
      id: farmRow.id,
      producerId: farmRow.producerId,
      name: farmRow.name,
      city: farmRow.city,
      state: farmRow.state,
      totalArea: Number(farmRow.totalArea),
      arableArea: Number(farmRow.arableArea),
      vegetationArea: Number(farmRow.vegetationArea),
      harvests: farmHarvests,
      carNumber: farmRow.carNumber,
      carStatus: toCarStatus(farmRow.carStatus),
      climateRiskScore:
        farmRow.climateRiskScore === null
          ? null
          : Number(farmRow.climateRiskScore),
      territorialValidationStatus,
      territorialValidationPendingAt,
      territorialValidationPendingReason,
      deletedAt: farmRow.deletedAt,
      createdAt: farmRow.createdAt,
      updatedAt: farmRow.updatedAt,
    });
  }

  public static toPersistence(farm: Farm): {
    id: string;
    producerId: string;
    name: string;
    city: string;
    state: string;
    totalArea: string;
    arableArea: string;
    vegetationArea: string;
    carNumber: string | null;
    carStatus: string | null;
    climateRiskScore: string | null;
    territorialValidationStatus: string;
    territorialValidationPendingAt: Date | null;
    territorialValidationPendingReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: farm.id,
      producerId: farm.producerId,
      name: farm.name,
      city: farm.city,
      state: farm.state,
      totalArea: farm.area.totalArea.toFixed(2),
      arableArea: farm.area.arableArea.toFixed(2),
      vegetationArea: farm.area.vegetationArea.toFixed(2),
      carNumber: farm.carNumber?.value ?? null,
      carStatus: farm.carStatus,
      climateRiskScore:
        farm.climateRiskScore === null
          ? null
          : farm.climateRiskScore.toFixed(2),
      territorialValidationStatus: farm.territorialValidationStatus,
      territorialValidationPendingAt: farm.territorialValidationPendingAt,
      territorialValidationPendingReason:
        farm.territorialValidationPendingReason,
      createdAt: farm.createdAt,
      updatedAt: farm.updatedAt,
      deletedAt: farm.deletedAt,
    };
  }
}
