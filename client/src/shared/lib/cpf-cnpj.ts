import { digitsOnly } from './match-producer-search';

function isRepeatedDigits(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

function isValidCpf(cpf: string): boolean {
  if (isRepeatedDigits(cpf)) {
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

function isValidCnpj(cnpj: string): boolean {
  if (isRepeatedDigits(cnpj)) {
    return false;
  }

  const calcDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce(
        (acc, digit, index) => acc + Number(digit) * (weights[index] ?? 0),
        0,
      );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(cnpj.slice(0, 12), weights1);
  const d2 = calcDigit(cnpj.slice(0, 13), weights2);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function isValidCpfCnpj(raw: string): boolean {
  const digits = digitsOnly(raw);
  if (digits.length === 11) {
    return isValidCpf(digits);
  }
  if (digits.length === 14) {
    return isValidCnpj(digits);
  }
  return false;
}
