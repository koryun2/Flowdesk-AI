import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SectionHeading } from '../../components/ui'
import {
  ChartCard,
  ChartLegend,
  ChartWrap,
  LegendDot,
} from './DashboardPage.styles'

type VolumePoint = {
  day: string
  created: number
  resolved: number
}

type VolumeChartProps = {
  days: 7 | 30
  onDaysChange: (days: 7 | 30) => void
  ticketVolume: VolumePoint[]
}

export function VolumeChart({ days, onDaysChange, ticketVolume }: VolumeChartProps) {
  return (
    <ChartCard>
      <SectionHeading>
        <div>
          <h2>Ticket volume</h2>
          <p>Created and resolved over the last {days} days</p>
        </div>
        <select
          aria-label="Ticket volume timeframe"
          onChange={(event) => onDaysChange(Number(event.target.value) as 7 | 30)}
          value={days}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
      </SectionHeading>
      <ChartWrap>
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={ticketVolume}>
            <defs>
              <linearGradient id="createdFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.26} />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eef0f5" strokeDasharray="4 4" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="day"
              tick={{ fill: '#7c8497', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: '#7c8497', fontSize: 12 }}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                border: '1px solid #e5e7ef',
                borderRadius: '10px',
                boxShadow: '0 10px 30px rgba(30, 35, 55, .12)',
                fontSize: '12px',
              }}
            />
            <Area
              dataKey="created"
              fill="url(#createdFill)"
              name="Created"
              stroke="#4f46e5"
              strokeWidth={2.5}
              type="monotone"
            />
            <Area
              dataKey="resolved"
              fill="transparent"
              name="Resolved"
              stroke="#16a085"
              strokeDasharray="5 4"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrap>
      <ChartLegend>
        <span>
          <LegendDot $tone="indigo" /> Created
        </span>
        <span>
          <LegendDot $tone="emerald" /> Resolved
        </span>
      </ChartLegend>
    </ChartCard>
  )
}
