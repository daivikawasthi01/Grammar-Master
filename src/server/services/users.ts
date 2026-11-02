import "server-only";
import { connectDb } from "@/server/db";
import { User } from "@/server/models/User";
import { Session } from "@/server/models/Session";
import { DocumentModel } from "@/server/models/Document";
import { StyleGuide } from "@/server/models/StyleGuide";
import { Usage } from "@/server/models/Usage";
import { AppError } from "@/server/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/server/auth/password";
import type { RegisterInput, UpdateProfileInput } from "@/shared/schemas";

export type PublicUser = { id: string; email: string; name: string; language: string; createdAt: string };

const toPublic = (u: { _id: unknown; email: string; name: string; language?: string | null; createdAt?: unknown }): PublicUser => ({
  id: String(u._id),
  email: u.email,
  name: u.name,
  language: u.language ?? "en-US",
  createdAt: new Date((u.createdAt as string) ?? Date.now()).toISOString(),
});

const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  await connectDb();
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({ email: input.email, name: input.name, passwordHash });
    return toPublic(user.toObject());
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError("EMAIL_TAKEN", "An account with this email already exists.");
    throw err;
  }
}

/** Same error and roughly the same time whether the email is unknown or the password is wrong. */
export async function authenticate(email: string, password: string): Promise<PublicUser> {
  await connectDb();
  const user = await User.findOne({ email }).select("+passwordHash").lean();
  const ok = user ? await verifyPassword(password, user.passwordHash) : await burnPasswordCheck(password);
  if (!user || !ok) throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect.");
  return toPublic(user);
}

export async function getUser(id: string): Promise<PublicUser> {
  await connectDb();
  const user = await User.findById(id).lean();
  if (!user) throw new AppError("UNAUTHENTICATED", "Sign in to continue");
  return toPublic(user);
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<PublicUser> {
  await connectDb();
  const user = await User.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).lean();
  if (!user) throw new AppError("UNAUTHENTICATED", "Sign in to continue");
  return toPublic(user);
}

async function assertPassword(id: string, currentPassword: string) {
  const user = await User.findById(id).select("+passwordHash").lean();
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AppError("INVALID_CREDENTIALS", "Your current password is incorrect.");
  }
}

/** Changing the password signs out every other session. */
export async function changePassword(id: string, currentPassword: string, newPassword: string, keepSessionId: string): Promise<void> {
  await connectDb();
  await assertPassword(id, currentPassword);
  await User.updateOne({ _id: id }, { $set: { passwordHash: await hashPassword(newPassword) } });
  await Session.deleteMany({ userId: id, _id: { $ne: keepSessionId } });
}

export async function changeEmail(id: string, currentPassword: string, email: string): Promise<PublicUser> {
  await connectDb();
  await assertPassword(id, currentPassword);
  try {
    const user = await User.findByIdAndUpdate(id, { $set: { email } }, { new: true }).lean();
    return toPublic(user!);
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError("EMAIL_TAKEN", "An account with this email already exists.");
    throw err;
  }
}

export async function deleteAccount(id: string, currentPassword: string): Promise<void> {
  await connectDb();
  await assertPassword(id, currentPassword);
  await Promise.all([
    DocumentModel.deleteMany({ ownerId: id }),
    StyleGuide.deleteMany({ ownerId: id }),
    Usage.deleteMany({ ownerId: id }),
    Session.deleteMany({ userId: id }),
  ]);
  await User.deleteOne({ _id: id });
}
