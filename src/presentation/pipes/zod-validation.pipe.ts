import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { ZodError, type ZodType } from 'zod';

interface ZodDto {
  schema: ZodType;
}

function isZodDto(metatype: unknown): metatype is ZodDto {
  return (
    typeof metatype === 'function' &&
    'schema' in metatype &&
    typeof (metatype as ZodDto).schema?.parse === 'function'
  );
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  public transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { metatype, type } = metadata;

    if (!isZodDto(metatype)) {
      // body/query sem schema Zod não passam sem filtragem
      if (type === 'body' || type === 'query') {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Payload deve ser validado por schema Zod (.strict).',
          code: 'VALIDATION_SCHEMA_REQUIRED',
        });
      }
      return value;
    }

    try {
      return metatype.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Erro de validação',
          code: 'VALIDATION_ERROR',
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      throw error;
    }
  }
}
