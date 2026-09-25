import { Farm } from '../../domain/entities/farm.js';
import { InvalidDomainValueException } from '../../domain/exceptions/invalid-domain-value.exception.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { AppConfigPort } from '../services/app-config.port.js';
import { applyFarmCompliancePolicies } from '../services/apply-farm-compliance.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { LoggerPort } from '../services/logger.port.js';
import type { TransactionPort } from '../services/transaction.port.js';

interface UpdateFarmInput {
  name?: string;
  city?: string;
  state?: string;
  totalArea?: number;
  arableArea?: number;
  vegetationArea?: number;
  carNumber?: string | null;
  harvests?: Array<{ year: string; crops: string[] }>;
  removedYears?: string[];
}

export class UpdateFarmUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly logger: LoggerPort,
    private readonly audit: ExternalValidationAuditPort,
    private readonly tx: TransactionPort,
    private readonly config: AppConfigPort,
  ) {}

  public async execute(id: string, input: UpdateFarmInput): Promise<Farm> {
    const farm = await this.farmRepository.findById(id);
    if (!farm) {
      throw new NotFoundException(`Fazenda ${id} não encontrada.`);
    }

    const expectedUpdatedAt = new Date(farm.updatedAt.getTime());
    const previousStatus = farm.territorialValidationStatus;
    const nextCity = input.city ?? farm.city;
    const nextState = input.state ?? farm.state;
    let territorialChanged = false;

    if (input.city !== undefined || input.state !== undefined) {
      const territorial = await assertCityBelongsToState(
        this.brazilData,
        nextCity,
        nextState,
        this.logger,
      );
      farm.setTerritorialValidationStatus(
        territorial.status,
        territorial.pendingReason,
      );
      territorialChanged = true;
    }

    farm.updateDetails(input);

    const removedYears = (input.removedYears ?? [])
      .map((year) => year.trim())
      .filter((year) => year.length > 0);

    if (input.harvests !== undefined && removedYears.length > 0) {
      const sentYears = new Set(
        input.harvests.map((item) => item.year.trim()),
      );
      for (const year of removedYears) {
        if (sentYears.has(year)) {
          throw new InvalidDomainValueException(
            `Safra ${year} não pode ser atualizada e removida no mesmo pedido.`,
          );
        }
      }
    }

    if (input.harvests !== undefined) {
      farm.mergeHarvests(input.harvests);
    }
    if (removedYears.length > 0) {
      farm.removeHarvestYears(removedYears);
    }

    applyFarmCompliancePolicies(farm, this.config.isEsgCarEnabled());

    await this.tx.run(async () => {
      await this.farmRepository.update(farm, {
        harvestsChanged:
          input.harvests !== undefined || removedYears.length > 0,
        expectedUpdatedAt,
      });

      if (territorialChanged) {
        await this.audit.append({
          resourceType: 'farm_territorial',
          resourceId: farm.id,
          previousStatus,
          newStatus: farm.territorialValidationStatus,
          reason: farm.territorialValidationPendingReason,
          trigger: 'write',
          actor: 'system',
        });
      }
    });

    this.logger.log(`Farm updated: ${id}`);
    return farm;
  }
}
