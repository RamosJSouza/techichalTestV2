export type ProducerListCursorPayload = {
  v: 1;
  sortBy: 'createdAt' | 'name';
  sortOrder: 'asc' | 'desc';
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

  if (!isProducerListCursorPayload(raw)) {
    throw new Error('Invalid list cursor');
  }

  if (!UUID_RE.test(raw.id)) {
    throw new Error('Invalid list cursor');
  }
  if (raw.sortValue.length === 0 || raw.sortValue.length > 255) {
    throw new Error('Invalid list cursor');
  }
  if (raw.sortBy === 'createdAt' && Number.isNaN(Date.parse(raw.sortValue))) {
    throw new Error('Invalid list cursor');
  }

  return raw;
}

function isProducerListCursorPayload(
  raw: unknown,
): raw is ProducerListCursorPayload {
  if (!raw || typeof raw !== 'object') {
    return false;
  }
  const candidate = raw as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    (candidate.sortBy === 'createdAt' || candidate.sortBy === 'name') &&
    (candidate.sortOrder === 'asc' || candidate.sortOrder === 'desc') &&
    typeof candidate.sortValue === 'string' &&
    typeof candidate.id === 'string'
  );
}
