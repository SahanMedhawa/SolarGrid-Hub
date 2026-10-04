import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyForgotPassword } from '../services/api';
import { toast } from 'react-toastify';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [usernameOrNic, setUsernameOrNic] = useState('');
  const [loginType, setLoginType] = useState('User');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    if (!usernameOrNic.trim()) {
      toast.error('Please enter your username or NIC.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyForgotPassword(usernameOrNic.trim(), loginType);
      toast.success(`Account verified: ${data.displayName}`);
      navigate('/reset-password', { state: { usernameOrNic: usernameOrNic.trim(), loginType } });
    } catch (err) {
      toast.error(err.message || 'Account not found.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card" style={{ maxWidth: 420, margin: '60px auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>🔑 Forgot Password</h2>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Enter your account details to reset your password.
        </p>

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select
              className="form-input"
              value={loginType}
              onChange={e => setLoginType(e.target.value)}
            >
              <option value="User">Backoffice / Grid Operator</option>
              <option value="Prosumer">Solar Prosumer</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {loginType === 'Prosumer' ? 'NIC' : 'Username'}
            </label>
            <input
              className="form-input"
              value={usernameOrNic}
              onChange={e => setUsernameOrNic(e.target.value)}
              placeholder={loginType === 'Prosumer' ? 'e.g. 200012345678' : 'e.g. admin1'}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Verifying...' : 'Continue'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
            <a href="/login">Back to Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}