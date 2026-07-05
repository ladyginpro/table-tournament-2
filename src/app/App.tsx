import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { TheoryPage } from '../pages/theory/TheoryPage';
import { PracticePage } from '../pages/practice/PracticePage';
import { FinalPage } from '../pages/final/FinalPage';
import { AdminPage } from '../pages/admin/AdminPage';

const links = [
  ['/theory', 'Теория'], ['/practice', 'Практика'], ['/final', 'Финал'],
  ['/admin', 'Админка'],
] as const;

export default function App() {
  const { pathname } = useLocation();
  const isServicePage = pathname === '/admin';
  return (
    <>
      {isServicePage && <nav className="service-nav">
        <strong>Табло соревнования</strong>
        <div className="service-nav-right">
          <div className="service-nav-links">{links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</div>
          <div id="admin-nav-actions" />
        </div>
      </nav>}
      <Routes>
        <Route path="/theory" element={<TheoryPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/final" element={<FinalPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/theory" replace />} />
      </Routes>
    </>
  );
}
