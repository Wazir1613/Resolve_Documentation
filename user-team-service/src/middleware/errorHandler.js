class HttpError extends Error {
  constructor(status, code, message, errors) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const body = {
    timestamp: new Date().toISOString(),
    status,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error',
    path: req.originalUrl,
  };

  if (status === 400 && Array.isArray(err.errors) && err.errors.length > 0) {
    body.errors = err.errors;
  }

  res.status(status).json(body);
}

module.exports = { HttpError, errorHandler };
