import { useAuth } from '../context/AuthContext';
import EmployeeDashboard from './employee/EmployeeDashboard';
import DirectorDashboard from './director/DirectorDashboard';
import AccountsDashboard from './accounts/AccountsDashboard';

export default function DashboardRouter() {
  const { user } = useAuth();
  if (user.role === 'EMPLOYEE') return <EmployeeDashboard />;
  if (user.role === 'DIRECTOR') return <DirectorDashboard />;
  return <AccountsDashboard />;
}
