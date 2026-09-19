import { SetMetadata } from '@nestjs/common';

export const MASK_PII_KEY = 'mask_pii';

export type MaskPiiType = 'CPF_CNPJ';

export interface MaskPiiOptions {
  type: MaskPiiType;
}

export const MaskPII = (options: MaskPiiOptions = { type: 'CPF_CNPJ' }) =>
  SetMetadata(MASK_PII_KEY, options);
