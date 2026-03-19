/**
 * Environment variable validation and configuration
 * Implements OWASP startup security validation
 * Fails fast with clear error messages if required variables are missing
 */

interface Config {
  database: {
    url?: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
    enabled: boolean;
  };
  auth: {
    googleClientId?: string;
    googleClientSecret?: string;
    publicUrl?: string;
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  ai: {
    googleApiKey?: string;
    openaiApiKey?: string;
    lumaApiKey?: string;
    disabled: boolean;
  };
  server: {
    port: number;
    nodeEnv: string;
    isProduction: boolean;
    requestTimeout: number;
    maxRequestSize: string;
  };
  cors: {
    origin?: string;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
}

/**
 * Strip invisible Unicode characters (line/paragraph separators, zero-width spaces, etc.)
 * that can sneak in when copy-pasting env vars from web UIs.
 */
function sanitizeEnvValue(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u2028\u2029\u200B\u200C\u200D\uFEFF]/g, "").trim();
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[SECURITY] Missing required environment variable: ${key}`);
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please set ${key} in your environment.\n` +
      `Application cannot start in unsafe mode.`
    );
  }
  return sanitizeEnvValue(value);
}

function getOptionalEnv(key: string): string | undefined {
  const value = process.env[key];
  return value ? sanitizeEnvValue(value) : undefined;
}

function validateJwtSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error(
      "[SECURITY] JWT_SECRET must be at least 32 characters long.\n" +
      "Generate a secure secret with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) return "****";
  return secret.substring(0, 4) + "****" + secret.substring(secret.length - 4);
}

export function validateConfig(): Config {
  console.log("[boot] Validating configuration...");

  const nodeEnv = getOptionalEnv("NODE_ENV") || "development";
  const isProduction = nodeEnv === "production";

  const jwtSecret = getRequiredEnv("JWT_SECRET");
  validateJwtSecret(jwtSecret);

  const supabaseUrl = getOptionalEnv("SUPABASE_URL");
  const supabaseAnonKey = getOptionalEnv("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  
  const hasSupabase = !!(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
  
  if (isProduction && !hasSupabase) {
    throw new Error(
      "[SECURITY] Supabase credentials required in production.\n" +
      "Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Application cannot start in production without Supabase."
    );
  }
  
  if (!hasSupabase) {
    const databaseUrl = getOptionalEnv("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error(
        "[SECURITY] No database configured.\n" +
        "Either set Supabase credentials (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)\n" +
        "or set DATABASE_URL for Neon PostgreSQL fallback."
      );
    }
    console.warn(
      "⚠️  Supabase not configured. Using Neon PostgreSQL as fallback.\n" +
      "   Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to enable Supabase."
    );
  }

  const aiDisabled = getOptionalEnv("DISABLE_AI") === "true";
  if (aiDisabled) {
    console.warn("[AI] AI features are DISABLED via DISABLE_AI=true");
  }

  const config: Config = {
    database: {
      url: getOptionalEnv("DATABASE_URL"),
    },
    supabase: {
      url: supabaseUrl || "",
      anonKey: supabaseAnonKey || "",
      serviceRoleKey: supabaseServiceRoleKey || "",
      enabled: hasSupabase,
    },
    auth: {
      googleClientId: getOptionalEnv("GOOGLE_CLIENT_ID"),
      googleClientSecret: getOptionalEnv("GOOGLE_CLIENT_SECRET"),
      publicUrl: getOptionalEnv("PUBLIC_URL"),
      jwtSecret,
      jwtExpiresIn: getOptionalEnv("JWT_EXPIRES_IN") || "7d",
    },
    ai: {
      googleApiKey: getOptionalEnv("GOOGLE_API_KEY"),
      openaiApiKey: getOptionalEnv("OPENAI_API_KEY"),
      lumaApiKey: getOptionalEnv("LUMA_API_KEY"),
      disabled: aiDisabled,
    },
    server: {
      port: parseInt(getRequiredEnv("PORT"), 10),
      nodeEnv,
      isProduction,
      requestTimeout: parseInt(getOptionalEnv("REQUEST_TIMEOUT") || "120000", 10),
      maxRequestSize: getOptionalEnv("MAX_REQUEST_SIZE") || "100mb",
    },
    cors: {
      origin: getOptionalEnv("CORS_ORIGIN"),
    },
    security: {
      bcryptRounds: parseInt(getOptionalEnv("BCRYPT_ROUNDS") || "12", 10),
      maxLoginAttempts: parseInt(getOptionalEnv("MAX_LOGIN_ATTEMPTS") || "5", 10),
      lockoutDuration: parseInt(getOptionalEnv("LOCKOUT_DURATION") || "900000", 10),
    },
  };

  // Production safety checks
  if (isProduction) {
    if (!config.cors.origin) {
      console.warn("[SECURITY] CORS_ORIGIN not set in production - CORS will be restrictive");
    }
  }

  // Warn about missing optional but recommended variables
  if (!config.auth.googleClientId || !config.auth.googleClientSecret) {
    if (isProduction) {
      throw new Error(
        "[SECURITY] Google OAuth credentials required in production.\n" +
        "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\n" +
        "Application cannot start in production without authentication."
      );
    }
    console.warn(
      "⚠️  Google OAuth not configured. Authentication endpoints will return 503.\n" +
      "   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable authentication."
    );
  }

  if (!config.ai.openaiApiKey && !config.ai.disabled) {
    if (isProduction) {
      throw new Error(
        "[SECURITY] OPENAI_API_KEY required in production (unless DISABLE_AI=true).\n" +
        "Set OPENAI_API_KEY to enable AI features, or set DISABLE_AI=true to disable them."
      );
    }
    console.warn(
      "⚠️  OPENAI_API_KEY not set. Content plan generation will fail.\n" +
      "   Set OPENAI_API_KEY to enable AI-powered content generation."
    );
  }

  if (!config.ai.lumaApiKey && !config.ai.disabled) {
    if (isProduction) {
      throw new Error(
        "[SECURITY] LUMA_API_KEY required in production (unless DISABLE_AI=true).\n" +
        "Set LUMA_API_KEY to enable AI B-roll generation, or set DISABLE_AI=true to disable AI features."
      );
    }
    console.warn(
      "⚠️  LUMA_API_KEY not set. AI B-roll generation will be disabled.\n" +
      "   Set LUMA_API_KEY to enable Luma AI video generation for B-roll."
    );
  }

  console.log("[boot] Configuration validated successfully");
  console.log(`[boot] Environment: ${nodeEnv}`);
  console.log(`[boot] JWT Secret: ${maskSecret(jwtSecret)}`);

  return config;
}

export const config = validateConfig();

