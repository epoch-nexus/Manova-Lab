import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingAssay, setIsCreatingAssay] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleNewAssay = async (e) => {
    e?.preventDefault();
    if (isCreatingAssay) return;
    setIsCreatingAssay(true);
    try {
      const uniqueSlug = `protocol-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const created = await api.experiments.create({
        title: 'New Cognitive Protocol',
        preset: 'Visual Stroop',
        status: 'DRAFT',
        description: 'Sub-millisecond cognitive assay.',
        publicSlug: uniqueSlug,
        config: {
          displayMode: 'fullscreen',
          backgroundColor: '#0F172A',
          allowPause: false,
          showFeedback: true,
          preset: 'Visual Stroop',
        },
      });

      const targetId = created?.id || created?.data?.id || created?.publicSlug;
      if (targetId) {
        navigate(`/builder?id=${targetId}`);
      } else {
        navigate('/builder');
      }
    } catch (err) {
      console.warn('Direct assay creation error, redirecting to builder canvas:', err);
      navigate('/builder');
    } finally {
      setIsCreatingAssay(false);
    }
  };

  const userEmail = user?.email || 'researcher@manovalabs.org';
  const displayName = user?.name || userEmail.split('@')[0];
  const userInitial = (displayName || userEmail).charAt(0).toUpperCase();

  return (
    <header className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/95 text-neutral-900 backdrop-blur-md rounded-full border border-slate-200 shadow-xs flex items-center justify-between gap-4 sm:gap-6 min-w-[340px] max-w-fit transition-all duration-200">
      {/* Brand Label/Icon */}
      <Link to="/" className="flex items-center gap-2 group shrink-0">
        <div className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center text-white shadow-2xs transition-transform duration-200 group-hover:scale-105">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <span className="font-semibold text-neutral-900 text-sm tracking-tight whitespace-nowrap">
          Manova <span className="text-neutral-500 font-normal">Labs</span>
        </span>
      </Link>

      {/* Navigation Links - Pebble-shaped rounded pill buttons */}
      <nav className="flex items-center gap-2 shrink-0">
        <Link
          to="/dashboard"
          className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-white text-neutral-800 text-xs font-semibold border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px] text-neutral-500">grid_view</span>
          <span>Dashboard</span>
        </Link>
        <Link
          to="/science"
          className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-white text-neutral-800 text-xs font-semibold border border-slate-200 shadow-2xs hover:shadow-xs transition-all hidden sm:flex items-center gap-1.5 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px] text-neutral-500">science</span>
          <span>Features</span>
        </Link>
        <a
          href="/#pipeline"
          className="px-3.5 py-1.5 rounded-full bg-slate-50/70 hover:bg-white text-neutral-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-all hidden md:flex items-center gap-1.5 whitespace-nowrap"
        >
          <span>FAQ</span>
        </a>
      </nav>

      {/* Primary CTA & User Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {user ? (
          <>
            {/* Primary CTA Pebble Button - Muted Cyan/Teal Accent */}
            <button
              onClick={handleNewAssay}
              disabled={isCreatingAssay}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-teal-700 shadow-xs hover:shadow transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isCreatingAssay ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin inline-block"></span>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>New Assay</span>
                </>
              )}
            </button>

            {/* User Avatar with light-mode pebble border */}
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center rounded-full hover:ring-2 hover:ring-teal-500/30 transition-all cursor-pointer focus:outline-hidden"
                title={userEmail}
                aria-label="Account details"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-neutral-800 border border-slate-200 flex items-center justify-center font-mono font-bold text-[11px] shadow-2xs">
                    {userInitial}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2.5 w-48 bg-white rounded-2xl shadow-lg border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <span className="font-semibold text-neutral-900 block truncate">{displayName}</span>
                    <span className="text-[11px] text-neutral-500 font-mono block truncate">{userEmail}</span>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3.5 py-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                  >
                    My Experiments
                  </Link>
                  <Link
                    to="/builder"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    Protocol Builder
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 cursor-pointer border-t border-slate-100 mt-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900 p-1 rounded-full transition-colors flex items-center cursor-pointer border border-slate-200 hover:border-slate-300 bg-white"
              title="Log Out"
              aria-label="Log Out"
            >
              <span className="material-symbols-outlined text-[15px]">logout</span>
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium px-3.5 py-1.5 rounded-full shadow-sm transition-colors whitespace-nowrap"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
