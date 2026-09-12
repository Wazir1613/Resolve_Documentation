const crypto = require('crypto');
const { HttpError } = require('./errorHandler');

// Production would use Redis. In-memory Map is acceptable for this local build.
const seenKeys = new Map();

function bodyHash(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

function idempotencyMiddleware(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key) {
    return next(
      new HttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required')
    );
  }

  const hash = bodyHash(req.body);
  const existing = seenKeys.get(key);

  if (existing) {
    if (existing.hash !== hash) {
      return next(
        new HttpError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency-Key was already used with a different request body'
        )
      );
    }

    return res.status(existing.status).json(existing.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      seenKeys.set(key, { hash, status: res.statusCode, body });
    }
    return originalJson(body);
  };

  return next();
}

function resetIdempotencyStore() {
  seenKeys.clear();
}

module.exports = { idempotencyMiddleware, resetIdempotencyStore };
