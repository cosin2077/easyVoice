import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const errorDetails = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip
    }
  };

  logger.error('Error occurred:', {
    ...errorDetails,
    request: {
      ...errorDetails.request,
      body: {
        ...errorDetails.request.body,
        password: undefined,
        authorization: undefined
      }
    }
  });

  res.status(500).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}