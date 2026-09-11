import express, { Request, Response, Express, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import ejs from "ejs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import healthCheckHandler from "./handlers/healthCheckHandler.js";
import trainingCasesHandler from "./handlers/trainingCasesHandler.js";
import { Config } from "./config.js";
import { BlaiseApiClient } from "blaise-api-node-client";
import NodeCache from "node-cache";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const pageRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

function newServer(
  blaiseApiClient: BlaiseApiClient,
  cache: NodeCache,
  config: Config,
): Express {
  const server = express();
  const buildFolder = "..";
  const errorPagePath = path.join(__dirname, "../views/500.html");
  const errorPageHtml = fs.existsSync(errorPagePath)
    ? fs.readFileSync(errorPagePath, "utf-8")
    : "Sorry, there is a problem with the service.";

  server.set("trust proxy", 1);
  server.disable("x-powered-by");
  server.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "img-src": ["'self'", "data:", "https://cdn.ons.gov.uk"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  server.set("views", path.join(__dirname, buildFolder));
  server.engine("html", ejs.renderFile);
  server.use(
    "/static",
    express.static(path.join(__dirname, `${buildFolder}/static`)),
  );

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use("/api", apiRateLimiter);

  server.use("/", healthCheckHandler());
  server.use("/", trainingCasesHandler(blaiseApiClient, cache, config));

  server.use(pageRateLimiter, function (_req: Request, res: Response) {
    res.render("index.html");
  });

  server.use(function (
    _err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    void _next;
    res.status(500).type("text/html").send(errorPageHtml);
  });
  return server;
}

export default newServer;
