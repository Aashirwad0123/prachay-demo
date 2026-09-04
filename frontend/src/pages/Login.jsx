import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.errors?.email || data?.errors?.password || data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Expense Voucher System</h1>
        <p className="muted">Sign in to continue</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <label>
          Email
          <input type="email" required className={error ? 'has-error' : ''} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <div className="password-field">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className={error ? 'has-error' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="ghost password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <div className="demo-accounts">
          <p>Demo accounts (password: Password@123)</p>
          <ul>
            <li>employee@demo.com</li>
            <li>director@demo.com</li>
            <li>accounts@demo.com</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
