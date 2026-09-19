import { CpfCnpj } from './cpf-cnpj.js';
import { InvalidDocumentException } from '../exceptions/invalid-document.exception.js';

describe('CpfCnpj', () => {
  it('aceita CPF válido e normaliza dígitos', () => {
    const doc = CpfCnpj.create('529.982.247-25');
    expect(doc.value).toBe('52998224725');
    expect(doc.type).toBe('CPF');
    expect(doc.isCpf()).toBe(true);
  });

  it('aceita CNPJ válido', () => {
    const doc = CpfCnpj.create('11.222.333/0001-81');
    expect(doc.value).toBe('11222333000181');
    expect(doc.type).toBe('CNPJ');
    expect(doc.isCnpj()).toBe(true);
  });

  it('rejeita CPF com dígitos verificadores inválidos', () => {
    expect(() => CpfCnpj.create('123.456.789-00')).toThrow(InvalidDocumentException);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(() => CpfCnpj.create('111.111.111-11')).toThrow(InvalidDocumentException);
  });

  it('rejeita documento com tamanho inválido', () => {
    expect(() => CpfCnpj.create('12345')).toThrow(InvalidDocumentException);
  });

  it('mascara CPF e CNPJ corretamente', () => {
    const cpf = CpfCnpj.create('529.982.247-25');
    const cnpj = CpfCnpj.create('11.222.333/0001-81');
    expect(cpf.masked()).toBe('***.982.247-**');
    expect(cnpj.masked()).toBe('**.222.333/0001-**');
  });
});
