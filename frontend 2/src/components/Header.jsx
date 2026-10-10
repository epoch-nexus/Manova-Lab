import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const userEmail = user?.email || 'researcher@manovalabs.org';
  const displayName = user?.name || userEmail.split('@')[0];
  const userInitial = (displayName || userEmail).charAt(0).toUpperCase();

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-lg flex items-center justify-between gap-6 min-w-[320px] max-w-fit transition-all duration-200">
      {/* Brand logo & name */}
      <Link to="/" className="flex items-center gap-2 group shrink-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
          Manova <span className="text-emerald-600">Labs</span>
        </span>
      </Link>

      {/* Essential Navigation & User Actions */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Dashboard link */}
        <Link
          to="/dashboard"
          className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
        >
          Dashboard
        </Link>

        {user ? (
          <>
            {/* Account Symbol / Avatar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center rounded-full hover:ring-2 hover:ring-emerald-500/30 transition-all cursor-pointer focus:outline-hidden"
                title={userEmail}
                aria-label="Account details"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs ring-1 ring-emerald-500/20">
                    {userInitial}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">{displayName}</span>
                    <span className="text-[11px] text-slate-500 font-mono block truncate">{userEmail}</span>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 cursor-pointer border-t border-slate-100 dark:border-slate-800 mt-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Logout Button / Icon */}
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-full transition-colors flex items-center cursor-pointer"
              title="Log Out"
              aria-label="Log Out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
