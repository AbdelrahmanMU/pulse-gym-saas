import { randomBytes } from "node:crypto";
import type { IIdGenerator } from "@pulse/types";

/**
 * UUID v7 generation for **app-side** id needs (pre-generation, correlation/dedupe
 * keys, deterministic test ids) — distinct from row PKs, which Prisma/Postgres
 * generate via `@default(uuid(7))` (identifier-strategy §2). Domain code depends on
 * {@link IIdGenerator}, never `crypto.randomUUID()` directly (T-27 fitness rule).
 *
 * Layout (RFC 9562 §5.7): 48-bit big-endian Unix-ms timestamp, 4-bit version `0111`,
 * 12 random bits, 2-bit variant `10`, 62 random bits. Hand-rolled over a CSPRNG
 * (`randomBytes`) — no new dependency. Bit layout is covered by a unit test.
 */
export function uuidv7(): string {
  const bytes = randomBytes(16);

  // 48-bit timestamp → bytes[0..5], big-endian. Avoid 32-bit bitwise ops on the
  // full millisecond value (would truncate); use division/modulo instead.
  let ms = Date.now();
  for (let i = 5; i >= 0; i--) {
    bytes.writeUInt8(ms % 256, i);
    ms = Math.floor(ms / 256);
  }

  // Version 7 in the high nibble of byte 6; variant 0b10 in the high bits of byte 8.
  bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x70, 6);
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8);

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The real id generator. */
export const idGenerator: IIdGenerator = { newId: uuidv7 };
