import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { ExternalValidationAuditTrigger } from '../services/external-validation-audit.port.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { LoggerPort } from '../services/logger.port.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import { CityStateMismatchException } from '../../domain/exceptions/city-state-mismatch.exception.js';
import type { TransactionPort } from '../services/transaction.port.js';

export interface RevalidateFarmResult {
  id: string;
  previousStatus: ExternalValidationStatus;
  newStatus: ExternalValidationStatus;
  reason: string | null;
}

export class RevalidateFarmTerritorialUseCase {
  public constructor(
    private readonly farms: IFarmRepository,
    private readonly brazil: BrazilDataServiceInterface,
    private readonly audit: ExternalValidationAuditPort,
    private readonly logger: LoggerPort,
    private readonly tx: TransactionPort,
  ) {}

  public async execute(
    id: string,
    trigger: ExternalValidationAuditTrigger,
  ): Promise<RevalidateFarmResult> {
    const farm = await this.farms.findById(id);
    if (!farm) {
      throw new NotFoundException(`Fazenda ${id} não encontrada.`);
    }

    const previousStatus = farm.territorialValidationStatus;
    const actor = trigger === 'admin' ? 'admin' : 'system';

    let newStatus: ExternalValidationStatus = previousStatus;
    let reason: string | null = null;

    try {
      const territorial = await assertCityBelongsToState(
        this.brazil,
        farm.city,
        farm.state,
        this.logger,
      );
      newStatus = territorial.status;
      reason = territorial.pendingReason;
      farm.setTerritorialValidationStatus(
        territorial.status,
        territorial.pendingReason,
      );
    } catch (err) {
      if (err instanceof CityStateMismatchException) {
        newStatus = 'REJECTED';
        reason = 'city_state_mismatch';
        farm.setTerritorialValidationStatus('REJECTED', reason);
      } else {
        throw err;
      }
    }

    await this.tx.run(async () => {
      await this.farms.update(farm, { harvestsChanged: false });
      await this.audit.append({
        resourceType: 'farm_territorial',
        resourceId: farm.id,
        previousStatus,
        newStatus,
        reason,
        trigger,
        actor,
      });
    });

    this.logger.log(
      `Revalidate farm territorial ${farm.id}: ${previousStatus} → ${newStatus} (${reason ?? 'ok'}) via ${trigger}`,
    );

    return { id: farm.id, previousStatus, newStatus, reason };
  }
}
