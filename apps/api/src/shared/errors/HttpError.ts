/**
 * Application HTTP error with an explicit status code.
 * Thrown by route handlers and converted to JSON by the error middleware.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, message: string, code = 'http_error') {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
