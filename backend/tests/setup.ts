import mongoose from "mongoose";
import { User } from "../src/modules/user/user.model";
import { EmailVerification } from "../src/modules/auth/emailVerification.model";
import { PasswordReset } from "../src/modules/auth/passwordReset.model";

const testUri = process.env.MONGO_URI as string;

beforeAll(async () => {
  // App trong test có thể đã gọi mongoose.connect trước (module level)
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri);
  } else {
    await mongoose.connection.asPromise();
  }

  // Drop TOÀN BỘ collection của DB test để index unique được build lại sạch
  const db = mongoose.connection.db!;
  const existing = await db.listCollections().toArray();
  await Promise.all(
    existing.map(({ name }) => db.dropCollection(name).catch(() => undefined))
  );

  // Chờ index (email unique, phone sparse unique, OTP TTL) build xong
  await Promise.all([User.init(), EmailVerification.init(), PasswordReset.init()]);
});

beforeEach(async () => {
  // Xóa dữ liệu giữa các test (không drop để giữ index)
  await Promise.all([
    User.deleteMany({}).catch(() => undefined),
    EmailVerification.deleteMany({}).catch(() => undefined),
    PasswordReset.deleteMany({}).catch(() => undefined),
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
});
