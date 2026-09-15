import express, { Request, Response, Router } from "express";

export default function healthCheckHandler(): Router {
  const router = express.Router();

  return router.get("/bits-ui/:version/health", healthCheck);
}

function healthCheck(req: Request, res: Response): Response {
  return res.status(200).json({ healthy: true });
}
