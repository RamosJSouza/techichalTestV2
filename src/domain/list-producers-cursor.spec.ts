import {
  decodeProducerListCursor,
  encodeProducerListCursor,
  type ProducerListCursorPayload,
} from './list-producers-cursor.js';

describe('list-producers-cursor', () => {
  const payload: ProducerListCursorPayload = {
    v: 1,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    sortValue: '2024-01-01T00:00:00.000Z',
    id: '11111111-1111-4111-8111-111111111111',
  };

  it('round-trip encode/decode', () => {
    const encoded = encodeProducerListCursor(payload);
    expect(decodeProducerListCursor(encoded)).toEqual(payload);
  });

  it('rejeita cursor inválido', () => {
    expect(() => decodeProducerListCursor('not-base64!!!')).toThrow(
      /Invalid list cursor/,
    );
    expect(() =>
      decodeProducerListCursor(
        Buffer.from(JSON.stringify({ v: 2 }), 'utf8').toString('base64url'),
      ),
    ).toThrow(/Invalid list cursor/);
  });

  it('rejeita id não-UUID e createdAt não-ISO', () => {
    expect(() =>
      decodeProducerListCursor(
        encodeProducerListCursor({
          ...payload,
          id: 'not-a-uuid',
        }),
      ),
    ).toThrow(/Invalid list cursor/);
    expect(() =>
      decodeProducerListCursor(
        encodeProducerListCursor({
          ...payload,
          sortValue: 'ontem',
        }),
      ),
    ).toThrow(/Invalid list cursor/);
  });
});
