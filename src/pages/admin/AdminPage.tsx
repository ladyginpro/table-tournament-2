import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useScoreboard } from "../../features/scoreboard-refresh/useScoreboard";
import { scoreboardApi } from "../../shared/api/scoreboardApi";
import {
  emptyScoreBreakdown,
  PRACTICE_PARTICIPANT_MAX,
  PRACTICE_STAGE_MAX,
  scoreBreakdownTotal,
  THEORY_PARTICIPANT_MAX,
  THEORY_STAGE_MAX,
  type Participant,
  type ScoreBreakdown,
  type ScoreboardDocument,
  type Team,
} from "../../shared/model/scoreboard";

type Tab = "settings" | "organizations" | "participants" | "results" | "final";
type ScoreStage = "practiceScores" | "participantFinalScores";

const tabNames: Record<Tab, string> = {
  settings: "Настройки",
  organizations: "Организации",
  participants: "Участники",
  results: "Таблица результатов",
  final: "Финал",
};

const logoFiles = [
  "bashgau.png",
  "buinsk.png",
  "dalgau.png",
  "kazgau.png",
  "kurskgau.png",
  "menzel.png",
  "mozhg.png",
  "penzgau.png",
  "skryabinka.png",
  "spbgau.png",
  "timiryaz.png",
  "ulgau.png",
  "uyar.png",
  "vitebsk.png",
];
const mainFields: Array<[keyof ScoreBreakdown, string]> = [
  ["time", "Время"],
  ["safety", "ТБ"],
  ["model", "Модель"],
  ["mp", "МП"],
  ["angle", "Угол"],
];
const parameterFields: Array<[keyof ScoreBreakdown, string]> = [
  ["length", "Д"],
  ["width", "В"],
  ["c1", "C1"],
  ["c2", "C2"],
];
const extraFields: Array<[keyof ScoreBreakdown, string]> = [
  ["shape", "Форма"],
  ["edge", "Край"],
  ["sole", "Подошва"],
  ["thickness", "Толщина"],
];
const allFields = [...mainFields, ...parameterFields, ...extraFields];

const toDocument = (
  data: NonNullable<ReturnType<typeof useScoreboard>["data"]>,
): ScoreboardDocument => ({
  settings: structuredClone(data.settings),
  teams: structuredClone(data.teams),
  participants: structuredClone(data.participants),
  theoryScores: structuredClone(data.theoryScores),
  practiceScores: structuredClone(data.practiceScores),
  participantFinalScores: structuredClone(data.participantFinalScores),
  teamFinalScores: structuredClone(data.teamFinalScores),
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <input
      type="number"
      min="0"
      value={value ?? ""}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
    />
  );
}

function ScoreInput({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <input
      className="sheet-score-input"
      type="number"
      min="0"
      max={max}
      disabled={disabled}
      value={value || ""}
      onChange={(event) => {
        const nextValue =
          event.target.value === "" ? 0 : Number(event.target.value);
        onChange(
          Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(0, nextValue)),
        );
      }}
    />
  );
}

function OrganizationMark({ team }: { team: Team }) {
  return (
    <span className="organization-mark">
      {team.logoFile ? (
        <img src={`/assets/logos/teams/${team.logoFile}`} alt="" />
      ) : (
        <b>{team.shortName.slice(0, 2).toUpperCase()}</b>
      )}
    </span>
  );
}

function StageHeaders({ tone }: { tone: "practice" | "final" }) {
  return (
    <>
      {mainFields.map(([, label]) => (
        <th key={label} rowSpan={2} className={tone}>
          {label}
        </th>
      ))}
      <th colSpan={4} className={tone}>
        Параметры
      </th>
      <th colSpan={4} className={tone}>
        Допы
      </th>
    </>
  );
}

function ScoreSheetColumns() {
  return (
    <colgroup>
      <col className="identity-column" />
      <col className="country-column" />
      <col className="theory-column" />
      {allFields.map(([key]) => (
        <col key={`practice-${key}`} className="score-column" />
      ))}
      <col className="practice-total-column" />
      <col className="final-selector-column" />
      {allFields.map(([key]) => (
        <col key={`final-${key}`} className="score-column" />
      ))}
      <col className="grand-total-column" />
    </colgroup>
  );
}

function ScoreSheetHeader() {
  return (
    <thead>
      <tr>
        <th rowSpan={3} className="identity-head">
          Уч. заведение / ФИО
        </th>
        <th rowSpan={3}>Страна</th>
        <th rowSpan={3} className="theory">
          Теория
          <br />
          <small>макс. {THEORY_PARTICIPANT_MAX}</small>
        </th>
        <th colSpan={13} className="practice">
          Практика
          <br />
          <small>макс. {PRACTICE_PARTICIPANT_MAX} на участника</small>
        </th>
        <th rowSpan={3} className="practice-total">
          Итого за практику
        </th>
        <th rowSpan={3} className="final-selector">
          Финал
        </th>
        <th colSpan={13} className="final">
          Финал
        </th>
        <th rowSpan={3} className="grand-total">
          ИТОГО
        </th>
      </tr>
      <tr>
        <StageHeaders tone="practice" />
        <StageHeaders tone="final" />
      </tr>
      <tr>
        {parameterFields.map(([, label]) => (
          <th key={`p-${label}`} className="practice">
            {label}
          </th>
        ))}
        {extraFields.map(([, label]) => (
          <th key={`pe-${label}`} className="practice">
            {label}
          </th>
        ))}
        {parameterFields.map(([, label]) => (
          <th key={`f-${label}`} className="final">
            {label}
          </th>
        ))}
        {extraFields.map(([, label]) => (
          <th key={`fe-${label}`} className="final">
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function FinalSheetColumns() {
  return (
    <colgroup>
      <col className="identity-column" />
      <col className="country-column" />
      {allFields.map(([key]) => (
        <col key={key} className="score-column" />
      ))}
      <col className="grand-total-column" />
    </colgroup>
  );
}

function FinalSheetHeader() {
  return (
    <thead>
      <tr>
        <th rowSpan={3} className="identity-head">
          Уч. заведение / ФИО
        </th>
        <th rowSpan={3}>Страна</th>
        <th colSpan={13} className="final">
          Финал
        </th>
        <th rowSpan={3} className="grand-total">
          Итого за финал
        </th>
      </tr>
      <tr>
        <StageHeaders tone="final" />
      </tr>
      <tr>
        {parameterFields.map(([, label]) => (
          <th key={`f-${label}`} className="final">
            {label}
          </th>
        ))}
        {extraFields.map(([, label]) => (
          <th key={`fe-${label}`} className="final">
            {label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function AdminPage() {
  const { data, error: loadError } = useScoreboard(false);
  const [draft, setDraft] = useState<ScoreboardDocument | null>(null);
  const [tab, setTab] = useState<Tab>("results");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const finalStickyHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && !draft) setDraft(toDocument(data));
  }, [data, draft]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const participantsByTeam = useMemo(() => {
    const map = new Map<string, Participant[]>();
    for (const participant of draft?.participants ?? [])
      map.set(participant.teamId, [
        ...(map.get(participant.teamId) ?? []),
        participant,
      ]);
    return map;
  }, [draft?.participants]);

  if (!draft)
    return (
      <main className="service-page">
        <h1>Админка</h1>
        <p>{loadError || "Загрузка данных…"}</p>
      </main>
    );

  const theoryByParticipant = new Map(
    draft.theoryScores.map((score) => [score.participantId, score]),
  );
  const practiceByParticipant = new Map(
    draft.practiceScores.map((score) => [score.participantId, score]),
  );
  const finalByParticipant = new Map(
    draft.participantFinalScores.map((score) => [score.participantId, score]),
  );

  const patchTeam = (teamId: string, patch: Partial<Team>) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          teams: current.teams.map((team) =>
            team.teamId === teamId ? { ...team, ...patch } : team,
          ),
        },
    );

  const patchParticipant = (
    participantId: string,
    patch: Partial<Participant>,
  ) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          participants: current.participants.map((participant) =>
            participant.participantId === participantId
              ? { ...participant, ...patch }
              : participant,
          ),
        },
    );

  const patchTheory = (participantId: string, score: number) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          theoryScores: current.theoryScores.map((item) =>
            item.participantId === participantId ? { ...item, score } : item,
          ),
        },
    );

  const patchBreakdown = (
    stage: ScoreStage,
    participantId: string,
    key: keyof ScoreBreakdown,
    value: number,
  ) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          [stage]: current[stage].map((score) =>
            score.participantId === participantId
              ? { ...score, [key]: value }
              : score,
          ),
        },
    );

  const setFinalParticipant = (participantId: string, checked: boolean) =>
    setDraft((current) => {
      if (!current) return current;
      const selected = current.participants.map((participant) =>
        participant.participantId === participantId
          ? { ...participant, isFinalParticipant: checked }
          : participant,
      );
      const teamId = selected.find(
        (participant) => participant.participantId === participantId,
      )?.teamId;
      return {
        ...current,
        participants: selected,
        teams: current.teams.map((team) =>
          team.teamId === teamId
            ? {
                ...team,
                isFinalist: selected.some(
                  (participant) =>
                    participant.teamId === teamId &&
                    participant.isFinalParticipant,
                ),
              }
            : team,
        ),
      };
    });

  const addOrganization = () =>
    setDraft((current) => {
      if (!current) return current;
      const teamId = crypto.randomUUID();
      const team: Team = {
        teamId,
        fullName: "Новая организация",
        shortName: "Новая организация",
        country: "ru",
        logoFile: "",
        isTheoryActive: true,
        isPracticeActive: true,
        isFinalist: false,
        displayOrder: current.teams.length + 1,
        manualRankTheory: null,
        manualRankPractice: null,
        manualRankFinal: null,
      };
      return {
        ...current,
        teams: [...current.teams, team],
        teamFinalScores: [
          ...current.teamFinalScores,
          { teamId, leg1: 0, leg2: 0 },
        ],
      };
    });

  const removeOrganization = (team: Team) => {
    if (
      !window.confirm(
        `Удалить организацию «${team.shortName}» и всех её участников?`,
      )
    )
      return;
    setDraft((current) => {
      if (!current) return current;
      const ids = new Set(
        current.participants
          .filter((participant) => participant.teamId === team.teamId)
          .map((participant) => participant.participantId),
      );
      return {
        ...current,
        teams: current.teams.filter((item) => item.teamId !== team.teamId),
        participants: current.participants.filter(
          (participant) => !ids.has(participant.participantId),
        ),
        theoryScores: current.theoryScores.filter(
          (score) => !ids.has(score.participantId),
        ),
        practiceScores: current.practiceScores.filter(
          (score) => !ids.has(score.participantId),
        ),
        participantFinalScores: current.participantFinalScores.filter(
          (score) => !ids.has(score.participantId),
        ),
        teamFinalScores: current.teamFinalScores.filter(
          (score) => score.teamId !== team.teamId,
        ),
      };
    });
  };

  const addParticipant = (teamId: string) =>
    setDraft((current) => {
      if (!current) return current;
      const participantId = crypto.randomUUID();
      const participant: Participant = {
        participantId,
        teamId,
        fullName: "Новый участник",
        isTheoryParticipant: true,
        isPracticeParticipant: true,
        isFinalParticipant: false,
        practiceSlot:
          current.participants.filter((item) => item.teamId === teamId).length +
          1,
        finalSlot: null,
      };
      return {
        ...current,
        participants: [...current.participants, participant],
        theoryScores: [...current.theoryScores, { participantId, score: 0 }],
        practiceScores: [
          ...current.practiceScores,
          { participantId, ...emptyScoreBreakdown() },
        ],
        participantFinalScores: [
          ...current.participantFinalScores,
          { participantId, ...emptyScoreBreakdown() },
        ],
      };
    });

  const removeParticipant = (participantId: string) =>
    setDraft((current) => {
      if (!current) return current;
      const teamId = current.participants.find(
        (participant) => participant.participantId === participantId,
      )?.teamId;
      const participants = current.participants.filter(
        (participant) => participant.participantId !== participantId,
      );
      return {
        ...current,
        participants,
        teams: current.teams.map((team) =>
          team.teamId === teamId
            ? {
                ...team,
                isFinalist: participants.some(
                  (participant) =>
                    participant.teamId === teamId &&
                    participant.isFinalParticipant,
                ),
              }
            : team,
        ),
        theoryScores: current.theoryScores.filter(
          (score) => score.participantId !== participantId,
        ),
        practiceScores: current.practiceScores.filter(
          (score) => score.participantId !== participantId,
        ),
        participantFinalScores: current.participantFinalScores.filter(
          (score) => score.participantId !== participantId,
        ),
      };
    });

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await scoreboardApi.save({
        ...draft,
        settings: { ...draft.settings, finalInputMode: "participant" },
      });
      setDraft(toDocument(response));
      setMessage("Данные сохранены. Эфирные экраны обновятся автоматически.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "Ошибка сохранения.",
      );
    } finally {
      setSaving(false);
    }
  };

  const navActions = document.getElementById("admin-nav-actions");
  const isSuccess = message.startsWith("Данные");

  return (
    <>
      {navActions &&
        createPortal(
          <button className="nav-save-button" onClick={save} disabled={saving}>
            <span>
              {saving ? "Сохранение…" : "Сохранить"}
              <br />
              {saving ? "Подождите" : "изменения"}
            </span>
          </button>,
          navActions,
        )}
      <main
        className={`service-page admin-page ${tab === "results" || tab === "final" ? "sheet-page" : ""}`}
      >
        <div className="admin-title">
          <div>
            <h1>Управление соревнованием</h1>
            <p>Данные участников и оценки по форме официальной ведомости.</p>
          </div>
        </div>
        {message && (
          <div
            className={`save-notification ${isSuccess ? "success" : "error"}`}
            role="status"
          >
            <div>
              <b>
                {isSuccess ? "Изменения сохранены" : "Не удалось сохранить"}
              </b>
              {!!message && <small>{message}</small>}
            </div>
          </div>
        )}
        <div className="admin-tabs">
          {(Object.keys(tabNames) as Tab[]).map((key) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {tabNames[key]}
            </button>
          ))}
        </div>

        {tab === "settings" && (
          <section className="admin-card settings-grid">
            <Field label="Интервал обновления эфира, мс">
              <NumberInput
                value={draft.settings.refreshIntervalMs}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    settings: {
                      ...draft.settings,
                      refreshIntervalMs: value ?? 2000,
                    },
                  })
                }
              />
            </Field>
            <Field label="Название организации в эфире">
              <select
                value={draft.settings.teamNameMode}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    settings: {
                      ...draft.settings,
                      teamNameMode: event.target.value as "full" | "short",
                    },
                  })
                }
              >
                <option value="full">Полное</option>
                <option value="short">Короткое</option>
              </select>
            </Field>
            <label className="check-field">
              <input
                type="checkbox"
                checked={draft.settings.transparentBackground}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    settings: {
                      ...draft.settings,
                      transparentBackground: event.target.checked,
                    },
                  })
                }
              />{" "}
              Прозрачный фон для OBS
            </label>
          </section>
        )}

        {tab === "organizations" && (
          <section className="admin-card directory-card">
            <div className="admin-section-head">
              <div>
                <h2>Организации</h2>
                <p>Справочник учебных заведений из ведомости.</p>
              </div>
              <button
                className="button primary"
                type="button"
                onClick={addOrganization}
              >
                + Добавить организацию
              </button>
            </div>
            <div className="organization-list">
              {draft.teams.map((team) => (
                <article className="organization-editor" key={team.teamId}>
                  <OrganizationMark team={team} />
                  <Field label="Полное название">
                    <input
                      value={team.fullName}
                      onChange={(event) =>
                        patchTeam(team.teamId, { fullName: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Короткое название">
                    <input
                      value={team.shortName}
                      onChange={(event) =>
                        patchTeam(team.teamId, {
                          shortName: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Страна">
                    <select
                      value={team.country}
                      onChange={(event) =>
                        patchTeam(team.teamId, {
                          country: event.target.value as "ru" | "by",
                        })
                      }
                    >
                      <option value="ru">Россия</option>
                      <option value="by">Беларусь</option>
                    </select>
                  </Field>
                  <Field label="Логотип">
                    <select
                      value={team.logoFile}
                      onChange={(event) =>
                        patchTeam(team.teamId, { logoFile: event.target.value })
                      }
                    >
                      <option value="">Без логотипа</option>
                      {logoFiles.map((file) => (
                        <option key={file}>{file}</option>
                      ))}
                    </select>
                  </Field>
                  <button
                    className="icon-button danger"
                    type="button"
                    onClick={() => removeOrganization(team)}
                  >
                    Удалить
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "participants" && (
          <section className="admin-card directory-card">
            <div className="admin-section-head">
              <div>
                <h2>Участники</h2>
                <p>Загружено из PDF: {draft.participants.length} участников.</p>
              </div>
            </div>
            <div className="participant-groups">
              {draft.teams.map((team) => (
                <article className="participant-group" key={team.teamId}>
                  <header>
                    <div>
                      <OrganizationMark team={team} />
                      <strong>{team.shortName}</strong>
                    </div>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => addParticipant(team.teamId)}
                    >
                      + Добавить участника
                    </button>
                  </header>
                  {(participantsByTeam.get(team.teamId) ?? []).map(
                    (participant) => (
                      <div
                        className="participant-editor"
                        key={participant.participantId}
                      >
                        <input
                          value={participant.fullName}
                          onChange={(event) =>
                            patchParticipant(participant.participantId, {
                              fullName: event.target.value,
                            })
                          }
                        />
                        <select
                          value={participant.teamId}
                          onChange={(event) =>
                            patchParticipant(participant.participantId, {
                              teamId: event.target.value,
                            })
                          }
                        >
                          {draft.teams.map((item) => (
                            <option key={item.teamId} value={item.teamId}>
                              {item.shortName}
                            </option>
                          ))}
                        </select>
                        <button
                          className="icon-button danger"
                          type="button"
                          onClick={() =>
                            removeParticipant(participant.participantId)
                          }
                        >
                          Удалить
                        </button>
                      </div>
                    ),
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "results" && (
          <section className="admin-card score-sheet-card">
            <div className="score-sheet-help">
              <b>Таблица результатов</b>
              <span>
                Практика заполняется для всех участников. Отметьте галочкой тех,
                кто выступает в финале.
              </span>
            </div>
            <div className="score-sheet-sticky-header" ref={stickyHeaderRef}>
              <table className="score-sheet">
                <ScoreSheetColumns />
                <ScoreSheetHeader />
              </table>
            </div>
            <div
              className="score-sheet-scroll"
              onScroll={(event) => {
                if (stickyHeaderRef.current)
                  stickyHeaderRef.current.scrollLeft =
                    event.currentTarget.scrollLeft;
              }}
            >
              <table className="score-sheet score-sheet-body">
                <ScoreSheetColumns />
                <tbody>
                  {[...draft.teams]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((team) => {
                      const members = participantsByTeam.get(team.teamId) ?? [];
                      const teamTheory = members.reduce(
                        (sum, member) =>
                          sum +
                          (theoryByParticipant.get(member.participantId)
                            ?.score ?? 0),
                        0,
                      );
                      const teamPractice = members.reduce(
                        (sum, member) =>
                          sum +
                          scoreBreakdownTotal(
                            practiceByParticipant.get(member.participantId),
                          ),
                        0,
                      );
                      const teamFinal = members
                        .filter((member) => member.isFinalParticipant)
                        .reduce(
                          (sum, member) =>
                            sum +
                            scoreBreakdownTotal(
                              finalByParticipant.get(member.participantId),
                            ),
                          0,
                        );
                      return (
                        <Fragment key={team.teamId}>
                          <tr className="team-summary">
                            <th>{team.shortName}</th>
                            <td>{team.country}</td>
                            <td>
                              {teamTheory} / {THEORY_STAGE_MAX}
                            </td>
                            <td colSpan={13} />
                            <td>
                              {teamPractice} / {PRACTICE_STAGE_MAX}
                            </td>
                            <td />
                            <td colSpan={13}>
                              {teamFinal ? `Финал: ${teamFinal}` : ""}
                            </td>
                            <td>{teamTheory + teamPractice + teamFinal}</td>
                          </tr>
                          {members.map((participant) => {
                            const theory =
                              theoryByParticipant.get(participant.participantId)
                                ?.score ?? 0;
                            const practice = practiceByParticipant.get(
                              participant.participantId,
                            )!;
                            const final = finalByParticipant.get(
                              participant.participantId,
                            )!;
                            const practiceTotal = scoreBreakdownTotal(practice);
                            const finalTotal = participant.isFinalParticipant
                              ? scoreBreakdownTotal(final)
                              : 0;
                            return (
                              <tr key={participant.participantId}>
                                <th>{participant.fullName}</th>
                                <td />
                                <td>
                                  <ScoreInput
                                    value={theory}
                                    max={Math.max(
                                      0,
                                      Math.min(
                                        THEORY_PARTICIPANT_MAX,
                                        THEORY_STAGE_MAX -
                                          (teamTheory - theory),
                                      ),
                                    )}
                                    onChange={(value) =>
                                      patchTheory(
                                        participant.participantId,
                                        value,
                                      )
                                    }
                                  />
                                </td>
                                {allFields.map(([key]) => (
                                  <td key={`p-${key}`}>
                                    <ScoreInput
                                      value={practice[key]}
                                      max={Math.max(
                                        0,
                                        Math.min(
                                          PRACTICE_PARTICIPANT_MAX -
                                            (practiceTotal - practice[key]),
                                          PRACTICE_STAGE_MAX -
                                            (teamPractice - practice[key]),
                                        ),
                                      )}
                                      onChange={(value) =>
                                        patchBreakdown(
                                          "practiceScores",
                                          participant.participantId,
                                          key,
                                          value,
                                        )
                                      }
                                    />
                                  </td>
                                ))}
                                <td className="calculated">{practiceTotal}</td>
                                <td className="final-check">
                                  <input
                                    type="checkbox"
                                    checked={participant.isFinalParticipant}
                                    onChange={(event) =>
                                      setFinalParticipant(
                                        participant.participantId,
                                        event.target.checked,
                                      )
                                    }
                                  />
                                </td>
                                {allFields.map(([key]) => (
                                  <td key={`f-${key}`}>
                                    <ScoreInput
                                      value={final[key]}
                                      disabled={!participant.isFinalParticipant}
                                      onChange={(value) =>
                                        patchBreakdown(
                                          "participantFinalScores",
                                          participant.participantId,
                                          key,
                                          value,
                                        )
                                      }
                                    />
                                  </td>
                                ))}
                                <td className="calculated grand">
                                  {theory + practiceTotal + finalTotal}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "final" && (
          <section className="admin-card score-sheet-card final-sheet-card">
            <div className="score-sheet-help">
              <b>Финальный этап</b>
              <span>
                Здесь отображаются только участники, отмеченные для финала в
                общей таблице результатов.
              </span>
            </div>
            {draft.participants.some(
              (participant) => participant.isFinalParticipant,
            ) ? (
              <>
                <div
                  className="score-sheet-sticky-header"
                  ref={finalStickyHeaderRef}
                >
                  <table className="score-sheet final-only-sheet">
                    <FinalSheetColumns />
                    <FinalSheetHeader />
                  </table>
                </div>
                <div
                  className="score-sheet-scroll"
                  onScroll={(event) => {
                    if (finalStickyHeaderRef.current)
                      finalStickyHeaderRef.current.scrollLeft =
                        event.currentTarget.scrollLeft;
                  }}
                >
                  <table className="score-sheet score-sheet-body final-only-sheet">
                    <FinalSheetColumns />
                    <tbody>
                      {[...draft.teams]
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((team) => {
                          const finalists = (
                            participantsByTeam.get(team.teamId) ?? []
                          ).filter(
                            (participant) => participant.isFinalParticipant,
                          );
                          if (!finalists.length) return null;
                          const teamFinal = finalists.reduce(
                            (sum, participant) =>
                              sum +
                              scoreBreakdownTotal(
                                finalByParticipant.get(
                                  participant.participantId,
                                ),
                              ),
                            0,
                          );
                          return (
                            <Fragment key={team.teamId}>
                              <tr className="team-summary">
                                <th>{team.shortName}</th>
                                <td>{team.country}</td>
                                <td colSpan={13} />
                                <td>{teamFinal}</td>
                              </tr>
                              {finalists.map((participant) => {
                                const final = finalByParticipant.get(
                                  participant.participantId,
                                )!;
                                return (
                                  <tr key={participant.participantId}>
                                    <th>{participant.fullName}</th>
                                    <td />
                                    {allFields.map(([key]) => (
                                      <td key={key}>
                                        <ScoreInput
                                          value={final[key]}
                                          onChange={(value) =>
                                            patchBreakdown(
                                              "participantFinalScores",
                                              participant.participantId,
                                              key,
                                              value,
                                            )
                                          }
                                        />
                                      </td>
                                    ))}
                                    <td className="calculated grand">
                                      {scoreBreakdownTotal(final)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="final-empty-state">
                <b>Участники финала пока не выбраны</b>
                <span>
                  Откройте вкладку «Таблица результатов» и отметьте нужных
                  участников в колонке «Финал».
                </span>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => setTab("results")}
                >
                  Перейти к выбору участников
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
