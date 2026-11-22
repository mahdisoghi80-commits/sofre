import React from 'react';
import { motion } from 'motion/react';
import { toPersianDigits } from '../utils/format';

interface MacroRingProps {
  calories: number;
  targetCalories?: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const MacroRing: React.FC<MacroRingProps> = ({
  calories,
  targetCalories,
  proteinG,
  carbsG,
  fatG,
  size = 112,
  strokeWidth = 10,
  label = 'کالری',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetLabel = targetCalories ? `از ${toPersianDigits(Math.round(targetCalories))}` : label;

  const pCal = proteinG * 4;
  const cCal = carbsG * 4;
  const fCal = fatG * 9;
  const total = Math.max(1, pCal + cCal + fCal);

  const pFrac = pCal / total;
  const cFrac = cCal / total;
  const fFrac = fCal / total;

  const gap = 3;
  const pLen = Math.max(0, pFrac * circumference - gap);
  const cLen = Math.max(0, cFrac * circumference - gap);
  const fLen = Math.max(0, fFrac * circumference - gap);

  const pOffset = 0;
  const cOffset = -(pFrac * circumference);
  const fOffset = -((pFrac + cFrac) * circumference);

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
          stroke="#EFE5D8"
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
          strokeDasharray={`${pLen} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: pOffset }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#C87955"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${cLen} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: cOffset }}
          transition={{ type: 'spring', stiffness: 85, damping: 18, delay: 0.08 }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#68734E"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${fLen} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: fOffset }}
          transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.16 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-xl font-black text-[#292B25] leading-none tabular-nums-fa">
          {toPersianDigits(Math.round(calories))}
        </span>
        <span className="text-[11px] font-semibold text-[#75746E] mt-1 tabular-nums-fa">
          {targetLabel}
        </span>
      </div>
    </div>
  );
};
