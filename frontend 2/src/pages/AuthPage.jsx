import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import FadeIn from '../components/FadeIn';

import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Primary toggle: 'researcher' | 'participant'
  const [portalMode, setPortalMode] = useState('researcher');

  // Secondary sub-tab for researcher: 'login' | 'register'
  const [authTab, setAuthTab] = useState('login');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState('dr.arun@stanford.edu');
  const [loginPassword, setLoginPassword] = useState('StanfordPrecision#2025');
  const [rememberTerminal, setRememberTerminal] = useState(true);

  // Registration states
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerAffiliation, setRegisterAffiliation] = useState('');
  const [registerRole, setRegisterRole] = useState('pi');

  // Participant ticket state
  const [participantToken, setParticipantToken] = useState('MANOVA-7749-STROOP');

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await api.auth.login(loginEmail, loginPassword);
      if (data.token) {
        login(data.token, data.researcher || { email: loginEmail, name: loginEmail.split('@')[0] });
      }
      navigate('/dashboard');
    } catch (err) {
      alert(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.auth.register(registerName, registerEmail, registerPassword);
      setAuthTab('login');
      setLoginEmail(registerEmail);
      alert('Registration successful! Please sign in with your credentials.');
    } catch (err) {
      alert(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinParticipant = (e) => {
    e.preventDefault();
    navigate('/runner');
  };

  const fillDemoAccount = () => {
    setLoginEmail('dr.arun@stanford.edu');
    setLoginPassword('StanfordPrecision#2025');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Glow ambient background elements (Exact match with Landing Page hero) */}
      <div className="absolute inset-0 pointer-events-none select-none -z-10 overflow-hidden">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] cloud-gradient rounded-full blur-3xl opacity-90"></div>
        <div className="absolute top-[20rem] right-[-10rem] w-[500px] h-[500px] bg-emerald-100/40 rounded-full blur-[120px]"></div>
        <div className="absolute top-[35rem] left-[-8rem] w-[550px] h-[550px] bg-emerald-200/25 rounded-full blur-[140px]"></div>
      </div>

      {/* Navigation Header (Mirrors Landing Page header styling) */}
      <header className="w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900">
                Manova <span className="text-emerald-600">Labs</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold uppercase tracking-wider shadow-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Gateway 3.0 • Online
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors px-3 py-1.5 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10">
        <div className="w-full max-w-xl mx-auto">
          {/* Header Typography (Exact match with Landing Page Hero Title & Badge) */}
          <FadeIn className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-4 shadow-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Telemetry Interface // Gateway
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15] font-heading">
              {portalMode === 'researcher' ? (
                authTab === 'login' ? (
                  <>
                    Access your lab.<br />
                    <span className="text-emerald-600">Zero latency barrier.</span>
                  </>
                ) : (
                  <>
                    Create Lab Account.<br />
                    <span className="text-emerald-600">Precision from day one.</span>
                  </>
                )
              ) : (
                <>
                  Participating in a study?<br />
                  <span className="text-emerald-600">Enter session code.</span>
                </>
              )}
            </h1>

            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              {portalMode === 'researcher'
                ? 'Sign in to orchestrate millisecond-precision cognitive paradigms, calibrate sensor streams, and analyze live trials.'
                : 'Join a laboratory experiment directly in your browser. No account registration or downloads required.'}
            </p>
          </FadeIn>

          {/* Clean Segmented Pill Switcher (Minimal & User Friendly) */}
          <FadeIn delay={100}>
            <div className="grid grid-cols-2 p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl mb-6 shadow-2xs">
              <button
                type="button"
                onClick={() => setPortalMode('researcher')}
                className={`py-2.5 px-4 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  portalMode === 'researcher'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg className={`w-4 h-4 ${portalMode === 'researcher' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Researcher Console</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalMode('participant')}
                className={`py-2.5 px-4 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  portalMode === 'participant'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg className={`w-4 h-4 ${portalMode === 'participant' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Participant Ticket</span>
              </button>
            </div>
          </FadeIn>

          {/* Main Card (Styled to match the Landing Page Hero Live Telemetry Terminal Card) */}
          <FadeIn delay={150} className="w-full bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-8 text-left relative overflow-hidden transition-all">
            {/* Terminal Window Header Bar (Matches Landing Page lines 322-342) */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="ml-2 font-mono text-[11px] text-slate-500 hidden sm:inline-block">
                  auth://gateway.manova.io:443
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  256-BIT ENCLAVE
                </span>
              </div>
            </div>

            {/* Mode 1: Researcher Console */}
            {portalMode === 'researcher' && (
              <div>
                {/* Sub-tabs: Sign In vs Register Lab */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                  <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => setAuthTab('login')}
                      className={`text-sm font-semibold transition-colors pb-1.5 relative ${
                        authTab === 'login' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Sign In
                      {authTab === 'login' && (
                        <span className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthTab('register')}
                      className={`text-sm font-semibold transition-colors pb-1.5 relative ${
                        authTab === 'register' ? 'text-slate-900 font-bold' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Register Lab
                      {authTab === 'register' && (
                        <span className="absolute -bottom-3.5 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
                      )}
                    </button>
                  </div>

                  {authTab === 'login' && (
                    <button
                      type="button"
                      onClick={fillDemoAccount}
                      className="text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                      title="Auto-fill Stanford PI demo account credentials"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Demo Account</span>
                    </button>
                  )}
                </div>

                {/* Form: Login */}
                {authTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold">
                          Institutional Email
                        </label>
                        <span className="text-slate-400 text-[11px] font-mono">e.g. dr.arun@stanford.edu</span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px]">
                          mail
                        </span>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="investigator@institution.edu"
                          className="w-full bg-slate-50/80 text-slate-900 text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold">
                          Security Keycode / Password
                        </label>
                        <button
                          type="button"
                          onClick={() => alert('Please contact your institutional IT administrator or lab PI to reset your keycode.')}
                          className="font-mono text-xs text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                        >
                          Forgot Keycode?
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px]">
                          key
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••••••"
                          className="w-full bg-slate-50/80 text-slate-900 text-sm pl-11 pr-11 py-3 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-600">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberTerminal}
                          onChange={(e) => setRememberTerminal(e.target.checked)}
                          className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                        />
                        <span>Remember lab workstation</span>
                      </label>
                      <span className="text-slate-400">12h Session Expiry</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <span>{isLoading ? 'Authenticating...' : 'Sign In to Research Console'}</span>
                      <svg
                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Subtle IRB Compliance callout (Clean & minimal box) */}
                    <div className="mt-2 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-slate-600">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">
                          verified_user
                        </span>
                        <span>IRB Protocol Clearance</span>
                      </div>
                      <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold text-[10px]">
                        ENFORCED
                      </span>
                    </div>
                  </form>
                ) : (
                  /* Form: Register */
                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold block mb-1.5">
                          Investigator Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          placeholder="Dr. Helen Vance"
                          className="w-full bg-slate-50/80 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold block mb-1.5">
                          Research Role
                        </label>
                        <select
                          value={registerRole}
                          onChange={(e) => setRegisterRole(e.target.value)}
                          className="w-full bg-slate-50/80 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        >
                          <option value="pi">Principal Investigator (PI)</option>
                          <option value="postdoc">Postdoctoral Fellow</option>
                          <option value="lead">Lab Manager / Tech Lead</option>
                          <option value="grad">Graduate Researcher (Ph.D.)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold block mb-1.5">
                        Academic / Institutional Affiliation
                      </label>
                      <input
                        type="text"
                        required
                        value={registerAffiliation}
                        onChange={(e) => setRegisterAffiliation(e.target.value)}
                        placeholder="e.g. Stanford University - Center for Cognitive Neuroscience"
                        className="w-full bg-slate-50/80 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold block mb-1.5">
                          Institutional Email (.edu / .org)
                        </label>
                        <input
                          type="email"
                          required
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          placeholder="h.vance@stanford.edu"
                          className="w-full bg-slate-50/80 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold block mb-1.5">
                          Terminal Password
                        </label>
                        <input
                          type="password"
                          required
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full bg-slate-50/80 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group text-sm disabled:opacity-70"
                    >
                      <span>{isLoading ? 'Creating Account...' : 'Create Researcher Account'}</span>
                      <svg
                        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Mode 2: Participant Quick Join (Minimal & Clean) */}
            {portalMode === 'participant' && (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                  <div>
                    <span className="font-mono text-xs uppercase text-slate-500 font-semibold">
                      SESSION TICKET PROTOCOL
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 font-heading mt-0.5">
                      Enter Study Access Code
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
                    Anonymous Mode
                  </span>
                </div>

                <form onSubmit={handleJoinParticipant} className="flex flex-col gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-700 font-semibold block mb-1.5">
                      Experiment Ticket / Study Code
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-[18px]">
                        confirmation_number
                      </span>
                      <input
                        type="text"
                        required
                        value={participantToken}
                        onChange={(e) => setParticipantToken(e.target.value.toUpperCase())}
                        placeholder="e.g. MANOVA-7749-STROOP"
                        className="w-full bg-slate-50/80 text-slate-900 text-base font-bold font-mono tracking-wider pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all uppercase"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-mono text-[11px] text-slate-500">
                        Provided by your study investigator. Case-insensitive.
                      </span>
                      <button
                        type="button"
                        onClick={() => setParticipantToken('MANOVA-7749-STROOP')}
                        className="text-[11px] font-mono text-emerald-600 hover:underline"
                      >
                        Reset to Demo Stroop
                      </button>
                    </div>
                  </div>

                  {/* Square Boxes: Hardware Calibration Status (Mirrors Landing Page cards lines 350-365) */}
                  <div className="grid grid-cols-2 gap-3 my-2">
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 shadow-2xs">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Display Sync</p>
                      <p className="text-base font-bold text-slate-900 mt-1 font-mono">144 Hz</p>
                      <span className="text-xs text-emerald-700 font-mono font-medium">Hardware Locked</span>
                    </div>
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 shadow-2xs">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Input Latency</p>
                      <p className="text-base font-bold text-emerald-700 mt-1 font-mono">0.18 ms</p>
                      <span className="text-xs text-slate-500 font-mono">DOMHighResTime</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group text-sm"
                  >
                    <span>Launch Experiment Runner</span>
                    <svg
                      className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </form>
              </div>
            )}
          </FadeIn>

          {/* 3 Square Boxes: Platform Guarantees (Mirrors Landing Page hero cards lines 350-365) */}
          <FadeIn delay={250} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 w-full">
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 shadow-2xs text-left">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Clock Drift</p>
              <p className="text-base font-bold text-emerald-700 mt-1 font-mono">±0.04 ms</p>
              <span className="text-xs text-slate-500">PTP Sub-ms Synced</span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 shadow-2xs text-left">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Privacy Standard</p>
              <p className="text-base font-bold text-slate-900 mt-1 font-mono">Zero PII</p>
              <span className="text-xs text-emerald-700 font-mono font-medium">BIDS &amp; HIPAA Safe</span>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 shadow-2xs text-left">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider font-mono">Stream Storage</p>
              <p className="text-base font-bold text-slate-900 mt-1 font-heading">Deterministic</p>
              <span className="text-xs text-emerald-700 font-medium">Immutable Replay</span>
            </div>
          </FadeIn>
        </div>
      </main>

      {/* Footer (Mirrors Landing Page footer style) */}
      <footer className="border-t border-slate-200 bg-white py-6 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-white">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Manova Labs</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-slate-500">© 2025 Computational Telemetry Enclave</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-slate-500">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              All Systems Operational
            </div>
            <Link to="/science" className="hover:text-emerald-600 transition-colors">Security Spec</Link>
            <Link to="/" className="hover:text-emerald-600 transition-colors">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
