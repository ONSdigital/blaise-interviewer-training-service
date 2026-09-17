import React, { ReactElement, useEffect, useState } from "react";
import {
  ErrorPanel,
  ExternalLink,
  Footer,
  Header,
  LoadingPanel,
  Panel,
  Select,
  Table,
} from "blaise-design-system-react-components";
import {
  getAvailableQuestionnaires,
  getTrainingCases,
} from "./api/trainingCases.js";
import type {
  QuestionnaireSummary,
  TrainingCase,
} from "./types/trainingCases.js";

export default function App(): ReactElement {
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireSummary[]>(
    [],
  );
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState("");
  const [trainingCases, setTrainingCases] = useState<TrainingCase[]>([]);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true);
  const [loadingTrainingCases, setLoadingTrainingCases] = useState(false);
  const [questionnairesErrored, setQuestionnairesErrored] = useState(false);
  const [trainingCasesErrored, setTrainingCasesErrored] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadQuestionnaires() {
      try {
        setQuestionnairesErrored(false);
        setLoadingQuestionnaires(true);
        const availableQuestionnaires = await getAvailableQuestionnaires();

        if (!ignore) {
          setQuestionnaires(
            availableQuestionnaires.toSorted((left, right) =>
              left.name.localeCompare(right.name),
            ),
          );
        }
      } catch {
        if (!ignore) {
          setQuestionnairesErrored(true);
        }
      } finally {
        if (!ignore) {
          setLoadingQuestionnaires(false);
        }
      }
    }

    void loadQuestionnaires();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (selectedQuestionnaire.length === 0) {
      return;
    }

    let ignore = false;

    async function loadTrainingCases() {
      try {
        setTrainingCasesErrored(false);
        setLoadingTrainingCases(true);
        const availableTrainingCases = await getTrainingCases(
          selectedQuestionnaire,
        );

        if (!ignore) {
          setTrainingCases(
            availableTrainingCases.toSorted((left, right) =>
              left.caseId.localeCompare(right.caseId),
            ),
          );
        }
      } catch {
        if (!ignore) {
          setTrainingCasesErrored(true);
          setTrainingCases([]);
        }
      } finally {
        if (!ignore) {
          setLoadingTrainingCases(false);
        }
      }
    }

    void loadTrainingCases();

    return () => {
      ignore = true;
    };
  }, [selectedQuestionnaire]);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <Header title={"Blaise Interviewer Training Service"} />
      <div
        style={{ flexGrow: 1 }}
        className="ons-page__container ons-container"
      >
        <main id="main-content" className="ons-page__main ons-u-mt-no">
          <div className="ons-u-pt-s">
            <ErrorPanel
              text="Unable to load questionnaires from Blaise."
              hidden={!questionnairesErrored}
            />
            <LoadingPanel
              hidden={!loadingQuestionnaires}
              message="Loading questionnaires..."
            />

            {!loadingQuestionnaires && !questionnairesErrored ? (
              <>
                <Select
                  label="Questionnaire"
                  id="questionnaire-select"
                  name="questionnaire"
                  value={selectedQuestionnaire}
                  options={questionnaires.map((questionnaire) => ({
                    label: getQuestionnaireOptionLabel(questionnaire.name),
                    value: questionnaire.name,
                  }))}
                  onChange={(event) => {
                    setTrainingCases([]);
                    setTrainingCasesErrored(false);
                    setSelectedQuestionnaire(event.target.value);
                  }}
                />

                <LoadingPanel
                  hidden={!loadingTrainingCases}
                  message="Loading training cases..."
                />

                {selectedQuestionnaire.length > 0 && !loadingTrainingCases ? (
                  <TrainingCasesTable
                    trainingCases={trainingCases}
                    errored={trainingCasesErrored}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getQuestionnaireOptionLabel(questionnaireName: string): string {
  const questionnaireDateMatch = /^[A-Z]{3}(\d{2})(\d{2})/.exec(
    questionnaireName,
  );

  if (questionnaireDateMatch === null) {
    return questionnaireName;
  }

  const [, year, month] = questionnaireDateMatch;
  const monthName = monthNames[Number(month) - 1];

  if (monthName === undefined) {
    return questionnaireName;
  }

  return `${questionnaireName} (${monthName} 20${year})`;
}

function TrainingCasesTable({
  trainingCases,
  errored,
}: {
  trainingCases: TrainingCase[];
  errored: boolean;
}): ReactElement {
  const message = getTrainingCasesTableMessage(trainingCases, errored);

  if (trainingCases.length === 0) {
    return (
      <div className="ons-u-mt-s">
        <Panel
          spacious={true}
          status={message.includes("Unable") ? "error" : "info"}
        >
          {message}
        </Panel>
      </div>
    );
  }

  return (
    <div className="ons-u-mt-s">
      <Table
        id="training-cases-table"
        columns={["Case ID", "Country", "Action"]}
        tableCaption=""
        scrollableLabel="Training case list"
      >
        {trainingCases.map((trainingCase) => (
          <TrainingCaseTableRow
            key={trainingCase.caseId}
            trainingCase={trainingCase}
          />
        ))}
      </Table>
    </div>
  );
}

function TrainingCaseTableRow({
  trainingCase,
}: {
  trainingCase: TrainingCase;
}): ReactElement {
  return (
    <tr className="ons-table__row" data-testid="training-case-table-row">
      <td className="ons-table__cell" style={{ width: "35%" }}>
        {trainingCase.caseId}
      </td>
      <td className="ons-table__cell" style={{ width: "35" }}>
        {trainingCase.country}
      </td>
      <td className="ons-table__cell">
        <ExternalLink
          id={`launch-${trainingCase.caseId}`}
          link={trainingCase.launchUrl}
          text="Launch training case"
          ariaLabel={`Launch training case ${trainingCase.caseId} in Blaise`}
        />
      </td>
    </tr>
  );
}

function getTrainingCasesTableMessage(
  trainingCases: TrainingCase[],
  errored: boolean,
): string {
  if (errored) {
    return "Unable to load training cases";
  }

  if (trainingCases.length === 0) {
    return "No training cases are available for this questionnaire.";
  }

  return "";
}
