import styled from 'styled-components';

const Svg = styled.svg`
  width: 160px;
  height: 160px;
`;

const Legend = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Swatch = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  display: inline-block;
`;

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
}

function polar(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  const s = polar(cx, cy, r, end);
  const e = polar(cx, cy, r, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`;
}

export function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: DonutChartProps): React.JSX.Element {
  const total = slices.reduce((acc, s) => acc + s.value, 0) || 1;
  let cursor = 0;
  const gap = 2;
  const paths = slices.map((slice) => {
    const angle = (slice.value / total) * 360;
    const start = cursor + gap / 2;
    const end = cursor + angle - gap / 2;
    cursor += angle;
    return { ...slice, d: arcPath(80, 80, 60, start, Math.max(start, end)) };
  });

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Svg viewBox="0 0 160 160" aria-hidden>
          {paths.map((p) => (
            <path
              key={p.label}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={24}
            />
          ))}
        </Svg>
        {(centerLabel || centerValue) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeContent: 'center',
              textAlign: 'center',
            }}
          >
            {centerValue ? (
              <strong style={{ fontFeatureSettings: "'tnum' 1" }}>{centerValue}</strong>
            ) : null}
            {centerLabel ? (
              <span style={{ fontSize: 12, color: '#616161' }}>{centerLabel}</span>
            ) : null}
          </div>
        )}
      </div>
      <Legend>
        {slices.map((s) => (
          <li key={s.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Swatch $color={s.color} />
            <span>
              {s.label} — {s.value.toLocaleString('pt-BR')}
            </span>
          </li>
        ))}
      </Legend>
    </div>
  );
}
