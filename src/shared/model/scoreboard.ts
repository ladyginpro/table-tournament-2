export type CountryCode = 'ru' | 'by';
export type PracticeStatus = 'done' | 'preparing' | 'not_started';
export type TeamNameMode = 'full' | 'short';
export type FinalInputMode = 'participant' | 'team';

export interface ScoreboardSettings {
  refreshIntervalMs: number;
  finalistsCount: number;
  teamNameMode: TeamNameMode;
  finalInputMode: FinalInputMode;
  transparentBackground: boolean;
}

export interface Team {
  teamId: string;
  fullName: string;
  shortName: string;
  country: CountryCode;
  logoFile: string;
  isActive: boolean;
  isFinalist: boolean;
  displayOrder: number;
  manualRankTheory: number | null;
  manualRankPractice: number | null;
  manualRankFinal: number | null;
}

export interface Participant {
  participantId: string;
  teamId: string;
  fullName: string;
  isTheoryParticipant: boolean;
  isPracticeParticipant: boolean;
  isFinalParticipant: boolean;
  practiceSlot: number | null;
  finalSlot: number | null;
}

export interface TheoryScore { participantId: string; score: number }
export interface PracticeScore { participantId: string; score: number; status: PracticeStatus }
export interface ParticipantFinalScore { participantId: string; leg1: number; leg2: number }
export interface TeamFinalScore { teamId: string; leg1: number; leg2: number }

export interface ScoreboardDocument {
  settings: ScoreboardSettings;
  teams: Team[];
  participants: Participant[];
  theoryScores: TheoryScore[];
  practiceScores: PracticeScore[];
  participantFinalScores: ParticipantFinalScore[];
  teamFinalScores: TeamFinalScore[];
}

export interface StageParticipantStatus {
  participantId: string;
  slot: number;
  status: PracticeStatus;
}

export interface TeamResult {
  teamId: string;
  place: number;
  theoryTotal: number;
  practiceTotal: number;
  qualifyingTotal: number;
  finalTotal: number;
  total: number;
  leaderGap: number;
  practiceStatuses: StageParticipantStatus[];
  finalStatus: 'done' | 'not_finalist' | 'not_participating';
}

export interface ScoreboardResponse extends ScoreboardDocument {
  stageResults: {
    theory: TeamResult[];
    practice: TeamResult[];
    final: TeamResult[];
  };
  updatedAt: string;
}

const byId = <T extends { participantId: string }>(items: T[]) =>
  new Map(items.map((item) => [item.participantId, item]));

const tieRank = (team: Team, stage: 'theory' | 'practice' | 'final') => {
  const value = stage === 'theory'
    ? team.manualRankTheory
    : stage === 'practice'
      ? team.manualRankPractice
      : team.manualRankFinal;
  return value ?? Number.MAX_SAFE_INTEGER;
};

export function calculateStageResults(document: ScoreboardDocument): ScoreboardResponse['stageResults'] {
  const theory = byId(document.theoryScores);
  const practice = byId(document.practiceScores);
  const participantFinal = byId(document.participantFinalScores);
  const teamFinal = new Map(document.teamFinalScores.map((score) => [score.teamId, score]));
  const participantsByTeam = new Map<string, Participant[]>();

  for (const participant of document.participants) {
    const list = participantsByTeam.get(participant.teamId) ?? [];
    list.push(participant);
    participantsByTeam.set(participant.teamId, list);
  }

  const base = document.teams.filter((team) => team.isActive).map((team) => {
    const members = participantsByTeam.get(team.teamId) ?? [];
    const theoryTotal = members
      .filter((member) => member.isTheoryParticipant)
      .reduce((sum, member) => sum + (theory.get(member.participantId)?.score ?? 0), 0);
    const practiceMembers = members
      .filter((member) => member.isPracticeParticipant)
      .sort((a, b) => (a.practiceSlot ?? 99) - (b.practiceSlot ?? 99));
    const practiceTotal = practiceMembers
      .reduce((sum, member) => sum + (practice.get(member.participantId)?.score ?? 0), 0);

    let finalTotal = 0;
    if (team.isFinalist) {
      if (document.settings.finalInputMode === 'team') {
        const score = teamFinal.get(team.teamId);
        finalTotal = (score?.leg1 ?? 0) + (score?.leg2 ?? 0);
      } else {
        finalTotal = members
          .filter((member) => member.isFinalParticipant)
          .reduce((sum, member) => {
            const score = participantFinal.get(member.participantId);
            return sum + (score?.leg1 ?? 0) + (score?.leg2 ?? 0);
          }, 0);
      }
    }

    return {
      teamId: team.teamId,
      place: 0,
      theoryTotal,
      practiceTotal,
      qualifyingTotal: theoryTotal + practiceTotal,
      finalTotal,
      total: theoryTotal + practiceTotal + finalTotal,
      leaderGap: 0,
      practiceStatuses: practiceMembers.map((member, index) => ({
        participantId: member.participantId,
        slot: member.practiceSlot ?? index + 1,
        status: practice.get(member.participantId)?.status ?? 'not_started',
      })),
      finalStatus: team.isFinalist
        ? (finalTotal > 0 ? 'done' as const : 'not_participating' as const)
        : 'not_finalist' as const,
    };
  });

  const teamMap = new Map(document.teams.map((team) => [team.teamId, team]));
  const sortStage = (stage: 'theory' | 'practice' | 'final') => {
    const score = (item: TeamResult) => stage === 'theory'
      ? item.theoryTotal
      : stage === 'practice'
        ? item.qualifyingTotal
        : item.total;
    const rows = base
      .filter((item) => stage !== 'final' || teamMap.get(item.teamId)?.isFinalist)
      .sort((a, b) => {
        const scoreDifference = score(b) - score(a);
        if (scoreDifference !== 0) return scoreDifference;
        const aTeam = teamMap.get(a.teamId)!;
        const bTeam = teamMap.get(b.teamId)!;
        return tieRank(aTeam, stage) - tieRank(bTeam, stage)
          || aTeam.displayOrder - bTeam.displayOrder
          || aTeam.fullName.localeCompare(bTeam.fullName, 'ru');
      });
    const leader = rows.length ? score(rows[0]) : 0;
    return rows.map((item, index) => ({ ...item, place: index + 1, leaderGap: score(item) - leader }));
  };

  return {
    theory: sortStage('theory'),
    practice: sortStage('practice'),
    final: sortStage('final'),
  };
}

export function normalizeScoreboard(document: ScoreboardDocument): ScoreboardResponse {
  return {
    ...document,
    stageResults: calculateStageResults(document),
    updatedAt: new Date().toISOString(),
  };
}

export function validateScoreboard(document: ScoreboardDocument): string[] {
  const errors: string[] = [];
  const finalistCount = document.teams.filter((team) => team.isFinalist).length;
  if (document.settings.finalistsCount < 1 || document.settings.finalistsCount > 15) {
    errors.push('Количество финалистов должно быть от 1 до 15.');
  }
  if (finalistCount > document.settings.finalistsCount) {
    errors.push(`Выбрано финалистов: ${finalistCount}; разрешено: ${document.settings.finalistsCount}.`);
  }
  for (const item of document.theoryScores) {
    if (item.score < 0 || item.score > 60) errors.push(`Теория: оценка ${item.participantId} должна быть от 0 до 60.`);
  }
  for (const item of document.practiceScores) {
    if (item.score < 0 || item.score > 100) errors.push(`Практика: оценка ${item.participantId} должна быть от 0 до 100.`);
  }
  for (const item of document.participantFinalScores) {
    if (item.leg1 < 0 || item.leg1 > 100 || item.leg2 < 0 || item.leg2 > 100) {
      errors.push(`Финал: каждая нога участника ${item.participantId} должна быть от 0 до 100.`);
    }
  }
  for (const item of document.teamFinalScores) {
    if (item.leg1 < 0 || item.leg1 > 200 || item.leg2 < 0 || item.leg2 > 200) {
      errors.push(`Финал: каждая нога команды ${item.teamId} должна быть от 0 до 200.`);
    }
  }
  return errors;
}
