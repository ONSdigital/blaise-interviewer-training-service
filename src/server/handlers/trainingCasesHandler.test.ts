import express from "express";
import supertest from "supertest";
import NodeCache from "node-cache";
import type { BlaiseApiClient } from "blaise-api-node-client";
import trainingCasesHandler from "./trainingCasesHandler.js";
import type { Config } from "../config.js";

const config: Config = {
  BlaiseApiUrl: "http://blaise-api.local",
  ServerPark: "gusty",
  SurveysToShow: ["LCF"],
  VmExternalWebUrl: "https://blaise-web.local/",
};

function buildApp(blaiseApiClient: BlaiseApiClient, cache = new NodeCache()) {
  const app = express();
  app.use(trainingCasesHandler(blaiseApiClient, cache, config));

  return app;
}

function buildBlaiseApiClientMock() {
  return {
    getQuestionnaires: vi.fn().mockResolvedValue([
      {
        name: "OPN2301A",
        installDate: "230101",
        serverParkName: "gusty",
      },
      {
        name: "LCF2304Z",
        installDate: "230401",
        serverParkName: "gusty",
      },
      {
        name: "LCF2305Z",
        installDate: "230501",
        serverParkName: "gusty",
      },
    ]),
    getQuestionnaireCaseIds: vi
      .fn()
      .mockResolvedValue(["1002", "1001", "1003"]),
    getQuestionnaireReportData: vi.fn().mockResolvedValue({
      questionnaireName: "LCF2304Z",
      questionnaireId: "00000000-0000-0000-0000-000000000000",
      reportingData: [
        {
          "qiD.Serial_Number": "1002",
          "qDataBag.TrainingCase": 1,
        },
        {
          "qiD.Serial_Number": "1001",
          "qDataBag.TrainingCase": "0",
        },
        {
          "qiD.Serial_Number": "1003",
          "qDataBag.TrainingCase": "0",
        },
      ],
    }),
    getCase: vi.fn(),
  } as unknown as BlaiseApiClient;
}

function buildBlaiseApiClientMockWithoutSerialNumber() {
  return {
    getQuestionnaires: vi.fn().mockResolvedValue([
      {
        name: "LCF2304Z",
        installDate: "230401",
        serverParkName: "gusty",
      },
    ]),
    getQuestionnaireCaseIds: vi.fn().mockResolvedValue(["1002", "1001"]),
    getQuestionnaireReportData: vi.fn().mockResolvedValue({
      questionnaireName: "LCF2304Z",
      questionnaireId: "00000000-0000-0000-0000-000000000000",
      reportingData: [
        {
          "qDataBag.TrainingCase": "1",
        },
      ],
    }),
    getCase: vi
      .fn()
      .mockImplementation(
        (_serverPark: string, _questionnaireName: string, caseId: string) =>
          Promise.resolve({
            caseId,
            fieldData: {
              "qDataBag.TrainingCase": caseId === "1002" ? "1" : "0",
            },
          }),
      ),
  } as unknown as BlaiseApiClient;
}

describe("trainingCasesHandler", () => {
  it("returns questionnaires limited to configured surveys", async () => {
    const blaiseApiClient = buildBlaiseApiClientMock();
    const app = buildApp(blaiseApiClient);

    const response = await supertest(app).get("/api/questionnaires");

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({
      questionnaires: [{ name: "LCF2304Z" }, { name: "LCF2305Z" }],
    });
  });

  it("returns only training cases with read-only Blaise launch links", async () => {
    const blaiseApiClient = buildBlaiseApiClientMock();
    const app = buildApp(blaiseApiClient);

    const response = await supertest(app).get(
      "/api/questionnaires/LCF2304Z/training-cases",
    );

    expect(response.statusCode).toEqual(200);
    expect(response.body).toStrictEqual({
      questionnaireName: "LCF2304Z",
      trainingCases: [
        {
          caseId: "1002",
          launchUrl:
            "https://blaise-web.local/LCF2304Z?KeyValue=1002&DataEntrySettings=ReadOnly",
        },
      ],
    });
  });

  it("matches report rows to case IDs independently of row order", async () => {
    const blaiseApiClient = buildBlaiseApiClientMock();
    vi.mocked(blaiseApiClient.getQuestionnaireReportData).mockResolvedValueOnce(
      {
        questionnaireName: "LCF2304Z",
        questionnaireId: "00000000-0000-0000-0000-000000000000",
        reportingData: [
          {
            "qiD.Serial_Number": "1001",
            "qDataBag.TrainingCase": "0",
          },
          {
            "qiD.Serial_Number": "1002",
            "qDataBag.TrainingCase": "1",
          },
        ],
      },
    );
    const app = buildApp(blaiseApiClient);

    const response = await supertest(app).get(
      "/api/questionnaires/LCF2304Z/training-cases",
    );

    expect(response.body.trainingCases).toStrictEqual([
      expect.objectContaining({ caseId: "1002" }),
    ]);
    expect(blaiseApiClient.getCase).not.toHaveBeenCalled();
  });

  it("rejects invalid questionnaire names", async () => {
    const blaiseApiClient = buildBlaiseApiClientMock();
    const app = buildApp(blaiseApiClient);

    const response = await supertest(app).get(
      "/api/questionnaires/LCF2304Z%3F/training-cases",
    );

    expect(response.statusCode).toEqual(400);
    expect(response.body).toStrictEqual({
      error: "Invalid questionnaire name",
    });
  });

  it("returns not found when the questionnaire is outside configured surveys", async () => {
    const blaiseApiClient = buildBlaiseApiClientMock();
    const app = buildApp(blaiseApiClient);

    const response = await supertest(app).get(
      "/api/questionnaires/OPN2301A/training-cases",
    );

    expect(response.statusCode).toEqual(404);
    expect(response.body).toStrictEqual({ error: "Questionnaire not found" });
  });

  it("caches questionnaire and training-case responses", async () => {
    const blaiseApiClient = buildBlaiseApiClientMock();
    const app = buildApp(blaiseApiClient);

    await supertest(app).get("/api/questionnaires/LCF2304Z/training-cases");
    await supertest(app).get("/api/questionnaires/LCF2304Z/training-cases");

    expect(blaiseApiClient.getQuestionnaires).toHaveBeenCalledTimes(1);
    expect(blaiseApiClient.getQuestionnaireCaseIds).toHaveBeenCalledTimes(1);
    expect(blaiseApiClient.getQuestionnaireReportData).toHaveBeenCalledTimes(1);
    expect(blaiseApiClient.getCase).not.toHaveBeenCalled();
  });

  it("looks up cases by ID when report data omits the serial number", async () => {
    const blaiseApiClient = buildBlaiseApiClientMockWithoutSerialNumber();
    const app = buildApp(blaiseApiClient);

    const response = await supertest(app).get(
      "/api/questionnaires/LCF2304Z/training-cases",
    );

    expect(response.statusCode).toEqual(200);
    expect(response.body.trainingCases).toStrictEqual([
      {
        caseId: "1002",
        launchUrl:
          "https://blaise-web.local/LCF2304Z?KeyValue=1002&DataEntrySettings=ReadOnly",
      },
    ]);
    expect(blaiseApiClient.getCase).toHaveBeenCalledTimes(2);
  });
});
