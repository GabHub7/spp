'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export function PaymentChart({ data }: { data: { label: string; total: number }[] }) {
  const currentMonth = new Date().getMonth()
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => (v >= 1000000 ? `${v / 1000000}jt` : v >= 1000 ? `${v / 1000}rb` : `${v}`)}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={42}
        />
        <Tooltip
          cursor={{ fill: 'var(--bg-tertiary)' }}
          contentStyle={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            fontSize: 13,
            boxShadow: 'var(--shadow-md)',
          }}
          labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          formatter={(value) => [formatCurrency(Number(value)), 'Pembayaran']}
        />
        <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={42}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === currentMonth ? 'var(--accent)' : 'var(--accent-2)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
