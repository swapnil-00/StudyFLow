// lib/errors.js — Typed HTTP errors for withHandler
'use strict';

class HttpError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} code    Machine-readable error code (e.g. 'UNAUTHENTICATED')
   * @param {string} message Human-readable message safe to return to clients
   */
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { HttpError };
