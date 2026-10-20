export const UNITS = {
  mm: { label: '毫米', suffix: 'mm', meters: 0.001 },
  cm: { label: '厘米', suffix: 'cm', meters: 0.01 },
  m: { label: '米', suffix: 'm', meters: 1 },
  in: { label: '英寸', suffix: 'in', meters: 0.0254 },
  ft: { label: '英尺', suffix: 'ft', meters: 0.3048 },
};

export function metersToUnit(meters, unit) {
  return meters / UNITS[unit].meters;
}

export function formatLength(meters, unit = 'mm') {
  const value = metersToUnit(meters, unit);
  const absolute = Math.abs(value);
  const precision = absolute >= 100 ? 1 : absolute >= 10 ? 2 : absolute >= 1 ? 2 : 3;
  return `${value.toFixed(precision)} ${UNITS[unit].suffix}`;
}
