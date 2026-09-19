import { Injectable, NotImplementedException } from '@nestjs/common';
import type { ProagroServiceInterface } from '../../../application/services/proagro.service.interface.js';

/** Stub: aguarda contrato/credenciais BCB/PROAGRO. */
@Injectable()
export class BcbProagroAdapter implements ProagroServiceInterface {
  public async calculateClimateRisk(_input: {
    city: string;
    state: string;
    crops: string[];
  }): Promise<number> {
    throw new NotImplementedException(
      'BcbProagroAdapter: contrato HTTP BCB/PROAGRO ainda não configurado. Use ENABLE_PROAGRO_RISK=false (mock).',
    );
  }
}
