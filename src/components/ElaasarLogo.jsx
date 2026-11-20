import React, { useState } from 'react';

/**
 * ElaasarLogo - الشعار والهوية البصرية الرسمية لـ "الأعصر لخدمات المحمول"
 * يدعم شعار الصورة الفائقة الدقة مع بديل الفيكتور SVG فائق النقاء والتكيف مع الوضعين الليلي والنهاري.
 */
export default function ElaasarLogo({
  size = 'md',
  showSubtitle = true,
  variant = 'horizontal',
  onClick,
  className = ''
}) {
  const [imageError, setImageError] = useState(false);

  // Responsive size definitions
  const emblemSizes = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8',
    md: 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11',
    lg: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16',
    xl: 'w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24'
  };

  const titleSizes = {
    sm: 'text-xs sm:text-sm font-black',
    md: 'text-sm sm:text-base md:text-lg font-black',
    lg: 'text-lg sm:text-xl md:text-2xl font-black',
    xl: 'text-xl sm:text-2xl md:text-3xl font-black'
  };

  return (
    <div
      onClick={onClick}
      className={`flex ${variant === 'vertical' ? 'flex-col items-center text-center' : 'items-center'} gap-2.5 sm:gap-3 select-none group cursor-pointer ${className}`}
    >

      {/* 1. Emblem Container with Glow & Gradient Ring */}
      <div className={`relative ${emblemSizes[size]} shrink-0 transition-transform duration-300 group-hover:scale-105`}>

        {/* Ambient Backlight Glow */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 opacity-60 blur-xs group-hover:opacity-100 group-hover:blur-sm transition-all duration-300" />

        {/* Emblem Body */}
        <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 ring-1 ring-white/20 shadow-md shadow-red-600/20 flex items-center justify-center">
          {!imageError ? (
            <img
              src="/elaasar-logo.jpg"
              alt="الأعصر لخدمات المحمول"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            /* Fallback Vector SVG in case image is missing */
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full p-1"
            >
              <defs>
                <linearGradient id="fallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff2442" />
                  <stop offset="100%" stopColor="#9e000d" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="20" fill="url(#fallbackGrad)" />
              {/* Smartphone + Arabic Alif / Lightning */}
              <rect x="25" y="16" width="50" height="68" rx="8" fill="#0f172a" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.4" />
              <path d="M 54 26 L 40 48 L 48 48 L 43 70 L 62 44 L 52 44 Z" fill="#f59e0b" />
              <circle cx="75" cy="25" r="3" fill="#ffffff" />
            </svg>
          )}
        </div>

      </div>

      {/* 2. Brand Typography & Tagline */}
      <div className={`flex flex-col ${variant === 'vertical' ? 'items-center mt-1' : 'justify-center text-right'}`}>

        {/* Main Brand Title */}
        <div className="flex items-center gap-1.5 leading-tight">
          <span className={`${titleSizes[size]} tracking-tight text-slate-900 dark:text-white transition-colors`}>
            الأعـصـر
          </span>
          <span className={`${titleSizes[size]} bg-gradient-to-r from-red-600 via-rose-600 to-red-700 bg-clip-text text-transparent`}>
            كـاش
          </span>
        </div>

        {/* Subtitle / Services Pill - hidden on small mobile and tablet screens */}
        {showSubtitle && (
          <div className="hidden md:flex items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span>خدمات المحمول والدفع الذكي</span>
            </span>
          </div>
        )}

      </div>

    </div>
  );
}
