export function isInt32(value: number) {
  return value === (value | 0);
}
