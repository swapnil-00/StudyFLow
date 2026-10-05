// lib/errors.js — Typed HTTP errors for withHandler
'use strict';

class HttpError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} code    Machine-readable error code (e.g. 'UNAUTHENTICATED')
   * @param {string} message Human-readable message safe to return to clients
   * @param {object} [details] Extra client-safe fields (e.g. seat limit numbers for an upgrade prompt)
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    if (details && typeof details === 'object') this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  static [Symbol.hasInstance](instance) {
    return (
      instance != null &&
      (instance.name === 'HttpError' ||
        (typeof instance.status === 'number' && Boolean(instance.code)))
    );
  }
}

function isHttpError(err) {
  return (
    err instanceof HttpError ||
    (err != null &&
      (err.name === 'HttpError' ||
        (typeof err.status === 'number' && Boolean(err.code))))
  );
}

module.exports = { HttpError, isHttpError };

