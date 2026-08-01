export interface PasswordService {
  verifyPassword(input: { password: string; verifier: string }): boolean;
  createVerifier(password: string): string;
}

export interface HmacSha256PasswordServiceDependencies {
  randomSalt(): string;
  getPepper(): string;
  hmacSha256(input: { password: string; salt: string; pepper: string }): string;
}

const verifierAlgorithm = 'hmac-sha256-v1';

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

export function createHmacSha256PasswordService(
  deps: HmacSha256PasswordServiceDependencies,
): PasswordService {
  return {
    verifyPassword(input) {
      const parsed = parseHmacSha256Verifier(input.verifier);
      if (parsed === undefined) return false;

      const candidate = deps.hmacSha256({
        password: input.password,
        salt: parsed.salt,
        pepper: deps.getPepper(),
      });

      return timingSafeEqual(candidate, parsed.mac);
    },
    createVerifier(password) {
      const salt = deps.randomSalt();
      const mac = deps.hmacSha256({ password, salt, pepper: deps.getPepper() });
      return `${verifierAlgorithm}:${salt}:${mac}`;
    },
  };
}

export function createAppsScriptHmacSha256PasswordService(input: {
  getPepper(): string;
}): PasswordService {
  return createHmacSha256PasswordService({
    randomSalt: () => Utilities.getUuid().replace(/-/g, ''),
    getPepper: input.getPepper,
    hmacSha256: ({ password, salt, pepper }) =>
      hmacSha256Base64({ password, salt, pepper }),
  });
}

interface ParsedHmacSha256Verifier {
  salt: string;
  mac: string;
}

function parseHmacSha256Verifier(verifier: string): ParsedHmacSha256Verifier | undefined {
  const parts = verifier.split(':');
  if (parts.length !== 3 || parts[0] !== verifierAlgorithm) return undefined;
  const salt = parts[1];
  const mac = parts[2];
  if (salt === '' || mac === '') return undefined;
  return { salt, mac };
}

function hmacSha256Base64(input: { password: string; salt: string; pepper: string }): string {
  const key = `${input.pepper}:${input.salt}`;
  const bytes = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_256,
    input.password,
    key,
  ).map((byte) => (byte + 256) % 256);

  return Utilities.base64Encode(bytes);
}

function timingSafeEqual(left: string, right: string): boolean {
  let diff = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return diff === 0;
}
