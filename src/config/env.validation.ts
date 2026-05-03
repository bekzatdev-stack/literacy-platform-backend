type EnvConfig = {
  ADMIN_EMAIL?: string;
  ADMIN_FIRST_NAME?: string;
  ADMIN_LAST_NAME?: string;
  ADMIN_PASSWORD?: string;
  APP_TIMEZONE?: string;
  DATABASE_URL?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  SEED_ADMIN_ON_STARTUP?: string;
  PORT?: string;
  NODE_ENV?: string;
};

export function validateEnv(config: EnvConfig) {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in the environment variables');
  }

  if (!config.JWT_ACCESS_SECRET) {
    throw new Error(
      'JWT_ACCESS_SECRET is required in the environment variables',
    );
  }

  if (!config.JWT_REFRESH_SECRET) {
    throw new Error(
      'JWT_REFRESH_SECRET is required in the environment variables',
    );
  }

  if (config.PORT && Number.isNaN(Number(config.PORT))) {
    throw new Error('PORT must be a valid number');
  }

  return {
    ADMIN_EMAIL: config.ADMIN_EMAIL,
    ADMIN_FIRST_NAME: config.ADMIN_FIRST_NAME ?? 'System',
    ADMIN_LAST_NAME: config.ADMIN_LAST_NAME ?? 'Admin',
    ADMIN_PASSWORD: config.ADMIN_PASSWORD,
    APP_TIMEZONE: config.APP_TIMEZONE ?? 'Asia/Almaty',
    DATABASE_URL: config.DATABASE_URL,
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: config.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN ?? '7d',
    SEED_ADMIN_ON_STARTUP: config.SEED_ADMIN_ON_STARTUP ?? 'false',
    PORT: config.PORT ?? '3000',
    NODE_ENV: config.NODE_ENV ?? 'development',
  };
}
