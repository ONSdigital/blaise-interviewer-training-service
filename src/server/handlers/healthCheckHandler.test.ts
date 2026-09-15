import newServer from "../server.js";
import supertest from "supertest";

import { BlaiseApiClient } from "blaise-api-node-client";
import { getConfigFromEnv } from "../config.js";
import NodeCache from "node-cache";

const config = getConfigFromEnv();
const cache = new NodeCache({ stdTTL: 60 });

const blaiseApiClient = new BlaiseApiClient(config.BlaiseApiUrl);

const server = newServer(blaiseApiClient, cache, config);
const request = supertest(server);

describe("Test Health Endpoint", () => {
  it("should return a 200 status and json message", async () => {
    const response = await request.get("/bits-ui/version/health");

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({ healthy: true });
  });
});
