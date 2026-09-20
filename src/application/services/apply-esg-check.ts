import { SocioEnvironmentalBlockException } from '../../domain/exceptions/socio-environmental-block.exception.js';
import {
  localSocioEnvironmentalCheck,
  SocioEnvironmentalPolicy,
  type EsgStatus,
} from '../../domain/policies/socio-environmental.policy.js';
import type { LoggerPort } from './logger.port.js';

export async function applyEsgCheck(input: {
  documentDigits: string;
  strictMode: boolean;
  logger: LoggerPort;
}): Promise<EsgStatus> {
  const check = localSocioEnvironmentalCheck(input.documentDigits);
  const decision = SocioEnvironmentalPolicy.decide(check, input.strictMode);

  if (decision.blocked) {
    throw new SocioEnvironmentalBlockException(
      `Cadastro bloqueado por compliance ESG: ${check.details.join('; ') || 'restrição socioambiental'}.`,
    );
  }

  if (decision.status === 'WARNING') {
    input.logger.warn(
      `ESG WARNING for document ending ...${input.documentDigits.slice(-4)}: ${check.details.join('; ')}`,
    );
  }

  return decision.status;
}
