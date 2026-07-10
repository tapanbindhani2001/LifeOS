import React from 'react'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-11 w-11',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  }

  return (
    <svg
      className={`${sizeClasses[size]} ${className || ''} transition-transform hover:scale-105 duration-300`}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="50%" stopColor="#6d4df2" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        
        {/* Inner white gradient */}
        <linearGradient id="logo-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="logo-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#6d4df2" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main outer rounded square */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="24"
        fill="url(#logo-bg-grad)"
        filter="url(#logo-glow)"
      />

      {/* Stylized background circle representing Life/Community/Wholeness */}
      <circle
        cx="50"
        y="50"
        r="24"
        stroke="url(#logo-icon-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.2"
      />
      
      {/* Primary elegant swoosh/checkmark representing OS/Action/Success */}
      <path
        d="M34 50 L46 62 L70 34"
        stroke="url(#logo-icon-grad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Smart/AI Sparkle Dot at the top right intersection */}
      <circle
        cx="70"
        cy="34"
        r="4.5"
        fill="#ffffff"
        className="animate-pulse"
      />
    </svg>
  )
}
