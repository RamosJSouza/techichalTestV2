import { InvalidDocumentException } from '../exceptions/invalid-document.exception.js';

type DocumentType = 'CPF' | 'CNPJ';

export class CpfCnpj {
  private constructor(
    public readonly value: string,
    public readonly type: DocumentType,
  ) {}

  public static create(raw: string): CpfCnpj {
    const digits = raw.replace(/\D/g, '');

    if (digits.length === 11) {
      if (!CpfCnpj.isValidCpf(digits)) {
        throw new InvalidDocumentException('CPF inválido.');
      }
      return new CpfCnpj(digits, 'CPF');
    }

    if (digits.length === 14) {
      if (!CpfCnpj.isValidCnpj(digits)) {
        throw new InvalidDocumentException('CNPJ inválido.');
      }
      return new CpfCnpj(digits, 'CNPJ');
    }

    throw new InvalidDocumentException(
      'Documento deve conter 11 (CPF) ou 14 (CNPJ) dígitos.',
    );
  }

  public isCpf(): boolean {
    return this.type === 'CPF';
  }

  public isCnpj(): boolean {
    return this.type === 'CNPJ';
  }

  public masked(): string {
    return CpfCnpj.maskDigits(this.value);
  }

  /** Máscara sem revalidar dígitos — uso em respostas já validadas. */
  public static maskDigits(digits: string): string {
    if (digits.length === 11) {
      return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
    }
    if (digits.length === 14) {
      return `**.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`;
    }
    return digits;
  }

  private static isValidCpf(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    const calcDigit = (base: string, factor: number): number => {
      let sum = 0;
      for (let i = 0; i < base.length; i += 1) {
        sum += Number(base[i]) * (factor - i);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };

    const d1 = calcDigit(cpf.slice(0, 9), 10);
    const d2 = calcDigit(cpf.slice(0, 10), 11);
    return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
  }

  private static isValidCnpj(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) {
      return false;
    }

    const calcDigit = (base: string, weights: number[]): number => {
      const sum = base
        .split('')
        .reduce((acc, digit, index) => acc + Number(digit) * (weights[index] ?? 0), 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1 = calcDigit(cnpj.slice(0, 12), weights1);
    const d2 = calcDigit(cnpj.slice(0, 13), weights2);
    return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
  }
}
