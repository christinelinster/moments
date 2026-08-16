import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

import { AppError } from "../errors.js";

const KEY_LENGTH = 64;
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MAX_MEMORY = 32 * 1024 * 1024;
const SALT_BYTES = 16;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 256;
export const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$cGhvdG8tc2NyYXBib29rLWR1bW15LXNhbHQ$EQXgy7qfK7uUr8hnBNKsAYD8QilSXy3_XlsQb1hlO2CVK_rQNnKyfcl-BJdfFKl35JQIed-6Jt-R4o26JEfZCg";

export function assertValidPassword(input: unknown): asserts input is string {
  if (
    typeof input !== "string" ||
    input.length < PASSWORD_MIN_LENGTH ||
    input.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError(
      400,
      `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      "INVALID_PASSWORD",
    );
  }
}

function scryptOptions(cost: number, blockSize: number, parallelization: number) {
  return {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: MAX_MEMORY,
  };
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  assertValidPassword(password);

  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await deriveKey(
    password,
    salt,
    KEY_LENGTH,
    scryptOptions(COST, BLOCK_SIZE, PARALLELIZATION),
  );

  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  if (typeof password !== "string" || typeof encodedHash !== "string") {
    return false;
  }

  const parts = encodedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  if (
    !Number.isSafeInteger(cost) ||
    !Number.isSafeInteger(blockSize) ||
    !Number.isSafeInteger(parallelization) ||
    cost < 1_024 ||
    cost > 1_048_576 ||
    blockSize < 1 ||
    blockSize > 32 ||
    parallelization < 1 ||
    parallelization > 8
  ) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4] ?? "", "base64url");
    expected = Buffer.from(parts[5] ?? "", "base64url");
  } catch {
    return false;
  }

  if (!salt.length || expected.length !== KEY_LENGTH) {
    return false;
  }

  try {
    const actual = await deriveKey(
      password,
      salt,
      expected.length,
      scryptOptions(cost, blockSize, parallelization),
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
