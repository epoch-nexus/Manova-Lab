import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import FadeIn from '../components/FadeIn';

export default function AuthPage() {
  const navigate = useNavigate();
  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [participantToken, setParticipantToken] = useState('MANOVA-7749-STROOP');
  const [activeSession, setActiveSession] = useState(true);

  // Form states
  const [loginEmail, setLoginEmail] = useState('dr.arun@stanford.edu');
  const [loginPassword, setLoginPassword] = useState('StanfordPrecision#2025');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api.auth.login(loginEmail, loginPassword);
      if (data.token) localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      alert(err.message || 'Login failed');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.auth.register(registerName, registerEmail, registerPassword);
      setAuthTab('login');
      setLoginEmail(registerEmail);
    } catch (err) {
      alert(err.message || 'Registration failed');
    }
  };

  const handleJoinParticipant = (e) => {
    e.preventDefault();
    navigate('/runner');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans text-on-surface">
      {/* Top Header */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-surface-container shadow-xs">
        <div className="h-16 w-full max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <span className="font-heading font-extrabold text-lg tracking-tight uppercase text-on-surface">
                MANOVA <span className="text-emerald-600">LABS</span>
              </span>
            </Link>
            <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest hidden sm:inline-block border-l border-surface-container pl-3">
              Auth // System Gateway
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-xs font-mono text-on-surface-variant uppercase">
            <Link to="/" className="hover:text-on-surface transition-colors">Back to Home</Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded border border-surface-container">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="font-mono text-xs uppercase text-on-surface font-semibold tracking-wider">Gateway Online</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-4 sm:px-8 py-10 max-w-7xl mx-auto">
        <div className="w-full flex flex-col gap-8">
          {/* Active Terminal Node Banner */}
          <FadeIn>
            <div className="w-full bg-surface-container-low p-4 rounded-xl border border-surface-container shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="uppercase tracking-wider text-on-surface-variant">Active Hardware Node:</span>
                <span className="font-semibold text-on-surface">Terminal ID #884-PX (Stanford Medical BioX Enclave)</span>
                <span className="hidden md:inline-block text-surface-container-highest">|</span>
                {activeSession ? (
                  <div className="flex items-center gap-1.5 text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">account_circle</span>
                    <span>dr.arun@stanford.edu</span>
                    <span className="bg-surface-container-high text-emerald-700 font-bold px-1.5 py-0.2 rounded text-[10px] uppercase">PI Privilege</span>
                  </div>
                ) : (
                  <span className="text-amber-600 font-bold uppercase">No Active Session</span>
                )}
              </div>

              <button
                onClick={() => setActiveSession(!activeSession)}
                className="bg-surface-container-highest hover:bg-surface-container text-on-surface font-mono text-xs uppercase px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span>{activeSession ? 'Terminate Active Session' : 'Reconnect Session'}</span>
              </button>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Researcher Console Form (Col 7) */}
            <FadeIn delay={100} className="lg:col-span-7">
              <section className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs flex flex-col overflow-hidden">
              <div className="p-6 bg-surface-container-low border-b border-surface-container flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-primary uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    SECURE TELEMETRY INTERFACE // GATEWAY v4.8
                  </span>
                  <div className="flex items-center gap-1.5 bg-surface-container-highest px-2.5 py-1 rounded font-mono text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
                    FIPS 140-3 LEVEL 4
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-on-surface tracking-tight">
                  Research Console
                </h1>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Access multi-modal cognitive pipelines, pupil dilation arrays, and millisecond event-related potential datasets.
                </p>

                {/* Tabs */}
                <div className="grid grid-cols-2 mt-4 bg-surface-container p-1 rounded-xl">
                  <button
                    onClick={() => setAuthTab('login')}
                    className={`py-2 text-xs font-mono uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${
                      authTab === 'login' ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">login</span>
                    <span>Log In</span>
                  </button>
                  <button
                    onClick={() => setAuthTab('register')}
                    className={`py-2 text-xs font-mono uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all ${
                      authTab === 'register' ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">app_registration</span>
                    <span>Register Lab Account</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {authTab === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold">
                          Institutional / University Email
                        </label>
                        <span className="text-on-surface-variant text-[11px] font-mono lowercase">e.g. j.doe@mit.edu</span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">badge</span>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          className="w-full bg-surface-container-low text-on-surface text-sm pl-10 pr-4 py-2.5 rounded-lg border border-surface-container focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold">
                          Terminal Password
                        </label>
                        <span className="font-mono text-xs text-primary hover:underline cursor-pointer">
                          Forgot Keycode?
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">key</span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          className="w-full bg-surface-container-low text-on-surface text-sm pl-10 pr-10 py-2.5 rounded-lg border border-surface-container focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-on-surface-variant hover:text-on-surface"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" defaultChecked className="rounded accent-emerald-600" />
                        <span className="text-on-surface-variant">Remember this laboratory terminal</span>
                      </label>
                      <span className="text-on-surface-variant">Session: 12h Expire</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-emerald-700 text-on-primary py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <span>Log In to Research Console</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>

                    <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container flex items-start gap-3 mt-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">shield</span>
                      </div>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono uppercase tracking-wider text-on-surface font-semibold">IRB Clearance Protocol Enforced</span>
                          <span className="font-mono text-emerald-600 font-bold">ACTIVE</span>
                        </div>
                        <p className="text-on-surface-variant leading-relaxed">
                          Access requires active Institutional Review Board human-subjects protocol clearance. All actions undergo immutable ledger logging.
                        </p>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold block mb-1">
                          Investigator Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={registerName}
                          onChange={e => setRegisterName(e.target.value)}
                          placeholder="Dr. Helen Vance"
                          className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold block mb-1">
                          Research Role
                        </label>
                        <select className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="pi">Principal Investigator (PI)</option>
                          <option value="postdoc">Postdoctoral Fellow</option>
                          <option value="lead">Lab Manager / Tech Lead</option>
                          <option value="grad">Graduate Researcher (Ph.D./M.S.)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold block mb-1">
                        Academic / Institutional Affiliation
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Stanford University - Center for Cognitive Neuroscience"
                        className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold block mb-1">
                          Institutional Email (.edu / .org)
                        </label>
                        <input
                          type="email"
                          required
                          value={registerEmail}
                          onChange={e => setRegisterEmail(e.target.value)}
                          placeholder="h.vance@stanford.edu"
                          className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold block mb-1">
                          Create Password
                        </label>
                        <input
                          type="password"
                          required
                          value={registerPassword}
                          onChange={e => setRegisterPassword(e.target.value)}
                          placeholder="Min 14 characters"
                          className="w-full bg-surface-container-low text-on-surface text-sm px-3 py-2 rounded-lg border border-surface-container focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-emerald-700 text-on-primary py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      <span>Create Researcher Account</span>
                      <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                    </button>
                  </form>
                )}
              </div>
            </section>
          </FadeIn>

          {/* Subject Participation Portal (Col 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <FadeIn delay={200}>
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-xs flex flex-col overflow-hidden">
                <div className="h-1.5 w-full bg-emerald-500"></div>
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      SUBJECT PARTICIPATION
                    </span>
                    <span className="bg-surface-container-high text-on-surface-variant font-mono text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                      Anonymous Node
                    </span>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold font-heading text-on-surface">
                      Participating in a Study?
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      No password or account creation required. Simply enter the session ticket code provided by your experimenter.
                    </p>
                  </div>

                  <form onSubmit={handleJoinParticipant} className="flex flex-col gap-4">
                    <div>
                      <label className="font-mono text-xs uppercase tracking-wider text-on-surface font-semibold block mb-1">
                        Study Code or Participant Link
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">terminal</span>
                        <input
                          type="text"
                          value={participantToken}
                          onChange={(e) => setParticipantToken(e.target.value)}
                          placeholder="e.g. MANOVA-7749-STROOP"
                          className="w-full bg-surface-container-low font-mono text-xs uppercase pl-10 pr-4 py-2.5 rounded-lg border border-surface-container tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <span className="font-mono text-[11px] text-on-surface-variant mt-1 block">
                        Case-insensitive. Expires after single completed run.
                      </span>
                    </div>

                    <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container text-xs font-mono">
                      <div className="flex items-center justify-between mb-2">
                        <span className="uppercase tracking-wider text-on-surface font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-emerald-600">speed</span>
                          Hardware Calibration
                        </span>
                        <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-bold">READY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-surface-container-lowest p-2 rounded border border-surface-container">
                          <span className="text-[10px] text-on-surface-variant block uppercase">Display Clock</span>
                          <span className="font-bold text-sm text-on-surface">144 Hz</span>
                        </div>
                        <div className="bg-surface-container-lowest p-2 rounded border border-surface-container">
                          <span className="text-[10px] text-on-surface-variant block uppercase">Input Latency</span>
                          <span className="font-bold text-sm text-on-surface">0.18 ms</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-surface-container-highest hover:bg-surface-container text-on-surface py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 group shadow-xs"
                    >
                      <span className="group-hover:text-primary transition-colors">Join Experiment as Participant</span>
                      <span className="material-symbols-outlined text-[18px] text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </button>
                  </form>
                </div>
              </div>
            </FadeIn>

            {/* Live Synchronization Pool Mini-Widget */}
            <FadeIn delay={300}>
              <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-5 shadow-xs flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="uppercase tracking-widest font-semibold flex items-center gap-1.5 text-on-surface">
                    <span className="material-symbols-outlined text-[16px] text-primary">insights</span>
                    LIVE SYNCHRONIZATION POOL
                  </span>
                  <span className="font-bold text-emerald-600">3,492 NODES</span>
                </div>

                <div className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 text-white">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">EEG_SAMP_RATE::2048Hz</span>
                    <span className="text-emerald-400 font-bold">0.002% DROP</span>
                  </div>
                  <svg className="w-full h-10 text-emerald-400" fill="none" preserveAspectRatio="none" viewBox="0 0 300 48">
                    <path d="M 0,24 L 20,24 L 35,6 L 45,42 L 55,24 L 80,24 L 95,12 L 105,36 L 115,24 L 140,24 L 155,2 L 165,46 L 175,24 L 205,24 L 220,16 L 230,32 L 240,24 L 265,24 L 280,10 L 290,38 L 300,24" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Buffer: <strong className="text-on-surface">0.42 ms</strong></span>
                  <span>Jitter: <strong className="text-on-surface">±0.04 ms</strong></span>
                  <span>Bandwidth: <strong className="text-on-surface">1.2 GB/s</strong></span>
                </div>
              </div>
            </FadeIn>
          </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span>MANOVA <strong className="text-emerald-600">LABS</strong> © 2025</span>
            <span>•</span>
            <span>COMPUTATIONAL RESEARCH INFRASTRUCTURE</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <span className="material-symbols-outlined text-[14px]">verified_user</span>
              256-BIT CRYPTOGRAPHIC ENCLAVE
            </span>
            <span>•</span>
            <span>STATUS: OPTIMAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
