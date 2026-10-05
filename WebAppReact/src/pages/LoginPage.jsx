// ============================================================
// File: LoginPage.jsx
// Project: Smart Solar Microgrid Trading System - React Web App
// Description: Premium dark-themed login page.
//              Role-based authentication, 1-click test fill,
//              password visibility, and automatic redirection.
// ============================================================

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { getRolePortalPath } from '../utils/authUtils';
import { toast } from 'react-toastify';
import {
  Zap,
  Sun,
  Building2,
  Lock,
  User,
  CreditCard,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const [loginType, setLoginType] = useState('User');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // ------------------------------------------------------------
  // Quick fill helper for presentation and testing
  // ------------------------------------------------------------
  const handleQuickFill = (
    type,
    usernameValue,
    passwordValue
  ) => {
    setLoginType(type);
    setUsername(usernameValue);
    setPassword(passwordValue);
  };

  // ------------------------------------------------------------
  // Login
  // ------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      toast.warning('Please enter your credentials.');
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(
        username.trim(),
        password,
        loginType
      );

      if (data && data.token) {
        login(data.token, {
          userId: data.userId,
          displayName: data.displayName,
          role: data.role,
          nic: data.role === 'Prosumer'
            ? data.userId
            : null
        });

        const targetPortal = getRolePortalPath(data.role);

        toast.success(
          `Welcome, ${data.displayName}!`
        );

        navigate(targetPortal);
      } else {
        toast.error('Invalid credentials.');
      }
    } catch (error) {
      toast.error(
        error.message ||
        'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // Login type change
  // ------------------------------------------------------------
  const handleLoginTypeChange = (type) => {
    setLoginType(type);
    setUsername('');
    setPassword('');
  };

  const isProsumer = loginType === 'Prosumer';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-10 antialiased relative overflow-hidden">

      {/* ========================================================
          Ambient Background
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

        {/* Bottom-right emerald glow */}
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

        {/* Center glow */}
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

        <Link
          to="/"
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
            transition-transform
            hover:scale-105
          "
        >
          <Zap
            className="w-6 h-6 fill-current"
            strokeWidth={2.2}
          />
        </Link>

        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome Back
        </h1>

        <p className="text-xs text-slate-400 mt-1.5">
          Smart Solar Microgrid Trading Platform
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
            Card Heading
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
            <ShieldCheck className="w-5 h-5 text-emerald-400" />

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
                Sign in to your account
              </h2>

              <Sparkles className="w-3.5 h-3.5 text-amber-400" />

            </div>

            <p className="text-xs text-slate-400 mt-1">
              Choose your account type to continue.
            </p>

          </div>

        </div>

        {/* ======================================================
            Role Type Selector
        ====================================================== */}

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
            mb-5
          "
        >

          {/* ----------------------------------------------------
              Staff Portal
          ---------------------------------------------------- */}

          <button
            type="button"
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
            onClick={() =>
              handleLoginTypeChange('User')
            }
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
              Staff Portal
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

          {/* ----------------------------------------------------
              Solar Prosumer
          ---------------------------------------------------- */}

          <button
            type="button"
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
            onClick={() =>
              handleLoginTypeChange('Prosumer')
            }
          >

            <Sun className="w-4 h-4" />

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

        {/* ======================================================
            Login Form
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >

          {/* ====================================================
              Username / NIC
          ==================================================== */}

          <div>

            <label
              htmlFor="loginUsername"
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
                id="loginUsername"
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
                    ? 'e.g. 199012345678'
                    : 'e.g. admin or operator1'
                }
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                autoComplete="username"
                required
              />

            </div>

          </div>

          {/* ====================================================
              Password
          ==================================================== */}

          <div>

            <label
              htmlFor="loginPassword"
              className="
                block
                text-xs
                font-medium
                text-slate-300
                mb-1.5
              "
            >
              Password
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
                <Lock className="w-4 h-4" />
              </div>

              <input
                id="loginPassword"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
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
                placeholder="••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
              />

              {/* Show / Hide Password */}

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
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
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>

            </div>

            {/* Forgot Password */}

            <div className="flex justify-end mt-1.5">

              <Link
                to="/forgot-password"
                className="
                  text-xs
                  text-emerald-400
                  hover:text-emerald-300
                  hover:underline
                  transition-colors
                "
              >
                Forgot password?
              </Link>

            </div>

          </div>

          {/* ====================================================
              Submit
          ==================================================== */}

          <button
            id="loginSubmit"
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
                  Signing in...
                </span>
              </>
            ) : (
              <>
                <span>
                  Sign In
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
            Test Accounts
        ====================================================== */}

        <div
          className="
            mt-5
            pt-4
            border-t
            border-slate-800
          "
        >

          <div
            className="
              flex
              items-center
              justify-center
              gap-1.5
              text-[10px]
              text-slate-500
              mb-2.5
            "
          >

            <Sparkles className="w-3 h-3 text-amber-400" />

            <span className="font-medium">
              Quick test accounts
            </span>

          </div>

          <div className="grid grid-cols-3 gap-1.5">

            {/* Admin */}

            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'User',
                  'admin',
                  'Admin@123'
                )
              }
              className="
                group
                px-2
                py-2
                rounded-lg
                bg-slate-950
                hover:bg-slate-800
                border
                border-slate-800
                hover:border-slate-700
                text-slate-400
                hover:text-slate-200
                transition-all
                duration-200
                text-[10px]
                font-medium
              "
            >
              <span className="block">
                Admin
              </span>

              <span
                className="
                  block
                  text-[8px]
                  text-slate-600
                  group-hover:text-slate-500
                  mt-0.5
                "
              >
                Staff
              </span>
            </button>

            {/* Operator */}

            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'User',
                  'GridOperator',
                  'GridOperator@12345'
                )
              }
              className="
                group
                px-2
                py-2
                rounded-lg
                bg-slate-950
                hover:bg-slate-800
                border
                border-slate-800
                hover:border-slate-700
                text-slate-400
                hover:text-slate-200
                transition-all
                duration-200
                text-[10px]
                font-medium
              "
            >
              <span className="block">
                Operator
              </span>

              <span
                className="
                  block
                  text-[8px]
                  text-slate-600
                  group-hover:text-slate-500
                  mt-0.5
                "
              >
                Staff
              </span>
            </button>

            {/* Prosumer */}

            <button
              type="button"
              onClick={() =>
                handleQuickFill(
                  'Prosumer',
                  '198812345679',
                  'Namal@123#'
                )
              }
              className="
                group
                px-2
                py-2
                rounded-lg
                bg-slate-950
                hover:bg-emerald-500/10
                border
                border-slate-800
                hover:border-emerald-500/30
                text-slate-400
                hover:text-emerald-300
                transition-all
                duration-200
                text-[10px]
                font-medium
              "
            >
              <span className="block">
                Prosumer
              </span>

              <span
                className="
                  block
                  text-[8px]
                  text-slate-600
                  group-hover:text-emerald-500/70
                  mt-0.5
                "
              >
                Solar
              </span>
            </button>

          </div>

        </div>

        {/* ======================================================
            Registration
        ====================================================== */}

        <div
          className="
            mt-4
            text-center
            text-xs
            text-slate-400
          "
        >

          New prosumer?{' '}

          <Link
            to="/register"
            className="
              text-emerald-400
              hover:text-emerald-300
              hover:underline
              transition-colors
              font-medium
            "
          >
            Register here
          </Link>

        </div>

        {/* ======================================================
            Security Indicator
        ====================================================== */}

        <div
          className="
            mt-4
            flex
            items-center
            justify-center
            gap-1.5
            text-[10px]
            text-slate-600
          "
        >

          <CheckCircle2
            className="
              w-3.5
              h-3.5
              text-emerald-500
            "
          />

          <span>
            Secure authentication enabled
          </span>

        </div>

      </div>

      {/* ========================================================
          Back To Homepage
      ======================================================== */}

      <div className="relative z-10 mt-5 text-center">

        <Link
          to="/"
          className="
            text-xs
            text-slate-500
            hover:text-emerald-400
            transition-colors
          "
        >
          ← Back to Homepage
        </Link>

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