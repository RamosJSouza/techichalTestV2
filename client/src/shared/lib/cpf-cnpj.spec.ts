import { isValidCpfCnpj } from './cpf-cnpj';

describe('isValidCpfCnpj', () => {
  it('aceita CPF e CNPJ com dígitos verificadores válidos', () => {
    expect(isValidCpfCnpj('529.982.247-25')).toBe(true);
    expect(isValidCpfCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita dígito inválido e sequência repetida', () => {
    expect(isValidCpfCnpj('123.456.789-00')).toBe(false);
    expect(isValidCpfCnpj('111.111.111-11')).toBe(false);
  });
});
