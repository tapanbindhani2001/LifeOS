import React from 'react'
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path } from 'react-native-svg'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Logo({ size = 'md' }: LogoProps) {
  const sizePixels = {
    sm: 36,
    md: 52,
    lg: 72,
    xl: 96
  }

  const dimension = sizePixels[size]

  return (
    <Svg
      width={dimension}
      height={dimension}
      viewBox="0 0 100 100"
      fill="none"
    >
      <Defs>
        {/* Background gradient */}
        <LinearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8b5cf6" />
          <Stop offset="50%" stopColor="#6d4df2" />
          <Stop offset="100%" stopColor="#3b82f6" />
        </LinearGradient>
        
        {/* Inner white gradient */}
        <LinearGradient id="logo-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ffffff" />
          <Stop offset="100%" stopColor="#e0e7ff" />
        </LinearGradient>
      </Defs>

      {/* Main outer rounded square */}
      <Rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="24"
        fill="url(#logo-bg-grad)"
      />

      {/* Stylized background circle representing Life/Community/Wholeness */}
      <Circle
        cx="50"
        cy="50"
        r="24"
        stroke="url(#logo-icon-grad)"
        strokeWidth="6"
        strokeLinecap="round"
        opacity={0.2}
      />
      
      {/* Primary elegant swoosh/checkmark representing OS/Action/Success */}
      <Path
        d="M34 50 L46 62 L70 34"
        stroke="url(#logo-icon-grad)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Smart/AI Sparkle Dot at the top right intersection */}
      <Circle
        cx="70"
        cy="34"
        r="4.5"
        fill="#ffffff"
      />
    </Svg>
  )
}
