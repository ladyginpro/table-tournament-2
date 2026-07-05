export function CompetitionHeader({ title, accent = 'blue' }: { title: string; accent?: 'blue' | 'red' }) {
  return <header className={`competition-header ${accent}`}>
    <img src="/assets/logos/event/spartakiad.jpg" alt="Спартакиада" />
    <div>
      <p>Международная студенческая спартакиада<br />по обрезке копытец крупного рогатого скота</p>
      <h1>{title}</h1>
    </div>
    <img src="/assets/logos/event/agro.png" alt="Организатор" />
  </header>;
}
