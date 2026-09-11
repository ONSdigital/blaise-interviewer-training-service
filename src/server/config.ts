import dotenv from "dotenv";
import path from "path";
import logger from "./logger.js";
export interface Config {
  BlaiseApiUrl: string;
  ServerPark: string;
  SurveysToShow: string[];
  VmExternalWebUrl: string;
}

export function getConfigFromEnv(): Config {
  if (process.env.NODE_ENV !== "production") {
    dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  }

  const { BLAISE_API_URL, SERVER_PARK, SURVEYS_TO_SHOW, VM_EXTERNAL_WEB_URL } =
    process.env;
  const missingVariables: string[] = [];

  if (BLAISE_API_URL === undefined || BLAISE_API_URL.trim().length === 0) {
    logger.error("BLAISE_API_URL environment variable has not been set");
    missingVariables.push("BLAISE_API_URL");
  }

  if (SERVER_PARK === undefined || SERVER_PARK.trim().length === 0) {
    logger.error("SERVER_PARK environment variable has not been set");
    missingVariables.push("SERVER_PARK");
  }

  if (SURVEYS_TO_SHOW === undefined || SURVEYS_TO_SHOW.trim().length === 0) {
    logger.error("SURVEYS_TO_SHOW environment variable has not been set");
    missingVariables.push("SURVEYS_TO_SHOW");
  }

  if (
    VM_EXTERNAL_WEB_URL === undefined ||
    VM_EXTERNAL_WEB_URL.trim().length === 0
  ) {
    logger.error("VM_EXTERNAL_WEB_URL environment variable has not been set");
    missingVariables.push("VM_EXTERNAL_WEB_URL");
  }

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`,
    );
  }

  return {
    BlaiseApiUrl: fixProtocol(BLAISE_API_URL!),
    ServerPark: SERVER_PARK!,
    SurveysToShow: parseSurveysToShow(SURVEYS_TO_SHOW!),
    VmExternalWebUrl: fixProtocol(VM_EXTERNAL_WEB_URL!, "https"),
  };
}

function parseSurveysToShow(surveysToShow: string): string[] {
  return surveysToShow
    .split(",")
    .map((survey) => survey.trim().toUpperCase())
    .filter((survey) => survey.length > 0);
}

function fixProtocol(url: string, defaultProtocol = "http"): string {
  if (!url.includes("://")) {
    url = `${defaultProtocol}://${url}`;
  }
  return url;
}
