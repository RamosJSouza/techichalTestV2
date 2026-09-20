import type { ExternalValidationStatus } from '../../domain/constants/external-validation-status.js';
import { InactiveCnpjException } from '../../domain/exceptions/inactive-cnpj.exception.js';
import type { CpfCnpj } from '../../domain/value-objects/cpf-cnpj.js';
import type { BrazilDataServiceInterface } from './brazil-data.service.interface.js';
import type { LoggerPort } from './logger.port.js';

export interface ResolveCnpjStrictResult {
  status: ExternalValidationStatus;
  pendingReason: string | null;
  razaoSocial?: string;
}

export interface ResolveCnpjRevalidateResult {
  status: ExternalValidationStatus;
  reason: string | null;
  razaoSocial?: string;
}

type ResolveCnpjStrictInput = {
  mode: 'strict';
  brazilData: BrazilDataServiceInterface;
  document: CpfCnpj;
  logger?: LoggerPort;
  pendingLogContext?: 'create' | 'update';
};

type ResolveCnpjRevalidateInput = {
  mode: 'revalidate';
  brazilData: BrazilDataServiceInterface;
  document: CpfCnpj;
};

export async function resolveCnpjDocumentValidation(
  input: ResolveCnpjStrictInput,
): Promise<ResolveCnpjStrictResult>;
export async function resolveCnpjDocumentValidation(
  input: ResolveCnpjRevalidateInput,
): Promise<ResolveCnpjRevalidateResult>;
export async function resolveCnpjDocumentValidation(
  input: ResolveCnpjStrictInput | ResolveCnpjRevalidateInput,
): Promise<ResolveCnpjStrictResult | ResolveCnpjRevalidateResult> {
  const lookup = await input.brazilData.getCnpjData(input.document.value);

  if (input.mode === 'revalidate') {
    switch (lookup.outcome) {
      case 'VALIDATED':
        if (!lookup.data.isActive) {
          return { status: 'REJECTED', reason: 'cnpj_inactive' };
        }
        return {
          status: 'VALIDATED',
          reason: null,
          razaoSocial: lookup.data.razaoSocial || undefined,
        };
      case 'PENDING_EXTERNAL_VALIDATION':
        return {
          status: 'PENDING_EXTERNAL_VALIDATION',
          reason: lookup.reason,
        };
      case 'REJECTED':
        return { status: 'REJECTED', reason: lookup.reason };
      default: {
        const _exhaustive: never = lookup;
        throw new Error(
          `Unexpected CNPJ lookup: ${JSON.stringify(_exhaustive)}`,
        );
      }
    }
  }

  switch (lookup.outcome) {
    case 'REJECTED':
      throw new InactiveCnpjException(
        lookup.reason ||
          `CNPJ ${input.document.masked()} não está com situação cadastral ATIVA.`,
      );
    case 'PENDING_EXTERNAL_VALIDATION': {
      const ctx = input.pendingLogContext === 'update' ? ' on update' : '';
      input.logger?.warn(
        `CNPJ ${input.document.masked()} pending external validation${ctx} (BrasilAPI unavailable): ${lookup.reason}`,
      );
      return {
        status: 'PENDING_EXTERNAL_VALIDATION',
        pendingReason: lookup.reason,
      };
    }
    case 'VALIDATED':
      if (!lookup.data.isActive) {
        throw new InactiveCnpjException(
          `CNPJ ${input.document.masked()} não está com situação cadastral ATIVA.`,
        );
      }
      return {
        status: 'VALIDATED',
        pendingReason: null,
        razaoSocial: lookup.data.razaoSocial || undefined,
      };
    default: {
      const _exhaustive: never = lookup;
      throw new Error(`Unexpected CNPJ lookup: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
