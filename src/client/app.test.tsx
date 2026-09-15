import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./app.js";

function stubFetch(responses: unknown[]) {
  const fetchMock = vi.fn();

  for (const responseBody of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => responseBody,
    });
  }

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads questionnaires and displays training cases after selection", async () => {
    const fetchMock = stubFetch([
      { questionnaires: [{ name: "LCF2304Z" }, { name: "LCF2305Z" }] },
      {
        questionnaireName: "LCF2304Z",
        trainingCases: [
          {
            caseId: "1001",
            launchUrl:
              "https://blaise-web.local/LCF2304Z?KeyValue=1001&DataEntrySettings=ReadOnly",
          },
          {
            caseId: "1002",
            launchUrl:
              "https://blaise-web.local/LCF2304Z?KeyValue=1002&DataEntrySettings=ReadOnly",
          },
        ],
      },
    ]);

    render(<App />);

    const questionnaireSelect = await screen.findByLabelText("Questionnaire");

    await userEvent.selectOptions(questionnaireSelect, "LCF2304Z");

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Action" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("1001")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "1001" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Launch training case 1001 in Blaise",
      }),
    ).toHaveAttribute(
      "href",
      "https://blaise-web.local/LCF2304Z?KeyValue=1001&DataEntrySettings=ReadOnly",
    );
    expect(
      screen.getByRole("link", {
        name: "Launch training case 1001 in Blaise",
      }),
    ).toHaveAttribute("target", "_blank");
    expect(screen.getAllByText("Launch training case")).toHaveLength(2);
    expect(screen.queryByText("Read only")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/questionnaires");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/questionnaires/LCF2304Z/training-cases",
    );
  });

  it("shows a message when no training cases are available", async () => {
    stubFetch([
      { questionnaires: [{ name: "LCF2304Z" }] },
      { questionnaireName: "LCF2304Z", trainingCases: [] },
    ]);

    render(<App />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Questionnaire"),
      "LCF2304Z",
    );

    expect(
      await screen.findByText(
        "No training cases are available for this questionnaire.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/results of/)).not.toBeInTheDocument();
  });

  it("shows the field period in valid questionnaire option labels", async () => {
    stubFetch([
      {
        questionnaires: [
          { name: "LCF2304Z" },
          { name: "LCF2313Z" },
          { name: "NotADatedQuestionnaire" },
        ],
      },
    ]);

    render(<App />);

    expect(
      await screen.findByRole("option", { name: "LCF2304Z (April 2023)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "LCF2313Z" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "NotADatedQuestionnaire" }),
    ).toBeInTheDocument();
  });

  it("orders questionnaires by name", async () => {
    stubFetch([
      {
        questionnaires: [
          { name: "LCF2305Z" },
          { name: "LCF2304Z" },
          { name: "APS2301A" },
        ],
      },
    ]);

    render(<App />);

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.getAttribute("value"))).toStrictEqual(
      ["", "APS2301A", "LCF2304Z", "LCF2305Z"],
    );
  });

  it("orders training cases by case ID", async () => {
    stubFetch([
      { questionnaires: [{ name: "LCF2304Z" }] },
      {
        questionnaireName: "LCF2304Z",
        trainingCases: [
          { caseId: "1002", launchUrl: "https://example.com/1002" },
          { caseId: "1001", launchUrl: "https://example.com/1001" },
        ],
      },
    ]);

    render(<App />);
    await userEvent.selectOptions(
      await screen.findByLabelText("Questionnaire"),
      "LCF2304Z",
    );

    const rows = await screen.findAllByTestId("training-case-table-row");
    expect(rows.map((row) => row.cells[0]?.textContent)).toStrictEqual([
      "1001",
      "1002",
    ]);
  });

  it("shows an error when questionnaires cannot be loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }));

    render(<App />);

    expect(
      await screen.findByText("Unable to load questionnaires from Blaise."),
    ).toBeInTheDocument();
  });

  it("shows an error when training cases cannot be loaded", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionnaires: [{ name: "LCF2304Z" }] }),
      })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    await userEvent.selectOptions(
      await screen.findByLabelText("Questionnaire"),
      "LCF2304Z",
    );

    expect(
      await screen.findByText("Unable to load training cases"),
    ).toBeInTheDocument();
  });
});
