import "server-only";
import bcrypt from "bcryptjs";

// Cost 12 in production; tests use the minimum so the suite stays fast.
const ROUNDS = process.env.NODE_ENV === "test" || process.env.VITEST ? 4 : 12;

// Async API only: the sync variants block the event loop for ~250 ms per call.
export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

let dummyHash: Promise<string> | undefined;

/** Spend the same time as a real check when the email is unknown, so timing does not reveal which emails exist. */
export async function burnPasswordCheck(plain: string): Promise<false> {
  dummyHash ??= bcrypt.hash("timing-equaliser", ROUNDS);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}
