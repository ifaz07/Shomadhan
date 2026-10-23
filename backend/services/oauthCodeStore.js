const crypto = require("crypto");

// One-time codes handed to the browser after OAuth instead of the JWT itself,
// so the token never appears in a URL, browser history or referrer header.
// In-memory: fine for a single instance. Move to Redis/Mongo before scaling out.
const CODE_TTL_MS = 60 * 1000;
const codes = new Map();

const purgeExpired = (now = Date.now()) => {
  for (const [code, entry] of codes) {
    if (entry.expiresAt <= now) codes.delete(code);
  }
};

const createOAuthCode = (payload) => {
  purgeExpired();
  const code = crypto.randomBytes(32).toString("hex");
  codes.set(code, { payload, expiresAt: Date.now() + CODE_TTL_MS });
  return code;
};

// Returns the stored payload once, then forgets it. Null if unknown or expired.
const consumeOAuthCode = (code) => {
  const entry = codes.get(code);
  codes.delete(code);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return entry.payload;
};

module.exports = { createOAuthCode, consumeOAuthCode };
