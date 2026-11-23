import type { ErrorRequestHandler } from "express";

import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }
  const type =
    error && typeof error === "object" && "type" in error
      ? error.type
      : undefined;
  const status =
    type === "entity.parse.failed"
      ? 400
      : type === "entity.too.large"
        ? 413
        : type === "encoding.unsupported" || type === "charset.unsupported"
          ? 415
          : 500;
  if (status === 500)
    logger.error(
      { event: "request_error", requestId: response.locals.requestId },
      "Unexpected request failure",
    );
  response
    .status(status)
    .json({
      error: {
        code:
          status === 400
            ? "INVALID_JSON"
            : status === 413
              ? "PAYLOAD_TOO_LARGE"
              : status === 415
                ? "UNSUPPORTED_ENCODING"
                : "INTERNAL_ERROR",
        message:
          status === 400
            ? "Request body must contain valid JSON."
            : status === 413
              ? "Request body is too large."
              : status === 415
                ? "Unsupported request encoding."
                : "An unexpected error occurred.",
        requestId: response.locals.requestId,
      },
    });
};
