class AppError extends Error {
  constructor(status, code, message, errors = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(code, message, errors = null) {
    return new AppError(400, code, message, errors);
  }

  static notFound(code, message) {
    return new AppError(404, code, message);
  }

  static conflict(code, message) {
    return new AppError(409, code, message);
  }
}

module.exports = { AppError };
