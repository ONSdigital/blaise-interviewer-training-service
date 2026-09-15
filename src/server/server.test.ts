import express from "express";
import supertest from "supertest";
import NodeCache from "node-cache";
import type { BlaiseApiClient } from "blaise-api-node-client";
import type { Config } from "./config.js";

const loggerErrorMock = vi.fn();

const config: Config = {
  BlaiseApiUrl: "http://blaise-api.local",
  ServerPark: "gusty",
  SurveysToShow: ["LCF"],
  VmExternalWebUrl: "https://blaise-web.local",
};

async function buildServerWithHealthRouter(healthRouter: express.Router) {
  vi.resetModules();
  loggerErrorMock.mockClear();
  vi.doUnmock("fs");
  vi.doMock("./logger", () => ({
    default: { error: loggerErrorMock },
  }));
  vi.doMock("./handlers/healthCheckHandler", () => ({
    default: () => healthRouter,
  }));
  vi.doMock("./handlers/trainingCasesHandler", () => ({
    default: () => express.Router(),
  }));

  const { default: newServer } = await import("./server.js");

  return newServer(
    {} as unknown as BlaiseApiClient,
    new NodeCache({ stdTTL: 60 }),
    config,
  );
}

async function buildServerWithHealthRouterAndMissingErrorPage(
  healthRouter: express.Router,
) {
  vi.resetModules();
  loggerErrorMock.mockClear();
  vi.doMock("fs", () => ({
    default: {
      existsSync: () => false,
      readFileSync: () => "",
    },
    existsSync: () => false,
    readFileSync: () => "",
  }));
  vi.doMock("./handlers/healthCheckHandler", () => ({
    default: () => healthRouter,
  }));
  vi.doMock("./logger", () => ({
    default: { error: loggerErrorMock },
  }));
  vi.doMock("./handlers/trainingCasesHandler", () => ({
    default: () => express.Router(),
  }));

  const { default: newServer } = await import("./server.js");

  return newServer(
    {} as unknown as BlaiseApiClient,
    new NodeCache({ stdTTL: 60 }),
    config,
  );
}

async function buildServerWithHealthRouterAndCustomErrorPage(
  healthRouter: express.Router,
  customHtml: string,
) {
  vi.resetModules();
  loggerErrorMock.mockClear();
  vi.doMock("fs", () => ({
    default: {
      existsSync: () => true,
      readFileSync: () => customHtml,
    },
    existsSync: () => true,
    readFileSync: () => customHtml,
  }));
  vi.doMock("./handlers/healthCheckHandler", () => ({
    default: () => healthRouter,
  }));
  vi.doMock("./logger", () => ({
    default: { error: loggerErrorMock },
  }));
  vi.doMock("./handlers/trainingCasesHandler", () => ({
    default: () => express.Router(),
  }));

  const { default: newServer } = await import("./server.js");

  return newServer(
    {} as unknown as BlaiseApiClient,
    new NodeCache({ stdTTL: 60 }),
    config,
  );
}

describe("newServer", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns 500 for unknown routes when index render fails", async () => {
    const app = await buildServerWithHealthRouter(express.Router());

    const response = await supertest(app).get("/some-unknown-route");

    expect(response.statusCode).toEqual(500);
  });

  it("renders 500 page when middleware passes an error", async () => {
    const healthRouter = express.Router();
    const error = new Error("boom");
    healthRouter.get("/api/health", (_req, _res, next) => {
      next(error);
    });

    const app = await buildServerWithHealthRouter(healthRouter);

    const response = await supertest(app).get("/api/health");

    expect(response.statusCode).toEqual(500);
    expect(response.text).not.toContain("boom");
    expect(loggerErrorMock).toHaveBeenCalledWith(
      {
        err: error,
        request: expect.objectContaining({
          method: "GET",
          originalUrl: "/api/health",
        }),
      },
      "Unhandled request error",
    );
  });

  it("uses fallback error page text when 500.html is missing", async () => {
    const healthRouter = express.Router();
    healthRouter.get("/api/health", (_req, _res, next) => {
      next(new Error("boom"));
    });

    const app =
      await buildServerWithHealthRouterAndMissingErrorPage(healthRouter);

    const response = await supertest(app).get("/api/health");

    expect(response.statusCode).toEqual(500);
    expect(response.text).toContain(
      "Sorry, there is a problem with the service.",
    );
  });

  it("uses custom error page html when 500.html exists", async () => {
    const healthRouter = express.Router();
    healthRouter.get("/api/health", (_req, _res, next) => {
      next(new Error("boom"));
    });

    const app = await buildServerWithHealthRouterAndCustomErrorPage(
      healthRouter,
      "<html><body>Custom 500</body></html>",
    );

    const response = await supertest(app).get("/api/health");

    expect(response.statusCode).toEqual(500);
    expect(response.text).toContain("Custom 500");
  });

  it("applies baseline HTTP hardening headers", async () => {
    const healthRouter = express.Router();
    healthRouter.get("/api/health", (_req, res) => {
      res.status(200).json({ status: "ok" });
    });

    const app = await buildServerWithHealthRouter(healthRouter);

    const response = await supertest(app).get("/api/health");

    expect(response.statusCode).toEqual(200);
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toEqual("nosniff");
  });
});
