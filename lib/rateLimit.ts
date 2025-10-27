export function getUserHourlyLimit(): number {
  const def = Number(process.env.EMAILS_PER_HOUR_DEFAULT || '20');
  return Number.isFinite(def) && def > 0 ? def : 20;
}

export function computeScheduleTimes(count: number, startAt: Date): Date[] {
  const perHour = getUserHourlyLimit();
  const intervalMs = Math.ceil((60 * 60 * 1000) / perHour);
  const times: Date[] = [];
  for (let i = 0; i < count; i++) {
    times.push(new Date(startAt.getTime() + i * intervalMs));
  }
  return times;
}


