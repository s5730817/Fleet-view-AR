// middleware/loginRateLimit.middleware.js
/*
  Current rate limits are configured conservatively for development
  and prototype deployment.

  Further concurrent user and load testing is required to determine:
  - realistic traffic spikes
  - sustainable request throughput
  - optimal production thresholds
  - AR polling behaviour under scale

  Production values should be adjusted following stress and
  performance testing in a deployed environment.
*/

const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        error: "Too many requests, please try again later."
    }
});

module.exports = apiLimiter;