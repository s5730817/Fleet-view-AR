// middleware/loginRateLimit.middleware.js

const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  max: 5,

  keyGenerator: (req) => {
    return `${ipKeyGenerator(req)}-${req.body.email}`;
  },

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    error: "Too many login attempts. Please wait 15 minutes before trying again.",
  },
});

module.exports = loginRateLimiter;