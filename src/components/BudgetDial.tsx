import React, { useCallback, useId, useRef } from 'react';
import { motion } from 'motion/react';
import { formatToman, toFaDigits } from '../utils/format';
import { hapticTick } from '../utils/native';
import { IconMinus, IconPlus } from './icons/SofrehIcons';

interface BudgetDialProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  servings: number;
  mealsPerWeek: number;
  onChange: (nextValue: number) => void;
}

const START_ANGLE = -135; // bottom-left
const END_ANGLE = 135; // bottom-right
const SWEEP = END_ANGLE - START_ANGLE; // 270 deg
const CX = 140;
const CY = 140;
const RADIUS = 108;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function formatCompactBudget(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${toFaDigits(Number.isInteger(m) ? String(m) : m.toFixed(1))} میلیون`;
  }
  return `${toFaDigits(Math.round(amount / 1000))} هزار`;
}

/**
 * Tactile Rotary Budget Dial (dynamically bounded from the mathematical minimum weekly cost
 * up to 12M+ Toman per week, tuned for live Iranian grocery prices).
 */
export const BudgetDial: React.FC<BudgetDialProps> = ({
  value,
  min = 1_000_000,
  max = 12_000_000,
  step = 200_000,
  servings,
  mealsPerWeek,
  onChange,
}) => {
  const effectiveMin = Math.max(500_000, min);
  const effectiveMax = Math.max(max, Math.ceil((effectiveMin * 2.5) / 1_000_000) * 1_000_000);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const uid = useId().replace(/:/g, '');
  const arcGradId = `budgetArcGrad-${uid}`;
  const knobGlowId = `knobGlow-${uid}`;

  const clamped = Math.min(effectiveMax, Math.max(effectiveMin, value));
  const ratio = (clamped - effectiveMin) / Math.max(1, effectiveMax - effectiveMin);
  const currentAngle = START_ANGLE + ratio * SWEEP;
  const knobPos = polarToCartesian(CX, CY, RADIUS, currentAngle);

  const presets = [0, 0.25, 0.55, 0.85].map((pct) => {
    const raw = effectiveMin + pct * (effectiveMax - effectiveMin);
    const val = Math.min(
      effectiveMax,
      Math.max(effectiveMin, Math.round(raw / step) * step)
    );
    return { label: formatCompactBudget(val), val };
  });

  const perServing = Math.round(
    clamped / Math.max(1, mealsPerWeek * Math.max(1, servings))
  );

  const updateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle > 180) angle -= 360;

      const clampedAngle = Math.max(START_ANGLE, Math.min(END_ANGLE, angle));
      const pct = (clampedAngle - START_ANGLE) / SWEEP;
      const raw = effectiveMin + pct * (effectiveMax - effectiveMin);
      const snapped = Math.round(raw / step) * step;
      const next = Math.max(effectiveMin, Math.min(effectiveMax, snapped));
      if (next !== clamped) {
        hapticTick();
        onChange(next);
      }
    },
    [clamped, effectiveMax, effectiveMin, onChange, step]
  );

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    updateFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const tickCount = 36;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const tRatio = i / tickCount;
    const angle = START_ANGLE + tRatio * SWEEP;
    const isMajor = i % 6 === 0;
    const p1 = polarToCartesian(CX, CY, RADIUS - (isMajor ? 18 : 15), angle);
    const p2 = polarToCartesian(CX, CY, RADIUS - 10, angle);
    const active = tRatio <= ratio + 0.005;
    return { p1, p2, isMajor, active };
  });

  const millionText =
    clamped >= 1_000_000
      ? `${toFaDigits((clamped / 1_000_000).toFixed(clamped % 1_000_000 === 0 ? 0 : 1))} میلیون`
      : `${toFaDigits(Math.round(clamped / 1000))} هزار`;

  return (
    <div className="flex flex-col items-center space-y-5 select-none w-full" data-testid="budget-dial">
      <div className="relative w-[290px] h-[260px] flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 280 265"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full touch-none cursor-grab active:cursor-grabbing"
          role="slider"
          aria-label="بودجه هفتگی به تومان"
          aria-valuemin={effectiveMin}
          aria-valuemax={effectiveMax}
          aria-valuenow={clamped}
        >
          <defs>
            <linearGradient id={arcGradId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF8A70" />
              <stop offset="60%" stopColor="#F04438" />
              <stop offset="100%" stopColor="#C42F26" />
            </linearGradient>
            <filter id={knobGlowId} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#F04438" floodOpacity="0.38" />
            </filter>
          </defs>

          {/* Soft ceramic inner disc */}
          <circle
            cx={CX}
            cy={CY}
            r={82}
            className="fill-white/85 dark:fill-[#22241F] stroke-white dark:stroke-white/10"
            strokeWidth="2"
          />

          {/* Radial precision ticks */}
          {ticks.map((t, idx) => (
            <line
              key={idx}
              x1={t.p1.x}
              y1={t.p1.y}
              x2={t.p2.x}
              y2={t.p2.y}
              className={t.active ? 'stroke-[#F04438]' : 'stroke-[#D9CEC2] dark:stroke-[#3D4037]'}
              strokeWidth={t.isMajor ? 2.2 : 1.3}
              strokeLinecap="round"
              opacity={t.active ? 0.95 : 0.65}
            />
          ))}

          {/* Track background arc */}
          <path
            d={describeArc(CX, CY, RADIUS, START_ANGLE, END_ANGLE)}
            fill="none"
            className="stroke-[#EAE0D5] dark:stroke-[#2D3028]"
            strokeWidth="13"
            strokeLinecap="round"
          />

          {/* Active budget arc */}
          {ratio > 0.005 && (
            <path
              d={describeArc(CX, CY, RADIUS, START_ANGLE, currentAngle)}
              fill="none"
              stroke={`url(#${arcGradId})`}
              strokeWidth="13"
              strokeLinecap="round"
            />
          )}

          {/* Tactile circular knob */}
          <g filter={`url(#${knobGlowId})`}>
            <circle cx={knobPos.x} cy={knobPos.y} r="14.5" fill="#FFFFFF" />
            <circle cx={knobPos.x} cy={knobPos.y} r="7" fill="#F04438" />
          </g>

          {/* Min / Max corner indicators */}
          <text x="44" y="242" textAnchor="middle" className="fill-[#8A857C] dark:fill-[#ADA89F]" fontSize="11" fontWeight="700">
            {formatCompactBudget(effectiveMin)}
          </text>
          <text x="236" y="242" textAnchor="middle" className="fill-[#8A857C] dark:fill-[#ADA89F]" fontSize="11" fontWeight="700">
            {formatCompactBudget(effectiveMax)}
          </text>
        </svg>

        {/* Centered Live Budget Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2 px-12 text-center">
          <div className="font-display font-black text-[23px] leading-tight text-[#292B25] dark:text-[#F5EFE8] tabular-nums-fa">
            {millionText}
          </div>
          <div className="text-[11px] font-extrabold text-[#F04438] dark:text-[#FF7E75] mt-1">تومان در هفته</div>
          <div className="text-[10px] font-bold text-[#75746E] dark:text-[#ADA89F] mt-1.5 tabular-nums-fa">
            هر پرس ≈ {formatToman(perServing)}
          </div>
        </div>
      </div>

      {/* Circular Stepper Row */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            onChange(Math.max(effectiveMin, clamped - step));
          }}
          aria-label="کاهش بودجه"
          className="w-11 h-11 rounded-full liquid-glass text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-sm"
        >
          <IconMinus size={18} />
        </motion.button>

        <span className="text-xs font-extrabold text-[#9E9B94] dark:text-[#ADA89F] tabular-nums-fa min-w-[72px] text-center">
          {formatCompactBudget(step)}
        </span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            onChange(Math.min(effectiveMax, clamped + step));
          }}
          aria-label="افزایش بودجه"
          className="w-11 h-11 rounded-full coral-glass-pill text-white flex items-center justify-center"
        >
          <IconPlus size={18} />
        </motion.button>
      </div>

      {/* Clean Single-Row 4-Column Quick Presets */}
      <div className="grid grid-cols-4 gap-1.5 w-full max-w-[340px]">
        {presets.map((p, idx) => {
          const active = clamped === p.val;
          return (
            <button
              key={`${p.val}-${idx}`}
              type="button"
              onClick={() => {
                onChange(p.val);
              }}
              className={`py-2 rounded-full text-[11px] font-extrabold transition text-center whitespace-nowrap ${
                active
                  ? 'coral-glass-pill text-white'
                  : 'bg-white/85 dark:bg-[#262822] text-[#5C5952] dark:text-[#C8C3BA] border border-[#E8DDD0] dark:border-white/10'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
