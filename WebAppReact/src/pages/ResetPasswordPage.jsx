import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetForgotPassword } from '../services/api';
import { validatePassword } from '../utils/passwordValidation';
import { toast } from 'react-toastify';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usernameOrNic, loginType } = location.state || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!usernameOrNic) {
    navigate('/forgot-password');
    return null;
  }

  async function handleReset(e) {
    e.preventDefault();

    const validationError = validatePassword(newPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetForgotPassword(usernameOrNic, loginType, newPassword);
      toast.success('Password reset successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="card" style={{ maxWidth: 420, margin: '60px auto', padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>🔒 Set New Password</h2>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Resetting password for <strong>{usernameOrNic}</strong>
        </p>

        <form onSubmit={handleReset}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              At least 8 characters, with uppercase, lowercase, a number, and a special character.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}