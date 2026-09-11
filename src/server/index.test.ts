describe("server bootstrap", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("boots server and starts listening", async () => {
    const listenMock = vi.fn();
    const newServerMock = vi.fn(() => ({ listen: listenMock }));
    const nodeCacheMock = vi.fn().mockImplementation(function MockNodeCache() {
      return {};
    });
    const loggerInfoMock = vi.fn();

    vi.doMock("./config", () => ({
      getConfigFromEnv: () => ({
        BlaiseApiUrl: "http://blaise-api.local",
        ServerPark: "gusty",
      }),
    }));
    vi.doMock("./server", () => ({
      default: newServerMock,
    }));
    vi.doMock("./logger", () => ({
      default: {
        info: loggerInfoMock,
        error: vi.fn(),
      },
    }));
    vi.doMock("node-cache", () => ({
      default: nodeCacheMock,
    }));

    vi.doMock("blaise-api-node-client", () => ({
      BlaiseApiClient: class MockBlaiseApiClient {
        constructor() {
          // no-op
        }
      },
    }));

    process.env.PORT = "7777";

    const { startApp } = await import("./index.js");
    await startApp();

    expect(nodeCacheMock).toHaveBeenCalledWith({ stdTTL: 60 });
    expect(newServerMock).toHaveBeenCalledTimes(1);
    expect(listenMock).toHaveBeenCalledWith("7777");
    expect(loggerInfoMock).toHaveBeenCalledWith(
      { port: "7777" },
      "App is listening",
    );
  });

  it("logs and exits when bootstrap fails", async () => {
    const nodeCacheMock = vi.fn().mockImplementation(function MockNodeCache() {
      return {};
    });
    const loggerErrorMock = vi.fn();

    vi.doMock("./config", () => ({
      getConfigFromEnv: () => ({
        BlaiseApiUrl: "http://blaise-api.local",
        ServerPark: "gusty",
      }),
    }));
    vi.doMock("./server", () => ({
      default: vi.fn(() => {
        throw new Error("boom");
      }),
    }));
    vi.doMock("./logger", () => ({
      default: {
        info: vi.fn(),
        error: loggerErrorMock,
      },
    }));
    vi.doMock("node-cache", () => ({
      default: nodeCacheMock,
    }));
    vi.doMock("blaise-api-node-client", () => ({
      BlaiseApiClient: class MockBlaiseApiClient {
        constructor() {
          // no-op
        }
      },
    }));

    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    const { startApp } = await import("./index.js");
    await startApp();

    expect(loggerErrorMock).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      "Failed to start app",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("auto-starts on module import when NODE_ENV is not test", async () => {
    const loggerInfoMock = vi.fn();

    vi.doMock("./config", () => ({
      getConfigFromEnv: () => ({
        BlaiseApiUrl: "http://blaise-api.local",
        ServerPark: "gusty",
      }),
    }));
    vi.doMock("./server", () => ({
      default: vi.fn(() => ({ listen: vi.fn() })),
    }));
    vi.doMock("./logger", () => ({
      default: {
        info: loggerInfoMock,
        error: vi.fn(),
      },
    }));
    vi.doMock("node-cache", () => ({
      default: vi.fn().mockImplementation(function MockNodeCache() {
        return {};
      }),
    }));
    vi.doMock("blaise-api-node-client", () => ({
      BlaiseApiClient: class MockBlaiseApiClient {
        constructor() {
          // no-op
        }
      },
    }));

    process.env.NODE_ENV = "development";
    process.env.PORT = "7788";

    const { maybeAutoStart } = await import("./index.js");
    await maybeAutoStart();

    expect(loggerInfoMock).toHaveBeenCalledWith(
      { port: "7788" },
      "App is listening",
    );
  });
});
