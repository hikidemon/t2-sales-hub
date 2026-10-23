import { useId, useState } from 'react';

import { clsx } from 'clsx';

export interface ChartPoint {
  /** Label shown on the X axis. */
  label: string;
  value: number;
}

export interface LineChartProps {
  data: ChartPoint[];
  /** Formats the value shown in the tooltip and the Y axis. */
  formatValue?: (value: number) => string;
  /** Height of the plot area in pixels. */
  height?: number;
  /** Renders a horizontal reference line (e.g. the plan average). */
  referenceValue?: number;
  referenceLabel?: string;
  /** Accessible description of the chart. */
  title: string;
  className?: string;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 120;
const PADDING_TOP = 12;
const PADDING_LEFT = 10;
const PADDING_RIGHT = 10;
const PADDING_BOTTOM = 24;

const INNER_WIDTH = VIEWBOX_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const INNER_HEIGHT = VIEWBOX_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

/** Height reserved for the X axis label row under the plot. */
const LABEL_ROW_HEIGHT = 22;

/**
 * Dependency-free responsive line chart.
 *
 * The SVG uses `preserveAspectRatio="none"`, so the plot fills the
 * container width exactly. Strokes are protected with
 * `vectorEffect="non-scaling-stroke"` and the data points are rendered
 * as HTML elements on top — SVG circles would be stretched into
 * ellipses by the non-uniform scale.
 */
export function LineChart({
  data,
  formatValue = (value) => String(value),
  height = 200,
  referenceValue,
  referenceLabel,
  title,
  className,
}: LineChartProps) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return null;
  }

  const innerWidth = INNER_WIDTH;
  const innerHeight = INNER_HEIGHT;
  const viewBoxHeight = VIEWBOX_HEIGHT;

  const values = data.map((point) => point.value);
  const maxValue = Math.max(...values, referenceValue ?? 0, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;

  const xStep = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const toX = (index: number) => PADDING_LEFT + index * xStep;
  const toY = (value: number) =>
    PADDING_TOP + innerHeight - ((value - minValue) / range) * innerHeight;

  const points = data.map((point, index) => ({
    ...point,
    x: toX(index),
    y: toY(point.value),
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${
    PADDING_TOP + innerHeight
  } L ${points[0]?.x ?? 0} ${PADDING_TOP + innerHeight} Z`;

  const activePoint = activeIndex !== null ? points[activeIndex] : undefined;
  // Show at most a handful of X labels so they never overlap on mobile.
  const labelStep = Math.ceil(data.length / 6);

  const toPercentX = (x: number) => (x / VIEWBOX_WIDTH) * 100;
  const toPercentY = (y: number) => (y / VIEWBOX_HEIGHT) * 100;

  return (
    <div className={clsx('relative w-full', className)} style={{ height }}>
      {/* Plot area — the X axis labels live in a separate row below, so the
          plot keeps its own coordinate space. */}
      <div className="absolute inset-x-0 top-0" style={{ height: height - LABEL_ROW_HEIGHT }}>
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--color-brand-500))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="rgb(var(--color-brand-500))" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Baseline */}
          <line
            x1={PADDING_LEFT}
            y1={PADDING_TOP + innerHeight}
            x2={VIEWBOX_WIDTH - PADDING_RIGHT}
            y2={PADDING_TOP + innerHeight}
            className="stroke-border-secondary"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* Reference line (plan average) */}
          {referenceValue !== undefined && (
            <g>
              <line
                x1={PADDING_LEFT}
                y1={toY(referenceValue)}
                x2={VIEWBOX_WIDTH - PADDING_RIGHT}
                y2={toY(referenceValue)}
                className="stroke-brand-500/60"
                strokeWidth="1"
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            className="stroke-brand-500"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Data points are HTML elements: SVG circles would be stretched
          into ellipses by the non-uniform `preserveAspectRatio="none"`. */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {points.map((point, index) => (
            <span
              key={`dot-${point.label}-${index}`}
              className={clsx(
                'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background-card',
                activeIndex === index ? 'h-3 w-3 bg-brand-500' : 'h-2 w-2 bg-brand-500/70'
              )}
              style={{
                left: `${toPercentX(point.x)}%`,
                top: `${toPercentY(point.y)}%`,
              }}
            />
          ))}
        </div>
      </div>
      {/* X axis labels — a separate row so they keep a readable size */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between">
        {points.map((point, index) => (
          <span
            key={`label-${point.label}-${index}`}
            className={clsx(
              'text-[0.625rem] text-text-tertiary',
              index % labelStep !== 0 && index !== points.length - 1 && 'hidden sm:inline'
            )}
          >
            {point.label}
          </span>
        ))}
      </div>

      {/* Interactive hit areas */}
      <div
        className="absolute inset-x-0 top-0 flex"
        style={{ height: height - LABEL_ROW_HEIGHT }}
        onMouseLeave={() => setActiveIndex(null)}
        role="presentation"
      >
        {points.map((point, index) => (
          <button
            key={`hit-${point.label}-${index}`}
            type="button"
            className="h-full flex-1 cursor-default"
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(null)}
            aria-label={`${point.label}: ${formatValue(point.value)}`}
          />
        ))}
      </div>

      {/* Tooltip */}
      {activePoint && (
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-border-primary bg-background-card px-2.5 py-1.5 text-xs shadow-glass-sm"
          role="status"
        >
          <span className="text-text-tertiary">{activePoint.label}</span>
          <span className="ml-2 font-semibold tabular-nums text-text-primary">
            {formatValue(activePoint.value)}
          </span>
        </div>
      )}

      {referenceValue !== undefined && referenceLabel && (
        <span className="absolute right-0 top-0 text-[0.625rem] text-text-tertiary">
          {referenceLabel}
        </span>
      )}
    </div>
  );
}
