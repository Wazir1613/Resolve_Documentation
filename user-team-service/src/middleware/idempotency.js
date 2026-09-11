const { AppError } = require('../utils/errors');

// In-memory Map for storing seen idempotency keys.
// NOTE: Production implementation would use Redis with TTL (e.g. 24 hours) for distributed multi-instance storage.
const idempotencyStore = new Map();

function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.header('Idempotency-Key');

  if (!idempotencyKey) {
    return next(new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required'));
  }

  const currentBodyString = JSON.stringify(req.body || {});

  if (idempotencyStore.has(idempotencyKey)) {
    const cached = idempotencyStore.get(idempotencyKey);
    if (cached.bodyString === currentBodyString) {
      // Replay exact original response
      return res.status(cached.status).json(cached.body);
    } else {
      return next(new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Idempotency-Key was already used with a different request body'));
    }
  }

  // Intercept res.send / res.json to cache response
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Cache the response
    idempotencyStore.set(idempotencyKey, {
      bodyString: currentBodyString,
      status: res.statusCode,
      body
    });

    return originalJson(body);
  };

  next();
}

module.exports = {
  idempotencyMiddleware,
  idempotencyStore // exported for testing / cache clearing if needed
};
