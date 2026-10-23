const rateLimit = require("express-rate-limit");

const tooManyRequests = (message) => ({ success: false, message });

// Login, register, password reset and OAuth code exchange (keyed by IP).
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooManyRequests("Too many requests. Try again later."),
});

// Routes that call paid third-party LLM APIs. Must run after `protect`.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: tooManyRequests("Too many AI requests. Please wait a few minutes."),
});

module.exports = { authAttemptLimiter, aiLimiter };
