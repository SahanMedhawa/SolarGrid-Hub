// ============================================================
// File: ForgotPasswordPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Premium dark-themed forgot password page.
//              Matches LoginPage and ResetPasswordPage.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyForgotPassword } from '../services/api';
import { toast } from 'react-toastify';
import {
  Zap,
  LockKeyhole,
  User,
  Sun,
  Building2,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Sparkles
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [usernameOrNic, setUsernameOrNic] = useState('');
  const [loginType, setLoginType] = useState('User');
  const [loading, setLoading] = useState(false);

  // ------------------------------------------------------------
  // Verify account
  // ------------------------------------------------------------
  async function handleVerify(e) {
    e.preventDefault();

    if (!usernameOrNic.trim()) {
      toast.error('Please enter your username or NIC.');
      return;
    }

    setLoading(true);

    try {
      const data = await verifyForgotPassword(
        usernameOrNic.trim(),
        loginType
      );

      toast.success(`Account verified: ${data.displayName}`);

      navigate('/reset-password', {
        state: {
          usernameOrNic: usernameOrNic.trim(),
          loginType
        }
      });
    } catch (err) {
      toast.error(
        err.message || 'Account not found.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Change account type
  // ------------------------------------------------------------
  const handleLoginTypeChange = (type) => {
    setLoginType(type);
    setUsernameOrNic('');
  };

  const isProsumer = loginType === 'Prosumer';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-10 antialiased relative overflow-hidden">

      {/* ========================================================
          Background Decorative Glow
      ======================================================== */}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">

        {/* Top-left emerald glow */}
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

        {/* Bottom-right glow */}
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

        {/* Center ambient glow */}
        <div
          className="
            absolute
            top-1/3
            left-1/2
            -translate-x-1/2
            w-48
            h-48
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

        {/* Brand Icon */}
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
          Forgot Password?
        </h1>

        <p className="text-xs text-slate-400 mt-1.5">
          Let's help you securely recover your account
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

        {/* Top accent line */}
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
            <LockKeyhole className="w-5 h-5 text-emerald-400" />

            {/* Status dot */}
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
                Recover your account
              </h2>

              <Sparkles className="w-3.5 h-3.5 text-amber-400" />

            </div>

            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Verify your account details to continue
              securely.
            </p>

          </div>

        </div>

        {/* ======================================================
            Security Information
        ====================================================== */}

        <div
          className="
            flex
            items-start
            gap-2.5
            p-3
            rounded-xl
            bg-slate-950
            border
            border-slate-800
            mb-5
          "
        >

          <ShieldCheck
            className="
              w-4
              h-4
              text-emerald-400
              flex-shrink-0
              mt-0.5
            "
          />

          <div>

            <p className="text-[11px] font-medium text-slate-300">
              Secure password recovery
            </p>

            <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
              We'll verify your account before allowing
              you to create a new password.
            </p>

          </div>

        </div>

        {/* ======================================================
            Account Type
        ====================================================== */}

        <div className="mb-5">

          <label
            className="
              block
              text-xs
              font-medium
              text-slate-300
              mb-1.5
            "
          >
            Account Type
          </label>

          {/* Account Type Selector */}

          <div
            className="
              grid
              grid-cols-2
              gap-1
              p-1
              bg-slate-950
              rounded-xl
              border
              border-slate-800
            "
          >

            {/* Backoffice / Grid Operator */}

            <button
              type="button"
              onClick={() =>
                handleLoginTypeChange('User')
              }
              className={`
                relative
                py-2.5
                px-2
                rounded-lg
                transition-all
                duration-200
                flex
                flex-col
                items-center
                justify-center
                gap-1.5
                ${
                  loginType === 'User'
                    ? `
                      bg-slate-800
                      text-white
                      shadow-sm
                      border
                      border-slate-700
                    `
                    : `
                      text-slate-500
                      hover:text-slate-300
                      hover:bg-slate-900
                    `
                }
              `}
            >

              <Building2
                className={`
                  w-4
                  h-4
                  ${
                    loginType === 'User'
                      ? 'text-slate-200'
                      : 'text-slate-500'
                  }
                `}
              />

              <span className="text-[10px] font-semibold">
                Staff / Operator
              </span>

              {loginType === 'User' && (
                <span
                  className="
                    absolute
                    top-1.5
                    right-1.5
                    w-1.5
                    h-1.5
                    rounded-full
                    bg-slate-300
                  "
                />
              )}

            </button>

            {/* Solar Prosumer */}

            <button
              type="button"
              onClick={() =>
                handleLoginTypeChange('Prosumer')
              }
              className={`
                relative
                py-2.5
                px-2
                rounded-lg
                transition-all
                duration-200
                flex
                flex-col
                items-center
                justify-center
                gap-1.5
                ${
                  loginType === 'Prosumer'
                    ? `
                      bg-emerald-500
                      text-slate-950
                      shadow-sm
                    `
                    : `
                      text-slate-500
                      hover:text-slate-300
                      hover:bg-slate-900
                    `
                }
              `}
            >

              <Sun
                className="
                  w-4
                  h-4
                "
              />

              <span className="text-[10px] font-semibold">
                Solar Prosumer
              </span>

              {loginType === 'Prosumer' && (
                <span
                  className="
                    absolute
                    top-1.5
                    right-1.5
                    w-1.5
                    h-1.5
                    rounded-full
                    bg-slate-950
                  "
                />
              )}

            </button>

          </div>

        </div>

        {/* ======================================================
            Verification Form
        ====================================================== */}

        <form
          onSubmit={handleVerify}
          className="space-y-4"
        >

          {/* ====================================================
              Username / NIC
          ==================================================== */}

          <div>

            <label
              htmlFor="usernameOrNic"
              className="
                block
                text-xs
                font-medium
                text-slate-300
                mb-1.5
              "
            >
              {isProsumer
                ? 'National Identity Card (NIC)'
                : 'Username'}
            </label>

            <div className="relative">

              {/* Input Icon */}

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
                {isProsumer ? (
                  <CreditCard className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <input
                id="usernameOrNic"
                type="text"
                className="
                  w-full
                  pl-9
                  pr-3
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
                placeholder={
                  isProsumer
                    ? 'e.g. 200012345678'
                    : 'e.g. admin1'
                }
                value={usernameOrNic}
                onChange={(e) =>
                  setUsernameOrNic(e.target.value)
                }
                autoComplete="username"
                required
              />

            </div>

            {/* Contextual helper text */}

            <div className="flex items-center gap-1.5 mt-2">

              {isProsumer ? (
                <>
                  <Sun className="w-3 h-3 text-emerald-500" />

                  <span className="text-[10px] text-slate-500">
                    Enter the NIC associated with your
                    prosumer account.
                  </span>
                </>
              ) : (
                <>
                  <Building2 className="w-3 h-3 text-slate-500" />

                  <span className="text-[10px] text-slate-500">
                    Enter your registered staff username.
                  </span>
                </>
              )}

            </div>

          </div>

          {/* ====================================================
              Continue Button
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
                  Verifying...
                </span>
              </>
            ) : (
              <>
                <span>
                  Verify Account
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
            Process Indicator
        ====================================================== */}

        <div
          className="
            mt-5
            pt-4
            border-t
            border-slate-800
          "
        >

          <div className="flex items-center justify-center">

            {/* Step 1 */}
            <div className="flex items-center gap-1.5">

              <div
                className="
                  w-5
                  h-5
                  rounded-full
                  bg-emerald-500
                  text-slate-950
                  flex
                  items-center
                  justify-center
                  text-[9px]
                  font-bold
                "
              >
                1
              </div>

              <span className="text-[10px] text-slate-300">
                Verify
              </span>

            </div>

            {/* Connector */}
            <div
              className="
                w-8
                h-px
                bg-slate-700
                mx-2
              "
            />

            {/* Step 2 */}
            <div className="flex items-center gap-1.5">

              <div
                className="
                  w-5
                  h-5
                  rounded-full
                  bg-slate-800
                  border
                  border-slate-700
                  text-slate-500
                  flex
                  items-center
                  justify-center
                  text-[9px]
                  font-bold
                "
              >
                2
              </div>

              <span className="text-[10px] text-slate-500">
                Reset
              </span>

            </div>

            {/* Connector */}
            <div
              className="
                w-8
                h-px
                bg-slate-700
                mx-2
              "
            />

            {/* Step 3 */}
            <div className="flex items-center gap-1.5">

              <div
                className="
                  w-5
                  h-5
                  rounded-full
                  bg-slate-800
                  border
                  border-slate-700
                  text-slate-500
                  flex
                  items-center
                  justify-center
                  text-[9px]
                  font-bold
                "
              >
                3
              </div>

              <span className="text-[10px] text-slate-500">
                Login
              </span>

            </div>

          </div>

        </div>

        {/* ======================================================
            Back To Login
        ====================================================== */}

        <div
          className="
            mt-4
            text-center
          "
        >

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="
              text-xs
              text-slate-500
              hover:text-emerald-400
              transition-colors
              cursor-pointer
            "
          >
            ← Back to Login
          </button>

        </div>

      </div>

      {/* ========================================================
          Bottom Brand
      ======================================================== */}

      <div
        className="
          relative
          z-10
          mt-5
          flex
          items-center
          gap-1.5
        "
      >

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