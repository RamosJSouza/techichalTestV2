import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodValidationPipe as NestjsZodValidationPipe } from 'nestjs-zod';

/**
 * Pipe global de validação baseado em Zod (nestjs-zod).
 * Reexportado para manter o caminho previsto pela arquitetura.
 */
@Injectable()
export class ZodValidationPipe
  extends NestjsZodValidationPipe
  implements PipeTransform
{
  public override transform(value: unknown, metadata: ArgumentMetadata): unknown {
    return super.transform(value, metadata);
  }
}
