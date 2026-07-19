import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { logout as apiLogout } from '../api/auth';
import { getProfile } from '../api/profile';

const NAV_ITEMS = [
  { to: '/assistant', label: 'Assistant' },
  { to: '/inbox', label: 'Inbox' },
  { to: '/rules', label: 'Rules' },
  { to: '/memory', label: 'Memory' },
  { to: '/', label: 'Board' },
  { to: '/settings', label: 'Settings' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const profile = data?.profile ?? null;

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // logout is best-effort
    }
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">Personal Assistant</h1>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm text-gray-500 font-mono" title="Your agent's email address">
              {profile.agent_address}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
