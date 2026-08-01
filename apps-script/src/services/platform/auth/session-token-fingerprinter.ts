import type { TokenFingerprinter } from './session-service';

export function createAppsScriptSessionTokenFingerprinter(input: {
  getPepper(): string;
}): TokenFingerprinter {
  return {
    fingerprint(token) {
      const bytes = Utilities.computeHmacSignature(
        Utilities.MacAlgorithm.HMAC_SHA_256,
        token,
        input.getPepper(),
      ).map((byte) => (byte + 256) % 256);
      return `hmac-sha256-v1:${Utilities.base64Encode(bytes)}`;
    },
  };
}
