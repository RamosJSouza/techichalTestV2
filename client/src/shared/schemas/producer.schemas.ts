import { z } from 'zod';

const requiredString = (label = 'Obrigatório') =>
  z
    .string({ error: () => ({ message: label }) })
    .min(1, { message: label });

const optionalCarNumber = z
  .string()
  .min(1, { message: 'CAR inválido' })
  .max(100)
  .nullish();

const coercePositive = z.coerce
  .number({ error: () => ({ message: 'Informe um número válido' }) })
  .positive({ message: 'Deve ser maior que zero' });

const coerceNonNegative = z.coerce
  .number({ error: () => ({ message: 'Informe um número válido' }) })
  .nonnegative({ message: 'Não pode ser negativo' });

const harvestSchema = z
  .object({
    year: requiredString('Ano da safra obrigatório').max(10),
    crops: z.array(z.string().min(1)),
  })
  .strict();

export const farmAreasSchema = z
  .object({
    name: requiredString('Nome da fazenda obrigatório').max(255),
    city: requiredString('Cidade obrigatória').max(100),
    state: z
      .string({ error: () => ({ message: 'UF obrigatória' }) })
      .length(2, { message: 'UF com 2 letras' }),
    totalArea: coercePositive,
    arableArea: coerceNonNegative,
    vegetationArea: coerceNonNegative,
    harvests: z.array(harvestSchema).optional(),
    carNumber: optionalCarNumber,
  })
  .strict()
  .refine(
    (data) => data.arableArea + data.vegetationArea <= data.totalArea,
    {
      message: 'Área agricultável + vegetação deve ser ≤ área total',
      path: ['totalArea'],
    },
  );

export const wizardStep0Schema = z.object({
  name: requiredString('Nome obrigatório').max(255),
  document: z
    .string({ error: () => ({ message: 'Documento obrigatório' }) })
    .min(11, { message: 'Documento deve ter ao menos 11 caracteres' })
    .max(18),
});

export const wizardStep0EditSchema = z.object({
  name: requiredString('Nome obrigatório').max(255),
});

export const wizardSchema = z.object({
  name: requiredString('Nome obrigatório').max(255),
  document: z
    .string({ error: () => ({ message: 'Documento obrigatório' }) })
    .min(11, { message: 'Documento deve ter ao menos 11 caracteres' })
    .max(18),
  farm: farmAreasSchema,
});

export type FarmAreasFormValues = z.infer<typeof farmAreasSchema>;
export type WizardFormValues = z.input<typeof wizardSchema>;
