// An error with an HTTP status, whose message is safe to show to the user.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
