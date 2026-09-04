import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  EMPLOYEE: [
    { to: '/', label: 'Dashboard' },
    { to: '/vouchers/new', label: 'Create Voucher' },
    { to: '/vouchers/mine', label: 'My Vouchers' },
  ],
  DIRECTOR: [
    { to: '/', label: 'Dashboard' },
    { to: '/vouchers/pending', label: 'Pending Approvals' },
    { to: '/vouchers/all', label: 'All Vouchers' },
  ],
  ACCOUNTS: [
    { to: '/', label: 'Dashboard' },
    { to: '/vouchers/all', label: 'All Vouchers' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Expense Vouchers</span>
          <nav>
            {NAV[user.role].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="user-info">
            <span>{user.name} ({user.role})</span>
            <button
              className="ghost"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
