import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

/**
 * Password hashing — the **single** scrypt scheme shared by the database seed
 * (hash-time) and the Authentication Adapter (verify-time), so the two can never
 * drift (constitution §5: never duplicate security logic).
 *
 * scrypt is a strong, memory-hard adaptive KDF and a **Node platform primitive** —
 * not custom crypto (security-guidelines.md "Auth.js/NextAuth only — never roll our
 * own crypto"; CLAUDE.md §9). It satisfies the "strong adaptive algorithm" intent;
 * `security-guidelines.md` *names* bcrypt/argon2, so this choice is flagged as
 * human-vetoable (switching would be a new, human-owned dependency).
 *
 * Stored format (self-describing — records the params used):
 *   `scrypt$n=<N>,r=<r>,p=<p>$<salt-base64>$<derivedKey-base64>`
 * MVP verifies only the current param set; changing N/r/p later requires a
 * rehash-on-next-login path (a stored hash with different params won't verify).
 *
 * **Server-only** (`node:crypto`): this module is a subpath export and is never
 * re-exported from the browser-safe `@pulse/auth` index.
 */

// Cost parameters (advisor-reviewed). N=2^15 memory-hard work factor.
const N = 32_768;
const R = 8;
const P = 1;
const KEY_LENGTH = 32; // ≥ 32-byte derived key
const SALT_LENGTH = 16; // ≥ 16-byte random salt
// scrypt needs ~128*N*r bytes (≈ 32 MiB here); raise maxmem above Node's 32 MiB default.
const MAX_MEM = 64 * 1024 * 1024;

const PREFIX = "scrypt";

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Hash a plaintext password into the self-describing stored format. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await deriveKey(password, salt);
  return `${PREFIX}$n=${N},r=${R},p=${P}$${salt.toString("base64")}$${derived.toString("base64")}`;
}

interface ParsedHash {
  readonly salt: Buffer;
  readonly key: Buffer;
}

/** Parse a stored hash; returns `null` for any malformed/sentinel/unknown value. */
function parseStoredHash(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 4) return null;
  const [scheme, params, saltB64, keyB64] = parts;
  if (scheme !== PREFIX) return null;
  if (params !== `n=${N},r=${R},p=${P}`) return null;
  try {
    const salt = Buffer.from(saltB64 ?? "", "base64");
    const key = Buffer.from(keyB64 ?? "", "base64");
    if (salt.length !== SALT_LENGTH || key.length !== KEY_LENGTH) return null;
    return { salt, key };
  } catch {
    return null;
  }
}

// A fixed dummy salt used to spend comparable scrypt work when the stored hash is
// missing/malformed/sentinel — so verification timing never reveals whether an
// account exists or has a usable credential (anti-enumeration; security-guidelines).
const DUMMY_SALT = Buffer.alloc(SALT_LENGTH, 0x9e);

/**
 * Verify a plaintext password against a stored hash. Returns `false` (never throws)
 * for a wrong password **or** a malformed/sentinel/non-loginable hash — and still
 * performs equivalent scrypt work in those cases so the timing side-channel does not
 * leak account existence. Uses a constant-time comparison.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (parsed === null) {
    // Spend comparable work, then fail closed — do not short-circuit.
    await deriveKey(password, DUMMY_SALT);
    return false;
  }
  const derived = await deriveKey(password, parsed.salt);
  return derived.length === parsed.key.length && timingSafeEqual(derived, parsed.key);
}
