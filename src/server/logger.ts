import pino from "pino";

const pinoLevelToSeverityLookup: Record<string, string> = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

const logger =
  process.env.NODE_ENV === "production"
    ? pino({
        messageKey: "message",
        formatters: {
          level(label: string, number: number) {
            return {
              severity:
                pinoLevelToSeverityLookup[label] ??
                pinoLevelToSeverityLookup.info,
              level: number,
            };
          },
        },
      })
    : pino();

export default logger;
