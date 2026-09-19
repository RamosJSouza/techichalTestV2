import type { SocioEnvironmentalCheckResult } from '../../domain/policies/socio-environmental.policy.js';

export const SOCIO_ENVIRONMENTAL_SERVICE = Symbol('SOCIO_ENVIRONMENTAL_SERVICE');

export interface SocioEnvironmentalServiceInterface {
  checkDocument(documentDigits: string): Promise<SocioEnvironmentalCheckResult>;
}
