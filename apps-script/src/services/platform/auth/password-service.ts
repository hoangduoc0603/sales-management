export interface PasswordService {
  verifyPassword(input: { password: string; verifier: string }): boolean;
  createVerifier(password: string): string;
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
