export const appConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || "cuezone_billiards_jwt_secret_2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "cuezone_billiards_refresh_secret_2026",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  bcrypt: {
    saltRounds: 10,
  },
};
