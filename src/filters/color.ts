export const hexToRgb = (value: unknown): [number, number, number] => {
  if (Array.isArray(value)) {
    return [
      clamp01(Number(value[0] ?? 0)),
      clamp01(Number(value[1] ?? 0)),
      clamp01(Number(value[2] ?? 0)),
    ];
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/^#/, '');
    const parsed = Number.parseInt(normalized.length === 3
      ? normalized.split('').map((item) => item + item).join('')
      : normalized, 16);

    return hexNumberToRgb(Number.isFinite(parsed) ? parsed : 0);
  }

  return hexNumberToRgb(typeof value === 'number' ? value : 0);
};

const hexNumberToRgb = (value: number): [number, number, number] => [
  ((value >> 16) & 255) / 255,
  ((value >> 8) & 255) / 255,
  (value & 255) / 255,
];

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
