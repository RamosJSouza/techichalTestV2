import { Injectable, NotImplementedException } from '@nestjs/common';
import type { SocioEnvironmentalServiceInterface } from '../../../application/services/socio-environmental.service.interface.js';
import type { SocioEnvironmentalCheckResult } from '../../../domain/policies/socio-environmental.policy.js';

/** Stub: aguarda contrato/credenciais SERPRO RaizTech. */
@Injectable()
export class SerproRaizTechAdapter implements SocioEnvironmentalServiceInterface {
  public async checkDocument(
    _documentDigits: string,
  ): Promise<SocioEnvironmentalCheckResult> {
    throw new NotImplementedException(
      'SerproRaizTechAdapter: contrato HTTP SERPRO ainda não configurado. Use ENABLE_ESG_COMPLIANCE=false (mock).',
    );
  }
}
