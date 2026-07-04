// Slowed to 1-2 pins/day (2026-07-04) to recover from a Pinterest distribution
// limit triggered by the previous 6-9/day cadence. Do not raise until reach recovers.
export const PIN_SCHEDULE_MIN_PER_DAY = 1;
export const PIN_SCHEDULE_MAX_PER_DAY = 2;
// 14:00 UTC = morning US Eastern; second slot lands mid-afternoon US.
export const PIN_SCHEDULE_START_HOUR_UTC = 14;
export const PIN_SCHEDULE_WINDOW_MINUTES = 120;
export const PIN_SCHEDULE_SLOT_SPACING_HOURS = 5;

export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

export function formatTime(date) {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function avoidRoundMinute(offset) {
  const minute = offset % 60;
  if (minute % 15 !== 0) return offset;
  return (offset + 7) % PIN_SCHEDULE_WINDOW_MINUTES;
}

export function pinsPerDayForDate(dateString) {
  return PIN_SCHEDULE_MIN_PER_DAY
    + (hashString(dateString) % (PIN_SCHEDULE_MAX_PER_DAY - PIN_SCHEDULE_MIN_PER_DAY + 1));
}

export function randomPinsPerDay(random = Math.random) {
  return PIN_SCHEDULE_MIN_PER_DAY
    + Math.floor(random() * (PIN_SCHEDULE_MAX_PER_DAY - PIN_SCHEDULE_MIN_PER_DAY + 1));
}

export function parseScheduledDateTime(scheduledDate, scheduledTime = "00:00") {
  if (!scheduledDate) return null;
  const [hour, minute] = String(scheduledTime || "00:00")
    .split(":")
    .map((n) => Number.parseInt(n, 10));
  const date = new Date(`${scheduledDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  return date;
}

export function addUtcDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

export function scheduledTimeForSlot(dateString, slotIndex, random = null) {
  const rawOffset = typeof random === "function"
    ? Math.floor(random() * PIN_SCHEDULE_WINDOW_MINUTES)
    : hashString(`${dateString}:${slotIndex}`) % PIN_SCHEDULE_WINDOW_MINUTES;
  const offset = avoidRoundMinute(rawOffset);
  const totalMinutes = ((PIN_SCHEDULE_START_HOUR_UTC + slotIndex * PIN_SCHEDULE_SLOT_SPACING_HOURS) * 60) + offset;
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function currentQueueSlot(now = new Date()) {
  const slot = new Date(now);
  slot.setUTCSeconds(0, 0);
  return { scheduled_date: formatDate(slot), scheduled_time: formatTime(slot) };
}

export function nextQueueSlotFromPending(rows, now = new Date()) {
  const pending = (rows || [])
    .filter((row) => row?.scheduled_date)
    .map((row) => ({
      ...row,
      scheduled_time: row.scheduled_time || "00:00",
      scheduled_at: parseScheduledDateTime(row.scheduled_date, row.scheduled_time),
    }))
    .filter((row) => row.scheduled_at)
    .sort((a, b) => a.scheduled_at - b.scheduled_at || String(a.row_id || "").localeCompare(String(b.row_id || "")));

  if (!pending.length) return currentQueueSlot(now);

  const latest = pending[pending.length - 1];
  const currentSlot = currentQueueSlot(now);
  const currentSlotAt = parseScheduledDateTime(currentSlot.scheduled_date, currentSlot.scheduled_time);
  if (latest.scheduled_at < currentSlotAt) return currentSlot;

  let dateString = latest.scheduled_date;
  for (let guard = 0; guard < 730; guard += 1) {
    const capacity = pinsPerDayForDate(dateString);
    const existingCount = pending.filter((row) => row.scheduled_date === dateString).length;
    for (let slotIndex = existingCount; slotIndex < capacity; slotIndex += 1) {
      const scheduledTime = scheduledTimeForSlot(dateString, slotIndex);
      const scheduledAt = parseScheduledDateTime(dateString, scheduledTime);
      if (scheduledAt > latest.scheduled_at && scheduledAt >= now) {
        return { scheduled_date: dateString, scheduled_time: scheduledTime };
      }
    }
    dateString = addUtcDays(dateString, 1);
  }

  return currentQueueSlot(now);
}

export function scheduleRowsByRandomDayCount(rows, {
  startDate = new Date(),
  dayOffsetStart = 0,
  random = Math.random,
} = {}) {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const scheduled = [];
  let index = 0;
  let dayOffset = dayOffsetStart;
  while (index < rows.length) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    const dateString = formatDate(date);
    const pinsToday = randomPinsPerDay(random);
    for (let slotIndex = 0; slotIndex < pinsToday && index < rows.length; slotIndex += 1, index += 1) {
      scheduled.push({
        ...rows[index],
        scheduled_date: dateString,
        scheduled_time: scheduledTimeForSlot(dateString, slotIndex, random),
      });
    }
    dayOffset += 1;
  }

  return scheduled;
}
