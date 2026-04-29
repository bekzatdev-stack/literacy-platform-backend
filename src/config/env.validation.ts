type EnvConfig = {
  APP_TIMEZONE?: string;
  DATABASE_URL?: string;
  JWT_ACCESS_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  JWT_ACCESS_EXPIRES_IN?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
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
    APP_TIMEZONE: config.APP_TIMEZONE ?? 'Asia/Almaty',
    DATABASE_URL: config.DATABASE_URL,
    JWT_ACCESS_SECRET: config.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: config.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRES_IN: config.JWT_ACCESS_EXPIRES_IN ?? '15m',
    JWT_REFRESH_EXPIRES_IN: config.JWT_REFRESH_EXPIRES_IN ?? '7d',
    PORT: config.PORT ?? '3000',
    NODE_ENV: config.NODE_ENV ?? 'development',
  };
}
