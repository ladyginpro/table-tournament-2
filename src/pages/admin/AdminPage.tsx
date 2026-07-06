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
  emptyParticipantFinalScore,
  emptyScoreBreakdown,
  FINAL_LEG_MAX,
  FINAL_PARTICIPANT_MAX,
  FINAL_PARTICIPANTS_MAX,
  FINAL_STAGE_MAX,
  participantFinalTotal,
  PRACTICE_PARTICIPANT_MAX,
  PRACTICE_PARTICIPANTS_MAX,
  PRACTICE_STAGE_MAX,
  scoreBreakdownTotal,
  THEORY_PARTICIPANT_MAX,
  THEORY_STAGE_MAX,
  type Participant,
  type ScoreBreakdown,
  type ScoreboardDocument,
  type Team,
} from "../../shared/model/scoreboard";

type Tab =
  | "settings"
  | "organizations"
  | "participants"
  | "results"
  | "practice"
  | "final";
type SelectionStage = "practice" | "final";
type FinalLeg = "leg1" | "leg2";

const tabNames: Record<Tab, string> = {
  settings: "Настройки",
  organizations: "Организации",
  participants: "Участники",
  results: "Выбор участников",
  practice: "Практика",
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

function ScoreSheetColumns({ final = false }: { final?: boolean }) {
  return (
    <colgroup>
      <col className="identity-column" />
      <col className="country-column" />
      {final && <col className="leg-column" />}
      {allFields.map(([key]) => (
        <col key={key} className="score-column" />
      ))}
      <col className="grand-total-column" />
      {final ? (
        <col className="participant-total-column" />
      ) : (
        <col className="final-selector-column" />
      )}
    </colgroup>
  );
}

function ScoreSheetHeader({ final = false }: { final?: boolean }) {
  const tone = final ? "final" : "practice";
  return (
    <thead>
      <tr>
        <th rowSpan={3} className="identity-head">
          Уч. заведение / ФИО
        </th>
        <th rowSpan={3}>Страна</th>
        {final && (
          <th rowSpan={3} className="final">
            Нога
          </th>
        )}
        <th colSpan={13} className={tone}>
          {final
            ? `Финал - максимум ${FINAL_LEG_MAX} за ногу`
            : `Практика - максимум ${PRACTICE_PARTICIPANT_MAX} на участника`}
        </th>
        <th rowSpan={3} className="grand-total">
          {final ? "Итого за ногу" : "Итого"}
        </th>
        {final ? (
          <th rowSpan={3} className="participant-total">
            Итого участника
            <br />
            <small>макс. {FINAL_PARTICIPANT_MAX}</small>
          </th>
        ) : (
          <th rowSpan={3} className="final-selector">
            Финал
          </th>
        )}
      </tr>
      <tr>
        <StageHeaders tone={tone} />
      </tr>
      <tr>
        {parameterFields.map(([, label]) => (
          <th key={`p-${label}`} className={tone}>
            {label}
          </th>
        ))}
        {extraFields.map(([, label]) => (
          <th key={`e-${label}`} className={tone}>
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
  const practiceStickyHeaderRef = useRef<HTMLDivElement>(null);
  const finalStickyHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && !draft) setDraft(toDocument(data));
  }, [data, draft]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const participantsByTeam = useMemo(() => {
    const map = new Map<string, Participant[]>();
    for (const participant of draft?.participants ?? []) {
      map.set(participant.teamId, [
        ...(map.get(participant.teamId) ?? []),
        participant,
      ]);
    }
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
    setDraft((current) => {
      if (!current) return current;
      const movingTeam =
        patch.teamId &&
        current.participants.find(
          (item) => item.participantId === participantId,
        )?.teamId !== patch.teamId;
      const participants = current.participants.map((participant) =>
        participant.participantId === participantId
          ? {
              ...participant,
              ...patch,
              ...(movingTeam
                ? {
                    isPracticeParticipant: false,
                    isFinalParticipant: false,
                    practiceSlot: null,
                    finalSlot: null,
                  }
                : {}),
            }
          : participant,
      );
      return {
        ...current,
        participants,
        teams: current.teams.map((team) => ({
          ...team,
          isFinalist: participants.some(
            (participant) =>
              participant.teamId === team.teamId &&
              participant.isFinalParticipant,
          ),
        })),
      };
    });

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

  const patchPractice = (
    participantId: string,
    key: keyof ScoreBreakdown,
    value: number,
  ) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          practiceScores: current.practiceScores.map((score) =>
            score.participantId === participantId
              ? { ...score, [key]: value }
              : score,
          ),
        },
    );

  const patchFinal = (
    participantId: string,
    leg: FinalLeg,
    key: keyof ScoreBreakdown,
    value: number,
  ) =>
    setDraft(
      (current) =>
        current && {
          ...current,
          participantFinalScores: current.participantFinalScores.map((score) =>
            score.participantId === participantId
              ? { ...score, [leg]: { ...score[leg], [key]: value } }
              : score,
          ),
        },
    );

  const setStageParticipant = (
    stage: SelectionStage,
    participantId: string,
    checked: boolean,
  ) => {
    const flag =
      stage === "practice" ? "isPracticeParticipant" : "isFinalParticipant";
    const slot = stage === "practice" ? "practiceSlot" : "finalSlot";
    const limit =
      stage === "practice" ? PRACTICE_PARTICIPANTS_MAX : FINAL_PARTICIPANTS_MAX;
    const target = draft.participants.find(
      (participant) => participant.participantId === participantId,
    );
    if (!target) return;
    const selected = draft.participants.filter(
      (participant) =>
        participant.teamId === target.teamId && participant[flag],
    );
    if (checked && !target[flag] && selected.length >= limit) {
      setMessage(
        `${stage === "practice" ? "Практика" : "Финал"}: от команды можно выбрать не более ${limit} участников.`,
      );
      return;
    }
    const nextSlot = checked
      ? Math.max(0, ...selected.map((participant) => participant[slot] ?? 0)) +
        1
      : null;
    setDraft((current) => {
      if (!current) return current;
      const participants = current.participants.map((participant) =>
        participant.participantId === participantId
          ? { ...participant, [flag]: checked, [slot]: nextSlot }
          : participant,
      );
      return {
        ...current,
        participants,
        teams: current.teams.map((team) =>
          team.teamId === target.teamId
            ? {
                ...team,
                isFinalist: participants.some(
                  (participant) =>
                    participant.teamId === team.teamId &&
                    participant.isFinalParticipant,
                ),
              }
            : team,
        ),
      };
    });
  };

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
      return { ...current, teams: [...current.teams, team] };
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
        isPracticeParticipant: false,
        isFinalParticipant: false,
        practiceSlot: null,
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
          emptyParticipantFinalScore(participantId),
        ],
      };
    });

  const removeParticipant = (participantId: string) =>
    setDraft((current) => {
      if (!current) return current;
      const participants = current.participants.filter(
        (participant) => participant.participantId !== participantId,
      );
      return {
        ...current,
        participants,
        teams: current.teams.map((team) => ({
          ...team,
          isFinalist: participants.some(
            (participant) =>
              participant.teamId === team.teamId &&
              participant.isFinalParticipant,
          ),
        })),
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
  const sortedTeams = [...draft.teams].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

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
        className={`service-page admin-page ${["results", "practice", "final"].includes(tab) ? "sheet-page" : ""}`}
      >
        <div className="admin-title">
          <div>
            <h1>Управление соревнованием</h1>
            <p>Составы команд и оценки по этапам.</p>
          </div>
        </div>
        {message && (
          <div
            className={`save-notification ${isSuccess ? "success" : "error"}`}
            role="status"
          >
            <div>
              <b>{isSuccess ? "Изменения сохранены" : "Проверьте данные"}</b>
              <small>{message}</small>
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
                <p>Справочник учебных заведений.</p>
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
                <p>
                  В теории участвует весь состав команды, без отдельного выбора.
                </p>
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
          <section className="admin-card selection-card">
            <div className="score-sheet-help">
              <b>Выбор участников и теория</b>
              <span>
                Теория заполняется для всего состава. Практика - максимум 3
                участника, финал - максимум 2 участника от команды.
              </span>
            </div>
            <div className="table-scroll">
              <table className="selection-table">
                <thead>
                  <tr>
                    <th>Уч. заведение / ФИО</th>
                    <th>Страна</th>
                    <th>
                      Теория
                      <br />
                      <small>макс. 60</small>
                    </th>
                    <th>Практика</th>
                    <th>
                      Баллы
                      <br />
                      практики
                    </th>
                    <th>Финал</th>
                    <th>
                      Баллы
                      <br />
                      финала
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team) => {
                    const members = participantsByTeam.get(team.teamId) ?? [];
                    const teamTheory = members.reduce(
                      (sum, member) =>
                        sum +
                        (theoryByParticipant.get(member.participantId)?.score ??
                          0),
                      0,
                    );
                    const teamPractice = members
                      .filter((member) => member.isPracticeParticipant)
                      .reduce(
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
                          participantFinalTotal(
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
                          <td>
                            {
                              members.filter(
                                (member) => member.isPracticeParticipant,
                              ).length
                            }{" "}
                            / {PRACTICE_PARTICIPANTS_MAX}
                          </td>
                          <td>
                            {teamPractice} / {PRACTICE_STAGE_MAX}
                          </td>
                          <td>
                            {
                              members.filter(
                                (member) => member.isFinalParticipant,
                              ).length
                            }{" "}
                            / {FINAL_PARTICIPANTS_MAX}
                          </td>
                          <td>
                            {teamFinal} / {FINAL_STAGE_MAX}
                          </td>
                        </tr>
                        {members.map((participant) => {
                          const theory =
                            theoryByParticipant.get(participant.participantId)
                              ?.score ?? 0;
                          const practiceTotal = scoreBreakdownTotal(
                            practiceByParticipant.get(
                              participant.participantId,
                            ),
                          );
                          const finalTotal = participantFinalTotal(
                            finalByParticipant.get(participant.participantId),
                          );
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
                                      THEORY_STAGE_MAX - (teamTheory - theory),
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
                              <td className="stage-check">
                                <input
                                  type="checkbox"
                                  checked={participant.isPracticeParticipant}
                                  onChange={(event) =>
                                    setStageParticipant(
                                      "practice",
                                      participant.participantId,
                                      event.target.checked,
                                    )
                                  }
                                />
                              </td>
                              <td
                                className={
                                  participant.isPracticeParticipant
                                    ? "calculated"
                                    : "inactive-score"
                                }
                              >
                                {participant.isPracticeParticipant
                                  ? practiceTotal
                                  : "-"}
                              </td>
                              <td className="stage-check final">
                                <input
                                  type="checkbox"
                                  checked={participant.isFinalParticipant}
                                  onChange={(event) =>
                                    setStageParticipant(
                                      "final",
                                      participant.participantId,
                                      event.target.checked,
                                    )
                                  }
                                />
                              </td>
                              <td
                                className={
                                  participant.isFinalParticipant
                                    ? "calculated grand"
                                    : "inactive-score"
                                }
                              >
                                {participant.isFinalParticipant
                                  ? finalTotal
                                  : "-"}
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

        {tab === "practice" && (
          <section className="admin-card score-sheet-card">
            <div className="score-sheet-help">
              <b>Практический этап</b>
              <span>
                Показаны только участники, отмеченные на вкладке «Выбор
                участников». Все 13 полей, включая «Допы», входят в максимум
                100.
              </span>
            </div>
            {draft.participants.some(
              (participant) => participant.isPracticeParticipant,
            ) ? (
              <>
                <div
                  className="score-sheet-sticky-header"
                  ref={practiceStickyHeaderRef}
                >
                  <table className="score-sheet practice-only-sheet">
                    <ScoreSheetColumns />
                    <ScoreSheetHeader />
                  </table>
                </div>
                <div
                  className="score-sheet-scroll"
                  onScroll={(event) => {
                    if (practiceStickyHeaderRef.current)
                      practiceStickyHeaderRef.current.scrollLeft =
                        event.currentTarget.scrollLeft;
                  }}
                >
                  <table className="score-sheet score-sheet-body practice-only-sheet">
                    <ScoreSheetColumns />
                    <tbody>
                      {sortedTeams.map((team) => {
                        const practiceMembers = (
                          participantsByTeam.get(team.teamId) ?? []
                        )
                          .filter(
                            (participant) => participant.isPracticeParticipant,
                          )
                          .sort(
                            (a, b) =>
                              (a.practiceSlot ?? 99) - (b.practiceSlot ?? 99),
                          );
                        if (!practiceMembers.length) return null;
                        const teamTotal = practiceMembers.reduce(
                          (sum, participant) =>
                            sum +
                            scoreBreakdownTotal(
                              practiceByParticipant.get(
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
                              <td>
                                {teamTotal} / {PRACTICE_STAGE_MAX}
                              </td>
                              <td>
                                {
                                  practiceMembers.filter(
                                    (participant) =>
                                      participant.isFinalParticipant,
                                  ).length
                                }{" "}
                                / {FINAL_PARTICIPANTS_MAX}
                              </td>
                            </tr>
                            {practiceMembers.map((participant) => {
                              const score = practiceByParticipant.get(
                                participant.participantId,
                              )!;
                              const total = scoreBreakdownTotal(score);
                              return (
                                <tr key={participant.participantId}>
                                  <th>{participant.fullName}</th>
                                  <td />
                                  {allFields.map(([key]) => (
                                    <td key={key}>
                                      <ScoreInput
                                        value={score[key]}
                                        max={Math.max(
                                          0,
                                          PRACTICE_PARTICIPANT_MAX -
                                            (total - score[key]),
                                        )}
                                        onChange={(value) =>
                                          patchPractice(
                                            participant.participantId,
                                            key,
                                            value,
                                          )
                                        }
                                      />
                                    </td>
                                  ))}
                                  <td className="calculated grand">
                                    {total} / {PRACTICE_PARTICIPANT_MAX}
                                  </td>
                                  <td className="final-check">
                                    <input
                                      type="checkbox"
                                      checked={participant.isFinalParticipant}
                                      aria-label={`Финал: ${participant.fullName}`}
                                      onChange={(event) =>
                                        setStageParticipant(
                                          "final",
                                          participant.participantId,
                                          event.target.checked,
                                        )
                                      }
                                    />
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
                <b>Участники практики пока не выбраны</b>
                <span>
                  Откройте вкладку «Выбор участников» и отметьте до трёх человек
                  от каждой команды.
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

        {tab === "final" && (
          <section className="admin-card score-sheet-card final-sheet-card">
            <div className="score-sheet-help">
              <b>Финальный этап</b>
              <span>
                У каждого финалиста две отдельные ноги по 100 баллов. Максимум
                участника - 200, команды - 400.
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
                  <table className="score-sheet final-legs-sheet">
                    <ScoreSheetColumns final />
                    <ScoreSheetHeader final />
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
                  <table className="score-sheet score-sheet-body final-legs-sheet">
                    <ScoreSheetColumns final />
                    <tbody>
                      {sortedTeams.map((team) => {
                        const finalists = (
                          participantsByTeam.get(team.teamId) ?? []
                        )
                          .filter(
                            (participant) => participant.isFinalParticipant,
                          )
                          .sort(
                            (a, b) => (a.finalSlot ?? 99) - (b.finalSlot ?? 99),
                          );
                        if (!finalists.length) return null;
                        const teamFinal = finalists.reduce(
                          (sum, participant) =>
                            sum +
                            participantFinalTotal(
                              finalByParticipant.get(participant.participantId),
                            ),
                          0,
                        );
                        return (
                          <Fragment key={team.teamId}>
                            <tr className="team-summary">
                              <th>{team.shortName}</th>
                              <td>{team.country}</td>
                              <td />
                              <td colSpan={13} />
                              <td>
                                {teamFinal} / {FINAL_STAGE_MAX}
                              </td>
                              <td />
                            </tr>
                            {finalists.map((participant) => {
                              const final = finalByParticipant.get(
                                participant.participantId,
                              )!;
                              const participantTotal =
                                participantFinalTotal(final);
                              return (
                                <Fragment key={participant.participantId}>
                                  {(["leg1", "leg2"] as FinalLeg[]).map(
                                    (leg, legIndex) => {
                                      const legTotal = scoreBreakdownTotal(
                                        final[leg],
                                      );
                                      return (
                                        <tr key={leg}>
                                          {legIndex === 0 && (
                                            <th rowSpan={2}>
                                              {participant.fullName}
                                            </th>
                                          )}
                                          {legIndex === 0 && <td rowSpan={2} />}
                                          <td className="leg-label">
                                            {legIndex + 1}
                                          </td>
                                          {allFields.map(([key]) => (
                                            <td key={key}>
                                              <ScoreInput
                                                value={final[leg][key]}
                                                max={Math.max(
                                                  0,
                                                  FINAL_LEG_MAX -
                                                    (legTotal -
                                                      final[leg][key]),
                                                )}
                                                onChange={(value) =>
                                                  patchFinal(
                                                    participant.participantId,
                                                    leg,
                                                    key,
                                                    value,
                                                  )
                                                }
                                              />
                                            </td>
                                          ))}
                                          <td className="calculated">
                                            {legTotal} / {FINAL_LEG_MAX}
                                          </td>
                                          {legIndex === 0 && (
                                            <td
                                              rowSpan={2}
                                              className="calculated grand"
                                            >
                                              {participantTotal} /{" "}
                                              {FINAL_PARTICIPANT_MAX}
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    },
                                  )}
                                </Fragment>
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
                  Откройте вкладку «Выбор участников» и отметьте до двух человек
                  от каждой команды.
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
