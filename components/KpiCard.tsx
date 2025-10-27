export function KpiCard({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-center">
      <div className="text-2xl font-semibold">{value}{suffix ? suffix : ''}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}


