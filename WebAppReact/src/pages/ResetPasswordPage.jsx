// ============================================================
// File: ResetPasswordPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Premium dark-themed password reset page.
//              Matches the LoginPage visual language while
//              keeping existing reset functionality unchanged.
// ============================================================

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resetForgotPassword } from '../services/api';
import { validatePassword } from '../utils/passwordValidation';
import { toast } from 'react-toastify';
import {
  Zap,
  LockKeyhole,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  Circle,
  KeyRound,
  Sparkles,
  UserRound
} from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { usernameOrNic, loginType } = location.state || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ------------------------------------------------------------
  // Redirect if user did not arrive through forgot-password flow
  // ------------------------------------------------------------
  if (!usernameOrNic) {
    navigate('/forgot-password');
    return null;
  }

  // ------------------------------------------------------------
  // Password requirement checks
  // ------------------------------------------------------------
  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword)
  };

  const requirementCount =
    Object.values(passwordRequirements).filter(Boolean).length;

  const passwordStrength =
    requirementCount === 0
      ? 0
      : requirementCount <= 2
        ? 1
        : requirementCount === 3
          ? 2
          : requirementCount === 4
            ? 3
            : 4;

  const strengthLabel =
    passwordStrength === 0
      ? 'Enter a password'
      : passwordStrength === 1
        ? 'Weak'
        : passwordStrength === 2
          ? 'Fair'
          : passwordStrength === 3
            ? 'Good'
            : 'Strong';

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  // ------------------------------------------------------------
  // Reset password
  // ------------------------------------------------------------
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
      await resetForgotPassword(
        usernameOrNic,
        loginType,
        newPassword
      );

      toast.success(
        'Password reset successfully! Please log in.'
      );

      navigate('/login');
    } catch (err) {
      toast.error(
        err.message || 'Failed to reset password.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Requirement component
  // ------------------------------------------------------------
  const Requirement = ({ valid, children }) => (
    <div
      className={`flex items-center gap-2 transition-colors duration-200 ${
        valid ? 'text-emerald-400' : 'text-slate-500'
      }`}
    >
      <div
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200 ${
          valid
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-slate-800 text-slate-600'
        }`}
      >
        {valid ? (
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        ) : (
          <Circle className="w-2 h-2" fill="currentColor" />
        )}
      </div>

      <span className="text-[10px]">{children}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-10 antialiased relative overflow-hidden">

      {/* ========================================================
          Background Decorative Glow
      ======================================================== */}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">

        {/* Large emerald glow */}
        <div
          className="
            absolute
            -top-40
            -left-40
            w-96
            h-96
            rounded-full
            bg-emerald-500/[0.07]
            blur-3xl
          "
        />

        {/* Bottom glow */}
        <div
          className="
            absolute
            -bottom-48
            -right-40
            w-[30rem]
            h-[30rem]
            rounded-full
            bg-emerald-400/[0.04]
            blur-3xl
          "
        />

        {/* Small ambient glow */}
        <div
          className="
            absolute
            top-1/3
            right-1/4
            w-40
            h-40
            rounded-full
            bg-emerald-500/[0.025]
            blur-3xl
          "
        />
      </div>

      {/* ========================================================
          Brand Header
      ======================================================== */}

      <div className="relative z-10 text-center mb-6">

        {/* Logo */}
        <div
          className="
            inline-flex
            items-center
            justify-center
            w-12
            h-12
            rounded-2xl
            bg-emerald-500
            text-slate-950
            shadow-lg
            shadow-emerald-500/20
            mb-3
          "
        >
          <Zap
            className="w-6 h-6 fill-current"
            strokeWidth={2.2}
          />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          Create New Password
        </h1>

        <p className="text-xs text-slate-400 mt-1.5">
          Secure your Smart Solar Microgrid account
        </p>
      </div>

      {/* ========================================================
          Main Card
      ======================================================== */}

      <div
        className="
          relative
          z-10
          w-full
          max-w-md
          bg-slate-900/95
          border
          border-slate-800
          rounded-2xl
          p-6
          shadow-2xl
          shadow-black/30
          backdrop-blur-sm
        "
      >

        {/* Top accent */}
        <div
          className="
            absolute
            top-0
            left-8
            right-8
            h-px
            bg-gradient-to-r
            from-transparent
            via-emerald-500/50
            to-transparent
          "
        />

        {/* ======================================================
            Header
        ====================================================== */}

        <div className="flex items-start gap-3 mb-5">

          <div
            className="
              relative
              flex-shrink-0
              w-10
              h-10
              rounded-xl
              bg-emerald-500/10
              border
              border-emerald-500/20
              flex
              items-center
              justify-center
            "
          >
            <KeyRound className="w-5 h-5 text-emerald-400" />

            {/* Tiny status dot */}
            <span
              className="
                absolute
                -top-1
                -right-1
                w-3
                h-3
                rounded-full
                bg-emerald-400
                border-2
                border-slate-900
              "
            />
          </div>

          <div className="flex-1">

            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-white">
                Choose a new password
              </h2>

              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Create a strong password for your account.
            </p>

          </div>
        </div>

        {/* ======================================================
            Account Information
        ====================================================== */}

        <div
          className="
            flex
            items-center
            gap-3
            p-3
            rounded-xl
            bg-slate-950
            border
            border-slate-800
            mb-5
          "
        >

          <div
            className="
              w-8
              h-8
              rounded-lg
              bg-slate-900
              border
              border-slate-800
              flex
              items-center
              justify-center
              flex-shrink-0
            "
          >
            <UserRound className="w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Account
            </p>

            <p className="text-xs text-slate-200 font-medium truncate mt-0.5">
              {usernameOrNic}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified</span>
          </div>

        </div>

        {/* ======================================================
            Form
        ====================================================== */}

        <form onSubmit={handleReset} className="space-y-4">

          {/* ----------------------------------------------------
              New Password
          ---------------------------------------------------- */}

          <div>

            <label
              htmlFor="newPassword"
              className="
                block
                text-xs
                font-medium
                text-slate-300
                mb-1.5
              "
            >
              New Password
            </label>

            <div className="relative">

              {/* Left Icon */}
              <div
                className="
                  absolute
                  inset-y-0
                  left-0
                  pl-3
                  flex
                  items-center
                  pointer-events-none
                  text-slate-500
                "
              >
                <LockKeyhole className="w-4 h-4" />
              </div>

              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                className="
                  w-full
                  pl-9
                  pr-11
                  py-2.5
                  bg-slate-950
                  border
                  border-slate-800
                  rounded-lg
                  text-sm
                  text-white
                  placeholder-slate-600
                  focus:outline-none
                  focus:border-emerald-500
                  focus:ring-2
                  focus:ring-emerald-500/10
                  hover:border-slate-700
                  transition-all
                "
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />

              {/* Show / Hide */}
              <button
                type="button"
                onClick={() =>
                  setShowNewPassword(!showNewPassword)
                }
                className="
                  absolute
                  inset-y-0
                  right-0
                  pr-3
                  flex
                  items-center
                  text-slate-500
                  hover:text-slate-300
                  transition-colors
                "
                aria-label={
                  showNewPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>

            </div>

            {/* Password Strength */}
            {newPassword.length > 0 && (
              <div className="mt-2.5">

                <div className="flex items-center justify-between mb-1.5">

                  <span className="text-[10px] text-slate-500">
                    Password strength
                  </span>

                  <span
                    className={`text-[10px] font-semibold ${
                      passwordStrength >= 4
                        ? 'text-emerald-400'
                        : passwordStrength === 3
                          ? 'text-lime-400'
                          : passwordStrength === 2
                            ? 'text-amber-400'
                            : 'text-red-400'
                    }`}
                  >
                    {strengthLabel}
                  </span>

                </div>

                {/* Strength bars */}
                <div className="flex gap-1">

                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`
                        h-1
                        flex-1
                        rounded-full
                        transition-all
                        duration-300
                        ${
                          passwordStrength >= level
                            ? passwordStrength >= 4
                              ? 'bg-emerald-500'
                              : passwordStrength === 3
                                ? 'bg-lime-500'
                                : passwordStrength === 2
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            : 'bg-slate-800'
                        }
                      `}
                    />
                  ))}

                </div>
              </div>
            )}

            {/* Password Requirements */}
            <div
              className="
                mt-3
                p-3
                rounded-xl
                bg-slate-950/80
                border
                border-slate-800
              "
            >

              <div className="flex items-center gap-1.5 mb-2.5">

                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />

                <span className="text-[10px] font-semibold text-slate-300">
                  Password requirements
                </span>

              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-3">

                <Requirement
                  valid={passwordRequirements.length}
                >
                  8+ characters
                </Requirement>

                <Requirement
                  valid={passwordRequirements.uppercase}
                >
                  Uppercase letter
                </Requirement>

                <Requirement
                  valid={passwordRequirements.lowercase}
                >
                  Lowercase letter
                </Requirement>

                <Requirement
                  valid={passwordRequirements.number}
                >
                  At least one number
                </Requirement>

                <Requirement
                  valid={passwordRequirements.special}
                >
                  Special character
                </Requirement>

              </div>
            </div>
          </div>

          {/* ----------------------------------------------------
              Confirm Password
          ---------------------------------------------------- */}

          <div>

            <label
              htmlFor="confirmPassword"
              className="
                block
                text-xs
                font-medium
                text-slate-300
                mb-1.5
              "
            >
              Confirm New Password
            </label>

            <div className="relative">

              <div
                className="
                  absolute
                  inset-y-0
                  left-0
                  pl-3
                  flex
                  items-center
                  pointer-events-none
                  text-slate-500
                "
              >
                <LockKeyhole className="w-4 h-4" />
              </div>

              <input
                id="confirmPassword"
                type={
                  showConfirmPassword
                    ? 'text'
                    : 'password'
                }
                className={`
                  w-full
                  pl-9
                  pr-11
                  py-2.5
                  bg-slate-950
                  border
                  rounded-lg
                  text-sm
                  text-white
                  placeholder-slate-600
                  focus:outline-none
                  focus:ring-2
                  transition-all
                  ${
                    passwordsMatch
                      ? 'border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/10'
                      : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500/10 hover:border-slate-700'
                  }
                `}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                className="
                  absolute
                  inset-y-0
                  right-0
                  pr-3
                  flex
                  items-center
                  text-slate-500
                  hover:text-slate-300
                  transition-colors
                "
                aria-label={
                  showConfirmPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>

            </div>

            {/* Match indicator */}
            {confirmPassword.length > 0 && (
              <div
                className={`flex items-center gap-1.5 mt-2 text-[10px] ${
                  passwordsMatch
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {passwordsMatch ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Circle className="w-2.5 h-2.5" />
                )}

                <span>
                  {passwordsMatch
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </span>
              </div>
            )}

          </div>

          {/* ====================================================
              Submit Button
          ==================================================== */}

          <button
            type="submit"
            disabled={loading}
            className="
              group
              w-full
              py-2.5
              px-4
              rounded-lg
              bg-emerald-500
              hover:bg-emerald-400
              active:bg-emerald-600
              text-slate-950
              font-bold
              text-sm
              transition-all
              duration-200
              flex
              items-center
              justify-center
              gap-2
              mt-5
              cursor-pointer
              disabled:opacity-50
              disabled:cursor-not-allowed
              hover:shadow-lg
              hover:shadow-emerald-500/10
            "
          >

            {loading ? (
              <>
                <span
                  className="
                    w-4
                    h-4
                    border-2
                    border-slate-950/30
                    border-t-slate-950
                    rounded-full
                    animate-spin
                  "
                />

                <span>
                  Resetting...
                </span>
              </>
            ) : (
              <>
                <span>
                  Reset Password
                </span>

                <ArrowRight
                  className="
                    w-4
                    h-4
                    transition-transform
                    duration-200
                    group-hover:translate-x-0.5
                  "
                />
              </>
            )}

          </button>

        </form>

        {/* ======================================================
            Security Footer
        ====================================================== */}

        <div
          className="
            mt-5
            pt-4
            border-t
            border-slate-800
            flex
            items-center
            justify-center
            gap-1.5
          "
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />

          <span className="text-[10px] text-slate-500">
            Your password is securely updated
          </span>
        </div>

      </div>

      {/* ========================================================
          Back To Login
      ======================================================== */}

      <button
        type="button"
        onClick={() => navigate('/login')}
        className="
          relative
          z-10
          mt-5
          text-xs
          text-slate-500
          hover:text-emerald-400
          transition-colors
          cursor-pointer
        "
      >
        ← Back to Login
      </button>

      {/* Bottom Brand */}
      <div className="relative z-10 mt-5 flex items-center gap-1.5">

        <div
          className="
            w-5
            h-5
            rounded-md
            bg-emerald-500/10
            flex
            items-center
            justify-center
          "
        >
          <Zap className="w-2.5 h-2.5 text-emerald-400" />
        </div>

        <span className="text-[10px] text-slate-600">
          Smart Solar Microgrid Trading System
        </span>

      </div>

    </div>
  );
}

