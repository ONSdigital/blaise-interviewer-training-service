import express, { Router } from "express";
import type { BlaiseApiClient } from "blaise-api-node-client";
import type { JSONValue } from "blaise-api-node-client";
import NodeCache from "node-cache";
import type { Config } from "../config.js";

type QuestionnaireSummary = {
  name: string;
};

type TrainingCase = {
  caseId: string;
  launchUrl: string;
};

const questionnaireNamePattern = /^[A-Za-z0-9_]+$/;
const trainingCaseField = "qDataBag.TrainingCase";
const caseIdField = "qiD.Serial_Number";

export default function trainingCasesHandler(
  blaiseApiClient: BlaiseApiClient,
  cache: NodeCache,
  config: Config,
): Router {
  const router = express.Router();

  router.get("/api/questionnaires", async (_req, res, next) => {
    try {
      const questionnaires = await getAvailableQuestionnaires(
        blaiseApiClient,
        cache,
        config,
      );

      res.status(200).json({ questionnaires });
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/api/questionnaires/:questionnaireName/training-cases",
    async (req, res, next) => {
      try {
        const questionnaireName = req.params.questionnaireName;

        if (!isValidQuestionnaireName(questionnaireName)) {
          return res.status(400).json({ error: "Invalid questionnaire name" });
        }

        const availableQuestionnaires = await getAvailableQuestionnaires(
          blaiseApiClient,
          cache,
          config,
        );

        if (
          !availableQuestionnaires.some(
            (questionnaire) => questionnaire.name === questionnaireName,
          )
        ) {
          return res.status(404).json({ error: "Questionnaire not found" });
        }

        const trainingCases = await getTrainingCases(
          blaiseApiClient,
          cache,
          config,
          questionnaireName,
        );

        return res.status(200).json({ questionnaireName, trainingCases });
      } catch (error) {
        return next(error);
      }
    },
  );

  return router;
}

async function getAvailableQuestionnaires(
  blaiseApiClient: BlaiseApiClient,
  cache: NodeCache,
  config: Config,
): Promise<QuestionnaireSummary[]> {
  const cacheKey = `questionnaires:${config.ServerPark}:${config.SurveysToShow.join(",")}`;
  const cachedQuestionnaires = cache.get<QuestionnaireSummary[]>(cacheKey);

  if (cachedQuestionnaires !== undefined) {
    return cachedQuestionnaires;
  }

  const surveyPrefixes = new Set(config.SurveysToShow);
  const questionnaires = await blaiseApiClient.getQuestionnaires(
    config.ServerPark,
  );
  const availableQuestionnaires = questionnaires
    .filter((questionnaire) =>
      surveyPrefixes.has(questionnaire.name.slice(0, 3).toUpperCase()),
    )
    .map((questionnaire) => ({ name: questionnaire.name }))
    .sort((left, right) => left.name.localeCompare(right.name));

  cache.set(cacheKey, availableQuestionnaires);

  return availableQuestionnaires;
}

async function getTrainingCases(
  blaiseApiClient: BlaiseApiClient,
  cache: NodeCache,
  config: Config,
  questionnaireName: string,
): Promise<TrainingCase[]> {
  const cacheKey = `training-cases:${config.ServerPark}:${questionnaireName}`;
  const cachedTrainingCases = cache.get<TrainingCase[]>(cacheKey);

  if (cachedTrainingCases !== undefined) {
    return cachedTrainingCases;
  }

  const [caseIds, reportData] = await Promise.all([
    blaiseApiClient.getQuestionnaireCaseIds(
      config.ServerPark,
      questionnaireName,
    ),
    blaiseApiClient.getQuestionnaireReportData(
      config.ServerPark,
      questionnaireName,
      [trainingCaseField, caseIdField],
    ),
  ]);
  const reportRows = reportData.reportingData.map((reportRow) => ({
    caseId: readStringField(reportRow, caseIdField),
    trainingCaseValue: readField(reportRow, trainingCaseField),
  }));
  const caseRows = reportRows.every(({ caseId }) => caseId !== undefined)
    ? reportRows
    : await Promise.all(
        caseIds.map(async (caseId) => {
          const questionnaireCase = await blaiseApiClient.getCase(
            config.ServerPark,
            questionnaireName,
            caseId,
          );

          return {
            caseId,
            trainingCaseValue: readField(
              questionnaireCase.fieldData,
              trainingCaseField,
            ),
          };
        }),
      );
  const trainingCases = caseRows
    .filter(
      (
        reportRow,
      ): reportRow is { caseId: string; trainingCaseValue: JSONValue } =>
        reportRow.caseId !== undefined &&
        isTrainingCaseValue(reportRow.trainingCaseValue),
    )
    .map((trainingCase) => ({
      caseId: trainingCase.caseId,
      launchUrl: buildLaunchUrl(
        config.VmExternalWebUrl,
        questionnaireName,
        trainingCase.caseId,
      ),
    }))
    .sort((left, right) => left.caseId.localeCompare(right.caseId));

  cache.set(cacheKey, trainingCases);

  return trainingCases;
}

function readField(
  record: Readonly<Record<string, JSONValue>>,
  expectedFieldName: string,
): JSONValue | undefined {
  return Object.entries(record).find(
    ([fieldName]) =>
      fieldName.toLowerCase() === expectedFieldName.toLowerCase(),
  )?.[1];
}

function readStringField(
  record: Readonly<Record<string, JSONValue>>,
  expectedFieldName: string,
): string | undefined {
  const value = readField(record, expectedFieldName);

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return undefined;
}

function isTrainingCaseValue(
  trainingCaseValue: JSONValue | undefined,
): boolean {
  return trainingCaseValue === 1 || trainingCaseValue === "1";
}

function buildLaunchUrl(
  vmExternalWebUrl: string,
  questionnaireName: string,
  caseId: string,
): string {
  const baseUrl = vmExternalWebUrl.replace(/\/$/, "");
  const encodedQuestionnaireName = encodeURIComponent(questionnaireName);
  const encodedCaseId = encodeURIComponent(caseId);

  return `${baseUrl}/${encodedQuestionnaireName}?KeyValue=${encodedCaseId}&DataEntrySettings=ReadOnly`;
}

function isValidQuestionnaireName(
  questionnaireName: string | undefined,
): questionnaireName is string {
  return (
    questionnaireName !== undefined &&
    questionnaireNamePattern.test(questionnaireName)
  );
}
