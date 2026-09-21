import { Farm } from '../../domain/entities/farm.js';
import { NotFoundException } from '../../domain/exceptions/not-found.exception.js';
import type { IFarmRepository } from '../../domain/repositories/farm.repository.js';
import type { IProducerRepository } from '../../domain/repositories/producer.repository.js';
import type { AppConfigPort } from '../services/app-config.port.js';
import { applyEsgCheck } from '../services/apply-esg-check.js';
import { applyFarmCompliancePolicies } from '../services/apply-farm-compliance.js';
import { assertCityBelongsToState } from '../services/assert-city-belongs-to-state.js';
import type { BrazilDataServiceInterface } from '../services/brazil-data.service.interface.js';
import type { ExternalValidationAuditPort } from '../services/external-validation-audit.port.js';
import type { LoggerPort } from '../services/logger.port.js';
import type { TransactionPort } from '../services/transaction.port.js';

interface CreateFarmInput {
  producerId: string;
  name: string;
  city: string;
  state: string;
  totalArea: number;
  arableArea: number;
  vegetationArea: number;
  harvests?: Array<{ year: string; crops: string[] }>;
  carNumber?: string;
}

export class CreateFarmUseCase {
  public constructor(
    private readonly farmRepository: IFarmRepository,
    private readonly producerRepository: IProducerRepository,
    private readonly brazilData: BrazilDataServiceInterface,
    private readonly config: AppConfigPort,
    private readonly logger: LoggerPort,
    private readonly audit: ExternalValidationAuditPort,
    private readonly tx: TransactionPort,
  ) {}

  public async execute(input: CreateFarmInput): Promise<Farm> {
    const producer = await this.producerRepository.findById(input.producerId);
    if (!producer) {
      throw new NotFoundException(
        `Produtor ${input.producerId} não encontrado.`,
      );
    }

    await applyEsgCheck({
      documentDigits: producer.document.value,
      strictMode: this.config.isEsgStrictMode(),
      logger: this.logger,
    });

    if (producer.documentValidationStatus === 'PENDING_EXTERNAL_VALIDATION') {
      this.logger.warn(
        `Farm create with producer ${producer.id} still pending document validation`,
      );
    }

    const territorial = await assertCityBelongsToState(
      this.brazilData,
      input.city,
      input.state,
      this.logger,
    );

    const farm = Farm.create({
      ...input,
      territorialValidationStatus: territorial.status,
      territorialValidationPendingReason: territorial.pendingReason,
    });
    applyFarmCompliancePolicies(farm);

    await this.tx.run(async () => {
      await this.farmRepository.save(farm);
      await this.audit.append({
        resourceType: 'farm_territorial',
        resourceId: farm.id,
        previousStatus: 'VALIDATED',
        newStatus: farm.territorialValidationStatus,
        reason: farm.territorialValidationPendingReason,
        trigger: 'write',
        actor: 'system',
      });
    });
    this.logger.log(`Farm registered: ${farm.id}`);
    return farm;
  }
}
