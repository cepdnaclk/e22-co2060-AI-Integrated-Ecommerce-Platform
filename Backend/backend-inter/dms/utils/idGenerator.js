function randomBlock(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase();
}

export function generateTrackingNumber() {
  const stamp = Date.now().toString().slice(-8);
  return `TRK-${stamp}-${randomBlock(6)}`;
}

export function generateCode(prefix) {
  const stamp = Date.now().toString().slice(-6);
  return `${prefix}-${stamp}-${randomBlock(4)}`;
}

