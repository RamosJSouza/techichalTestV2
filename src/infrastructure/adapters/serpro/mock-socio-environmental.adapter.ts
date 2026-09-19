import { Injectable } from '@nestjs/common';
import type { SocioEnvironmentalServiceInterface } from '../../../application/services/socio-environmental.service.interface.js';
import type { SocioEnvironmentalCheckResult } from '../../../domain/policies/socio-environmental.policy.js';

/**
 * Mock determinístico: documento terminado em 0 → restrição ESG.
 */
@Injectable()
export class MockSocioEnvironmentalAdapter
  implements SocioEnvironmentalServiceInterface
{
  public async checkDocument(
    documentDigits: string,
  ): Promise<SocioEnvironmentalCheckResult> {
    const restricted = documentDigits.endsWith('0');
    if (!restricted) {
      return {
        hasIbamaEmbargo: false,
        hasSlaveLaborFlag: false,
        details: [],
      };
    }
    return {
      hasIbamaEmbargo: true,
      hasSlaveLaborFlag: false,
      details: ['Mock: documento terminado em 0 simula embargo IBAMA'],
    };
  }
}
