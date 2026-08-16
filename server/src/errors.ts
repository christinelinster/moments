import type { ErrorRequestHandler, RequestHandler } from "express";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "APP_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.code, message: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected error occurred" });
};
