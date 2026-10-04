import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const SECTIONS = [
  { id: 'hero',         label: 'Overview'     },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'pipeline',     label: 'Pipeline'     },
  { id: 'architecture', label: 'Architecture' },
  { id: 'analytics',    label: 'Analytics'    },
  { id: 'sandbox',      label: 'Sandbox'      },
];

export default function NavigationDots() {
  const [activeIdx, setActiveIdx] = useState(0);

  const syncOnScroll = useCallback(() => {
    // If user has scrolled to the very bottom, clamp to last section
    const atBottom =
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 50;
    if (atBottom) {
      setActiveIdx(SECTIONS.length - 1);
      return;
    }

    const scrollPos = window.scrollY + window.innerHeight / 3;
    for (let i = SECTIONS.length - 1; i >= 0; i--) {
      const el = document.getElementById(SECTIONS[i].id);
      if (el && el.offsetTop <= scrollPos) {
        setActiveIdx(i);
        return;
      }
    }
    setActiveIdx(0);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = SECTIONS.findIndex((s) => s.id === entry.target.id);
            if (idx >= 0) setActiveIdx(idx);
          }
        });
      },
      { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    window.addEventListener('scroll', syncOnScroll, { passive: true });
    syncOnScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', syncOnScroll);
    };
  }, [syncOnScroll]);

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Render via portal directly on document.body — completely escapes any
  // ancestor stacking contexts, transforms, backdrop-filters, or overflow clips.
  return createPortal(
    <div
      className="fixed left-6 top-1/2 -translate-y-1/2 z-[9999] pointer-events-auto w-10 py-4 px-2 flex flex-col gap-4 items-center rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xl shadow-slate-200/50"
      style={{ overflow: 'visible' }}
      aria-label="Page section navigation"
    >
      {SECTIONS.map(({ id, label }, idx) => {
        const isActive = idx === activeIdx;
        return (
          <div key={id} className="relative group flex items-center justify-center">
            {/* Dot */}
            <button
              onClick={() => scrollTo(id)}
              aria-label={(isActive ? 'Current section: ' : 'Scroll to ') + label}
              className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full focus:outline-none cursor-pointer"
            >
              <span
                className={[
                  'rounded-full transition-all duration-300',
                  isActive
                    ? 'w-2.5 h-2.5 bg-emerald-500 scale-125'
                    : 'w-2 h-2 bg-slate-300 group-hover:bg-slate-400',
                ].join(' ')}
              />
            </button>

            {/* Active: single pop-out label pill */}
            {isActive && (
              <span
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2
                           px-3 py-1 bg-white border border-slate-200/90
                           text-slate-800 text-xs font-semibold rounded-full
                           shadow-md whitespace-nowrap pointer-events-none select-none"
              >
                {label}
              </span>
            )}

            {/* Inactive: hover-only dark tooltip */}
            {!isActive && (
              <span
                className="pointer-events-none select-none
                           absolute left-full ml-3 top-1/2 -translate-y-1/2
                           px-2 py-1 bg-slate-800 text-white text-[10px] font-medium
                           rounded whitespace-nowrap shadow-md
                           opacity-0 -translate-x-1
                           group-hover:opacity-100 group-hover:translate-x-0
                           transition-all duration-150"
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
