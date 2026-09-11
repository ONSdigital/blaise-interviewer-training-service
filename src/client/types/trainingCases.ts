export type QuestionnaireSummary = {
  name: string;
};

export type TrainingCase = {
  caseId: string;
  launchUrl: string;
};

export type QuestionnairesResponse = {
  questionnaires: QuestionnaireSummary[];
};

export type TrainingCasesResponse = {
  questionnaireName: string;
  trainingCases: TrainingCase[];
};
