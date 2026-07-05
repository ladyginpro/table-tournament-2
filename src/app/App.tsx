import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { TheoryPage } from '../pages/theory/TheoryPage';
import { PracticePage } from '../pages/practice/PracticePage';
import { FinalPage } from '../pages/final/FinalPage';
import { AdminPage } from '../pages/admin/AdminPage';
import { ProtocolPage } from '../pages/protocol/ProtocolPage';

const links = [
  ['/theory', 'Теория'], ['/practice', 'Практика'], ['/final', 'Финал'],
  ['/admin', 'Админка'], ['/protocol', 'Протокол'],
] as const;

export default function App() {
  const { pathname } = useLocation();
  const isServicePage = pathname === '/admin' || pathname === '/protocol';
  return (
    <>
      {isServicePage && <nav className="service-nav">
        <strong>Табло соревнования</strong>
        <div>{links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</div>
      </nav>}
      <Routes>
        <Route path="/theory" element={<TheoryPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/final" element={<FinalPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/protocol" element={<ProtocolPage />} />
        <Route path="*" element={<Navigate to="/theory" replace />} />
      </Routes>
    </>
  );
}
