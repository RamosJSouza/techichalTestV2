import { Farm } from '../../domain/entities/farm.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import { applyFarmCompliancePolicies } from '../services/apply-farm-compliance.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { LoggerPort } from '../services/logger.port.js';

interface UpdateFarmInput {
  name?: string;
  city?: string;
  state?: string;
  totalArea?: number;
  arableArea?: number;
  vegetationArea?: number;
  carNumber?: string | null;
  harvests?: Array<{ year: string; crops: string[] }>;
}

export class UpdateFarmUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly logger: LoggerPort,
    private readonly audit: ExternalValidationAuditPort,
  ) {}

  public async execute(id: string, input: UpdateFarmInput): Promise<Farm> {
    const farm = await this.farmRepository.findById(id);
    if (!farm) {
      throw new NotFoundException(`Fazenda ${id} não encontrada.`);
    }

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

    if (input.harvests !== undefined) {
      farm.replaceHarvests(input.harvests);
    }

    applyFarmCompliancePolicies(farm);

    const updated = await this.farmRepository.update(farm, {
      harvestsChanged: input.harvests !== undefined,
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

    this.logger.log(`Farm updated: ${id}`);
    return updated;
  }
}
