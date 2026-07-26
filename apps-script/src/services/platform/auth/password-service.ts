export interface PasswordService {
  verifyPassword(input: { password: string; verifier: string }): boolean;
}

export function createDeterministicPasswordServiceForTest(): PasswordService {
  return {
    verifyPassword(input) {
      return input.verifier === `test-verifier:${input.password}`;
    },
  };
}
