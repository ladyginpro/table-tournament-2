import type { ScoreboardDocument, Team } from '../src/shared/model/scoreboard.ts';

const teamData: Array<[string, string, string, 'ru' | 'by', string]> = [
  ['vitebsk', 'УО «Витебская государственная академия ветеринарной медицины»', 'Витебская ГАВМ', 'by', 'vitebsk.png'],
  ['bashgau', 'ФГБОУ ВО «Башкирский государственный аграрный университет»', 'Башкирский ГАУ', 'ru', 'bashgau.png'],
  ['skryabinka', 'ФГБОУ ВО «Московская государственная академия ветеринарной медицины и биотехнологии — МВА имени К. И. Скрябина»', 'Скрябинка', 'ru', 'skryabinka.png'],
  ['dalgau', 'ФГБОУ ВО «Дальневосточный государственный аграрный университет»', 'Дальневосточный ГАУ', 'ru', 'dalgau.png'],
  ['kazgau-1', 'ФГБОУ ВО «Казанский государственный аграрный университет», команда 1', 'КазГАУ 1', 'ru', 'kazgau.png'],
  ['kazgau-2', 'ФГБОУ ВО «Казанский государственный аграрный университет», команда 2', 'КазГАУ 2', 'ru', 'kazgau.png'],
  ['ulgau', 'ФГБОУ ВО «Ульяновский государственный аграрный университет имени П. А. Столыпина»', 'Ульяновский ГАУ', 'ru', 'ulgau.png'],
  ['uyar', 'КГБПОУ «Уярский сельскохозяйственный техникум»', 'Уярский сельхозтехникум', 'ru', 'uyar.png'],
  ['mozhg', 'БПОУ УР «Можгинский агропромышленный колледж»', 'Можгинский колледж', 'ru', 'mozhg.png'],
  ['buinsk', 'ГАПОУ «Буинский ветеринарный техникум»', 'Буинский техникум', 'ru', 'buinsk.png'],
  ['menzel', 'ГАПОУ «Мензелинский сельскохозяйственный техникум»', 'Мензелинский техникум', 'ru', 'menzel.png'],
  ['kurskgau', 'ФГБОУ ВО «Курский государственный аграрный университет»', 'Курский ГАУ', 'ru', 'kurskgau.png'],
  ['penzgau', 'ФГБОУ ВО «Пензенский государственный аграрный университет»', 'Пензенский ГАУ', 'ru', 'penzgau.png'],
  ['spbgau', 'ФГБОУ ВО «Санкт-Петербургский государственный университет ветеринарной медицины»', 'СПбГУВМ', 'ru', 'spbgau.png'],
  ['timiryaz', 'ФГБОУ ВО «РГАУ — МСХА имени К. А. Тимирязева»', 'Тимирязевка', 'ru', 'timiryaz.png'],
];

export function createSeedDocument(): ScoreboardDocument {
  const teams: Team[] = teamData.map(([teamId, fullName, shortName, country, logoFile], index) => ({
    teamId,
    fullName,
    shortName,
    country,
    logoFile,
    isActive: true,
    isFinalist: index < 5,
    displayOrder: index + 1,
    manualRankTheory: null,
    manualRankPractice: null,
    manualRankFinal: null,
  }));
  const participants = teams.flatMap((team) => Array.from({ length: 5 }, (_, index) => ({
    participantId: `${team.teamId}-p${index + 1}`,
    teamId: team.teamId,
    fullName: `Участник ${index + 1}`,
    isTheoryParticipant: true,
    isPracticeParticipant: index < 3,
    isFinalParticipant: index < 2,
    practiceSlot: index < 3 ? index + 1 : null,
    finalSlot: index < 2 ? index + 1 : null,
  })));
  return {
    settings: {
      refreshIntervalMs: 2000,
      finalistsCount: 5,
      teamNameMode: 'full',
      finalInputMode: 'participant',
      transparentBackground: false,
    },
    teams,
    participants,
    theoryScores: participants.map((participant) => ({ participantId: participant.participantId, score: 0 })),
    practiceScores: participants.filter((participant) => participant.isPracticeParticipant).map((participant) => ({
      participantId: participant.participantId,
      score: 0,
      status: 'not_started',
    })),
    participantFinalScores: participants.filter((participant) => participant.isFinalParticipant).map((participant) => ({
      participantId: participant.participantId,
      leg1: 0,
      leg2: 0,
    })),
    teamFinalScores: teams.map((team) => ({ teamId: team.teamId, leg1: 0, leg2: 0 })),
  };
}
