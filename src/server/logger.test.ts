const pinoMock = vi.hoisted(() =>
  vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
);

vi.mock("pino", () => ({
  default: pinoMock,
}));

describe("logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("creates production logger with severity formatter", async () => {
    process.env.NODE_ENV = "production";

    await import("./logger.js");

    expect(pinoMock).toHaveBeenCalledTimes(1);

    const pinoOptions = pinoMock.mock.calls[0][0] as {
      messageKey: string;
      formatters: {
        level: (
          label: string,
          number: number,
        ) => {
          severity: string;
          level: number;
        };
      };
    };

    expect(pinoOptions.messageKey).toEqual("message");
    expect(pinoOptions.formatters.level("warn", 40)).toEqual({
      severity: "WARNING",
      level: 40,
    });
    expect(pinoOptions.formatters.level("unexpected", 30)).toEqual({
      severity: "INFO",
      level: 30,
    });
  });

  it("creates default logger outside production", async () => {
    process.env.NODE_ENV = "development";

    await import("./logger.js");

    expect(pinoMock).toHaveBeenCalledTimes(1);
    expect(pinoMock.mock.calls[0][0]).toBeUndefined();
  });
});
