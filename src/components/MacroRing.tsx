import React from 'react';
import { motion } from 'motion/react';
import { toPersianDigits } from '../utils/format';
import { IconFlame } from './icons/SofrehIcons';

interface MacroRingProps {
  calories: number;
  targetCalories?: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Unmistakable Apple-Fitness-style Calorie Goal Ring.
 * Uses a single semantic coral hue (#F04438) strictly for calories so it never conflicts
 * with Protein (green), Carbs (amber), or Fat (blue).
 */
export const MacroRing: React.FC<MacroRingProps> = ({
  calories,
  targetCalories = 2000,
  size = 104,
  strokeWidth = 9,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, calories / Math.max(1, targetCalories)));
  const dashLen = Math.max(0, pct * circumference);

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3E8DF"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F04438"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <IconFlame size={15} className="text-[#F04438] mb-0.5" />
        <span className="font-display text-lg font-black text-[#292B25] leading-none tabular-nums-fa">
          {toPersianDigits(Math.round(calories))}
        </span>
        <span className="text-[10px] font-bold text-[#8A847C] mt-0.5 tabular-nums-fa">
          از {toPersianDigits(Math.round(targetCalories))}
        </span>
      </div>
    </div>
  );
};
