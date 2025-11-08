export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public controller: string = 'unknown'
  ) {
    super(message);
    this.name = 'AppError';
  }
}