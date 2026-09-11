import {
  getAvailableQuestionnaires,
  getTrainingCases,
} from "./trainingCases.js";

describe("trainingCases api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads available questionnaires", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ questionnaires: [{ name: "LCF2304Z" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const questionnaires = await getAvailableQuestionnaires();

    expect(fetchMock).toHaveBeenCalledWith("/api/questionnaires");
    expect(questionnaires).toStrictEqual([{ name: "LCF2304Z" }]);
  });

  it("loads training cases for a questionnaire", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        questionnaireName: "LCF2304Z",
        trainingCases: [
          {
            caseId: "1001",
            launchUrl:
              "https://blaise-web.local/LCF2304Z?KeyValue=1001&DataEntrySettings=ReadOnly",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const trainingCases = await getTrainingCases("LCF2304Z");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/questionnaires/LCF2304Z/training-cases",
    );
    expect(trainingCases).toStrictEqual([
      {
        caseId: "1001",
        launchUrl:
          "https://blaise-web.local/LCF2304Z?KeyValue=1001&DataEntrySettings=ReadOnly",
      },
    ]);
  });

  it("throws when questionnaires cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(getAvailableQuestionnaires()).rejects.toThrow(
      "Unable to load questionnaires",
    );
  });

  it("throws when training cases cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(getTrainingCases("LCF2304Z")).rejects.toThrow(
      "Unable to load training cases",
    );
  });
});
