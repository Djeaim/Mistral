'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Point = { day: string; emails_sent: number; opens: number; replies: number };

export function TrendChart({ data }: { data: Point[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="emails_sent" stroke="#0ea5e9" dot={false} name="Emails" />
          <Line type="monotone" dataKey="opens" stroke="#22c55e" dot={false} name="Opens" />
          <Line type="monotone" dataKey="replies" stroke="#f97316" dot={false} name="Replies" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


