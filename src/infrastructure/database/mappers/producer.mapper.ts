import { Crop, Farm, Harvest } from '../../../domain/entities/farm.js';
import { Producer } from '../../../domain/entities/producer.js';
import type { CryptoService } from '../../crypto/crypto.service.js';
import { farms, farmCrops, harvests, producers } from '../schema/index.js';

type ProducerRow = typeof producers.$inferSelect;
type FarmRow = typeof farms.$inferSelect;
type HarvestRow = typeof harvests.$inferSelect;
type CropRow = typeof farmCrops.$inferSelect;

export class ProducerMapper {
  public static toDomain(
    row: ProducerRow,
    farmRows: FarmRow[],
    harvestRows: HarvestRow[],
    cropRows: CropRow[],
    crypto: CryptoService,
  ): Producer {
    const plainDocument = crypto.decrypt(row.document);
    const domainFarms = farmRows.map((farmRow) => {
      const farmHarvests = harvestRows
        .filter((h) => h.farmId === farmRow.id)
        .map((h) => {
          const crops = cropRows
            .filter((c) => c.harvestId === h.id)
            .map((c) => Crop.reconstitute(c.id, c.cropName));
          return Harvest.reconstitute(h.id, h.year, crops);
        });

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
        deletedAt: farmRow.deletedAt,
        createdAt: farmRow.createdAt,
        updatedAt: farmRow.updatedAt,
      });
    });

    return Producer.reconstitute({
      id: row.id,
      name: row.name,
      document: plainDocument,
      farms: domainFarms,
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
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  } {
    return {
      id: producer.id,
      name: producer.name,
      document: crypto.encrypt(producer.document.value),
      documentHash: crypto.blindIndex(producer.document.value),
      createdAt: producer.createdAt,
      updatedAt: producer.updatedAt,
      deletedAt: producer.deletedAt,
    };
  }
}

export class FarmMapper {
  public static toPersistence(farm: Farm): {
    id: string;
    producerId: string;
    name: string;
    city: string;
    state: string;
    totalArea: string;
    arableArea: string;
    vegetationArea: string;
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
      createdAt: farm.createdAt,
      updatedAt: farm.updatedAt,
      deletedAt: farm.deletedAt,
    };
  }
}
