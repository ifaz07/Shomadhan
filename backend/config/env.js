// Fails fast on missing or placeholder secrets instead of silently falling back.
const PLACEHOLDER_SECRETS = new Set([
  "shomadhan-jwt-dev-secret-key-123456",
  "shomadhan-session-dev-secret",
  "dev-session-secret",
  "change-me",
]);

const validateEnv = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const isProduction = env.NODE_ENV === "production";

  if (!env.JWT_SECRET) {
    errors.push("JWT_SECRET is required.");
  }

  if (isProduction) {
    if (!env.MONGODB_URI) errors.push("MONGODB_URI is required in production.");
    if (!env.SESSION_SECRET) {
      warnings.push("SESSION_SECRET is not set; falling back to JWT_SECRET.");
    }

    [["JWT_SECRET", env.JWT_SECRET], ["SESSION_SECRET", env.SESSION_SECRET]].forEach(
      ([name, value]) => {
        if (value && PLACEHOLDER_SECRETS.has(value)) {
          errors.push(`${name} is set to a known placeholder value.`);
        } else if (value && value.length < 32) {
          warnings.push(`${name} is shorter than 32 characters.`);
        }
      },
    );
  }

  return { errors, warnings };
};

const assertEnv = (env = process.env) => {
  const { errors, warnings } = validateEnv(env);
  warnings.forEach((message) => console.warn(`[env] ${message}`));

  if (errors.length > 0) {
    errors.forEach((message) => console.error(`[env] ${message}`));
    process.exit(1);
  }
};

module.exports = { validateEnv, assertEnv };
