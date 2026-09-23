export const toAmount = (value, fieldName = "amount") => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return Number(numeric.toFixed(2));
};

