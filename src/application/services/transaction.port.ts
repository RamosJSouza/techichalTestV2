export const TRANSACTION_PORT = Symbol('TRANSACTION_PORT');

/**
 * Porta de unidade de trabalho: executa o callback em uma única TX
 * quando a implementação de infraestrutura estiver ativa.
 * Em testes in-memory, o noop apenas executa o callback.
 */
export interface TransactionPort {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
