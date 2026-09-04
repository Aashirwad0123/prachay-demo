import { Link, Outlet, useNavigate } from 'react-router-dom';
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
        <span className="brand">Expense Vouchers</span>
        <nav>
          {NAV[user.role].map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="user-info">
          <span>{user.name} ({user.role})</span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
