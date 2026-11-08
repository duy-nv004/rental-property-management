/**
 * Tiện ích phát hiện bất thường chỉ số điện nước (Mục 7)
 */

export const getLatestReading = (roomReadings, type, currentPeriod) => {
  if (!roomReadings || roomReadings.length === 0) return 0;
  const filtered = roomReadings
    .filter(r => r.type === type && (!currentPeriod || (r.period && r.period < currentPeriod)))
    .sort((a, b) => (b.period || '').localeCompare(a.period || ''));
  return filtered.length > 0 ? filtered[0].readingValue : 0;
};

export const computeUsageAnomaly = ({ currentReadingVal, roomReadings, type, currentPeriod, isReset }) => {
  if (currentReadingVal === undefined || currentReadingVal === null || currentReadingVal === '') return null;
  const prevValue = getLatestReading(roomReadings, type, currentPeriod);
  const used = isReset ? Number(currentReadingVal) : (Number(currentReadingVal) - prevValue);
  if (used <= 0) return null;

  const pastReadings = (roomReadings || [])
    .filter(r => r.type === type && (!currentPeriod || (r.period && r.period < currentPeriod)))
    .sort((a, b) => (b.period || '').localeCompare(a.period || ''));

  if (pastReadings.length < 2) return null;
  const pastUsages = [];
  for (let i = 0; i < pastReadings.length - 1 && i < 3; i++) {
    const delta = pastReadings[i].meterReset
      ? pastReadings[i].readingValue
      : (pastReadings[i].readingValue - pastReadings[i + 1].readingValue);
    if (delta >= 0) pastUsages.push(delta);
  }
  if (pastUsages.length === 0) return null;

  const avg = pastUsages.reduce((a, b) => a + b, 0) / pastUsages.length;
  const threshold = type === 'electricity' ? 30 : 5;
  if (avg > 0 && used > 1.5 * avg && used > threshold) {
    const percent = Math.round(((used - avg) / avg) * 100);
    return {
      used,
      avg: Math.round(avg),
      percent,
      msg: `Tăng ${percent}% so với TB (${Math.round(avg)})`
    };
  }
  return null;
};

