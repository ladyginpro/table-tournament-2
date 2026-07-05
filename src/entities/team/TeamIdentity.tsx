import type { ScoreboardSettings, Team } from '../../shared/model/scoreboard';

export function CountryFlag({ country }: Pick<Team, 'country'>) {
  return <span className={`flag flag-${country}`} aria-label={country === 'by' ? 'Беларусь' : 'Россия'} />;
}

export function TeamIdentity({ team, settings, compact = false }: { team: Team; settings: ScoreboardSettings; compact?: boolean }) {
  return <div className={`team-identity ${compact ? 'compact' : ''}`}>
    <CountryFlag country={team.country} />
    {team.logoFile ? <img src={`/assets/logos/teams/${team.logoFile}`} alt="" /> : <b className="team-monogram">{team.shortName.slice(0, 2).toUpperCase()}</b>}
    <span>{settings.teamNameMode === 'short' ? team.shortName : team.fullName}</span>
  </div>;
}

export function PlaceBadge({ place }: { place: number }) {
  return <span className={`place-badge place-${place}`}>{place}</span>;
}
