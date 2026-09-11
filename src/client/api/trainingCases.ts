import type {
  QuestionnaireSummary,
  QuestionnairesResponse,
  TrainingCase,
  TrainingCasesResponse,
} from "../types/trainingCases.js";

export async function getAvailableQuestionnaires(): Promise<
  QuestionnaireSummary[]
> {
  const response = await fetch("/api/questionnaires");

  if (!response.ok) {
    throw new Error("Unable to load questionnaires");
  }

  const responseBody = (await response.json()) as QuestionnairesResponse;

  return responseBody.questionnaires;
}

export async function getTrainingCases(
  questionnaireName: string,
): Promise<TrainingCase[]> {
  const response = await fetch(
    `/api/questionnaires/${encodeURIComponent(questionnaireName)}/training-cases`,
  );

  if (!response.ok) {
    throw new Error("Unable to load training cases");
  }

  const responseBody = (await response.json()) as TrainingCasesResponse;

  return responseBody.trainingCases;
}
