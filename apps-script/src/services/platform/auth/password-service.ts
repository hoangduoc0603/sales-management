export interface PasswordService {
  verifyPassword(input: { password: string; verifier: string }): boolean;
  createVerifier(password: string): string;
}

export interface Pbkdf2PasswordServiceDependencies {
  iterations?: number;
  keyLengthBytes?: number;
  randomSalt(): string;
  deriveKey(input: {
    password: string;
    salt: string;
    iterations: number;
    keyLengthBytes: number;
  }): string;
}

export function createDeterministicPasswordServiceForTest(): PasswordService {
  return {
    verifyPassword(input) {
      return input.verifier === `test-verifier:${input.password}`;
    },
    createVerifier(password) {
      return `test-verifier:${password}`;
    },
  };
}

export function createPbkdf2PasswordService(deps: Pbkdf2PasswordServiceDependencies): PasswordService {
  const iterations = deps.iterations ?? 120_000;
  const keyLengthBytes = deps.keyLengthBytes ?? 32;

  return {
    verifyPassword(input) {
      const parsed = parsePbkdf2Verifier(input.verifier);
      if (parsed === undefined) return false;
      const candidate = deps.deriveKey({
        password: input.password,
        salt: parsed.salt,
        iterations: parsed.iterations,
        keyLengthBytes: parsed.keyLengthBytes,
      });
      return timingSafeEqual(candidate, parsed.derivedKey);
    },
    createVerifier(password) {
      const salt = deps.randomSalt();
      const derivedKey = deps.deriveKey({ password, salt, iterations, keyLengthBytes });
      return `pbkdf2-sha256:${iterations}:${keyLengthBytes}:${salt}:${derivedKey}`;
    },
  };
}

export function createAppsScriptPbkdf2PasswordService(): PasswordService {
  return createPbkdf2PasswordService({
    randomSalt: () => Utilities.getUuid().replace(/-/g, ''),
    deriveKey: ({ password, salt, iterations, keyLengthBytes }) =>
      derivePbkdf2Sha256Base64({ password, salt, iterations, keyLengthBytes }),
  });
}

interface ParsedPbkdf2Verifier {
  iterations: number;
  keyLengthBytes: number;
  salt: string;
  derivedKey: string;
}

function parsePbkdf2Verifier(verifier: string): ParsedPbkdf2Verifier | undefined {
  const parts = verifier.split(':');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2-sha256') return undefined;
  const iterations = Number(parts[1]);
  const keyLengthBytes = Number(parts[2]);
  const salt = parts[3];
  const derivedKey = parts[4];
  if (!Number.isInteger(iterations) || iterations <= 0) return undefined;
  if (!Number.isInteger(keyLengthBytes) || keyLengthBytes <= 0) return undefined;
  if (salt === '' || derivedKey === '') return undefined;
  return { iterations, keyLengthBytes, salt, derivedKey };
}

function timingSafeEqual(left: string, right: string): boolean {
  let diff = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}

function derivePbkdf2Sha256Base64(input: {
  password: string;
  salt: string;
  iterations: number;
  keyLengthBytes: number;
}): string {
  const blockCount = Math.ceil(input.keyLengthBytes / 32);
  const derivedBytes: number[] = [];

  for (let blockIndex = 1; blockIndex <= blockCount; blockIndex += 1) {
    let u = hmacSha256Bytes(input.password, `${input.salt}${int32BigEndianString(blockIndex)}`);
    const block = [...u];
    for (let iteration = 2; iteration <= input.iterations; iteration += 1) {
      u = hmacSha256Bytes(input.password, bytesToBinaryString(u));
      for (let byteIndex = 0; byteIndex < block.length; byteIndex += 1) {
        block[byteIndex] ^= u[byteIndex] ?? 0;
      }
    }
    derivedBytes.push(...block);
  }

  return Utilities.base64Encode(derivedBytes.slice(0, input.keyLengthBytes));
}

function hmacSha256Bytes(key: string, value: string): number[] {
  return Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, value, key)
    .map((byte) => (byte + 256) % 256);
}

function int32BigEndianString(value: number): string {
  return String.fromCharCode(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function bytesToBinaryString(bytes: readonly number[]): string {
  return String.fromCharCode(...bytes);
}
