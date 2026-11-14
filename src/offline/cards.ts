import type { Room } from '../api/types';
import * as SQLite from 'expo-sqlite';
export type Card = {
  version: 1;
  type: 'room-card';
  messageId: string;
  obtainedAt: string;
  room: Pick<
    Room,
    | 'roomId'
    | 'hotelId'
    | 'hotelName'
    | 'roomTypeName'
    | 'district'
    | 'city'
    | 'capacity'
    | 'areaM2'
    | 'amenities'
    | 'nightlyPrice'
    | 'currency'
  >;
};
export const byteLength = (s: string) => new TextEncoder().encode(s).length;
export function decode(raw: string): Card {
  if (byteLength(raw) > 4096) throw Error('La ficha supera 4 KB');
  const c = JSON.parse(raw),
    r = c?.room;
  const text = (v: unknown, max = 160) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (
    c.version !== 1 ||
    c.type !== 'room-card' ||
    !text(c.messageId, 100) ||
    !text(c.obtainedAt, 40) ||
    !Number.isFinite(Date.parse(c.obtainedAt)) ||
    (Number.isFinite(Date.parse(c.obtainedAt)) &&
      new Date(c.obtainedAt).toISOString() !== c.obtainedAt) ||
    !r ||
    ![r.roomId, r.hotelId, r.capacity].every(
      (n) => Number.isSafeInteger(n) && n > 0,
    ) ||
    ![r.hotelName, r.roomTypeName, r.district, r.city].every((v) => text(v)) ||
    !text(r.currency, 8) ||
    !Number.isFinite(r.nightlyPrice) ||
    r.nightlyPrice < 0 ||
    (r.areaM2 != null && (!Number.isFinite(r.areaM2) || r.areaM2 <= 0)) ||
    !Array.isArray(r.amenities) ||
    r.amenities.length > 30 ||
    !r.amenities.every((v: unknown) => text(v, 100))
  )
    throw Error('Ficha inválida o versión incompatible');
  // Reject unknown fields, including accidental private data, rather than persisting them.
  if (
    Object.keys(c).some(
      (k) =>
        !['version', 'type', 'messageId', 'obtainedAt', 'room'].includes(k),
    ) ||
    Object.keys(r).some(
      (k) =>
        ![
          'roomId',
          'hotelId',
          'hotelName',
          'roomTypeName',
          'district',
          'city',
          'capacity',
          'areaM2',
          'amenities',
          'nightlyPrice',
          'currency',
        ].includes(k),
    )
  )
    throw Error('Campos no permitidos');
  return c as Card;
}
export function fromRoom(
  room: Room,
  obtainedAt = new Date().toISOString(),
): Card {
  const {
    roomId,
    hotelId,
    hotelName,
    roomTypeName,
    district,
    city,
    capacity,
    areaM2,
    amenities,
    nightlyPrice,
    currency,
  } = room;
  return decode(
    JSON.stringify({
      version: 1,
      type: 'room-card',
      messageId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      obtainedAt,
      room: {
        roomId,
        hotelId,
        hotelName,
        roomTypeName,
        district,
        city,
        capacity,
        areaM2,
        amenities,
        nightlyPrice,
        currency,
      },
    }),
  );
}
let database: ReturnType<typeof SQLite.openDatabaseAsync> | undefined;
async function db() {
  database ??= SQLite.openDatabaseAsync('public-room-cards.db').then(
    async (d) => {
      await d.execAsync(
        'CREATE TABLE IF NOT EXISTS cards (hotelId INTEGER NOT NULL, roomId INTEGER NOT NULL, obtainedAt TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY(hotelId, roomId))',
      );
      return d;
    },
  );
  return database;
}
export async function saveCard(card: Card) {
  const c = decode(JSON.stringify(card));
  await (
    await db()
  ).runAsync(
    'INSERT INTO cards VALUES (?, ?, ?, ?) ON CONFLICT(hotelId,roomId) DO UPDATE SET obtainedAt=excluded.obtainedAt,json=excluded.json WHERE excluded.obtainedAt >= cards.obtainedAt',
    c.room.hotelId,
    c.room.roomId,
    c.obtainedAt,
    JSON.stringify(c),
  );
}
export async function listCards(): Promise<Card[]> {
  return (
    await (
      await db()
    ).getAllAsync<{ json: string }>(
      'SELECT json FROM cards ORDER BY obtainedAt DESC',
    )
  ).map((row) => decode(row.json));
}
