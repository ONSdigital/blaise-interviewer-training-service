import express, { Request, Response, Router } from "express";

export default function healthCheckHandler(): Router {
  const router = express.Router();

  return router.get("/bits-ui/:version/health", healthCheck);
}

async function healthCheck(req: Request, res: Response): Promise<Response> {
  return res.status(200).json({ healthy: true });
}
