/**
 * Cursor opaco keyset para listagem de produtores (createdAt|name + id).
 */
export type ProducerListCursorPayload = {
  v: 1;
  sortBy: 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';
  /** ISO string (createdAt) ou nome */
  sortValue: string;
  id: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeProducerListCursor(
  payload: ProducerListCursorPayload,
): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeProducerListCursor(
  cursor: string,
): ProducerListCursorPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid list cursor');
  }
  if (
    !raw ||
    typeof raw !== 'object' ||
    (raw as ProducerListCursorPayload).v !== 1 ||
    !((raw as ProducerListCursorPayload).sortBy === 'createdAt' ||
      (raw as ProducerListCursorPayload).sortBy === 'name') ||
    !((raw as ProducerListCursorPayload).sortOrder === 'asc' ||
      (raw as ProducerListCursorPayload).sortOrder === 'desc') ||
    typeof (raw as ProducerListCursorPayload).sortValue !== 'string' ||
    typeof (raw as ProducerListCursorPayload).id !== 'string'
  ) {
    throw new Error('Invalid list cursor');
  }

  const payload = raw as ProducerListCursorPayload;
  if (!UUID_RE.test(payload.id)) {
    throw new Error('Invalid list cursor');
  }
  if (payload.sortValue.length === 0 || payload.sortValue.length > 255) {
    throw new Error('Invalid list cursor');
  }
  if (payload.sortBy === 'createdAt') {
    const ms = Date.parse(payload.sortValue);
    if (Number.isNaN(ms)) {
      throw new Error('Invalid list cursor');
    }
  }

  return payload;
}
