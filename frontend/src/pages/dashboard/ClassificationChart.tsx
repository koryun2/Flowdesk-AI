import { Sparkles } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { EmptyState, SectionHeading } from '../../components/ui'
import {
  AiQuality,
  CategoryList,
  ChartCard,
  DonutCenter,
  DonutChart,
  DonutLayout,
} from './DashboardPage.styles'

type CategoryBreakdown = {
  name: string
  value: number
  color: string
}

type ClassificationChartProps = {
  analyzed: number
  averageConfidence: number | null
  categoryBreakdown: CategoryBreakdown[]
}

export function ClassificationChart({
  analyzed,
  averageConfidence,
  categoryBreakdown,
}: ClassificationChartProps) {
  return (
    <ChartCard>
      <SectionHeading>
        <div>
          <h2>AI classification</h2>
          <p>Completed ticket analyses</p>
        </div>
      </SectionHeading>
      {analyzed ? (
        <>
          <DonutLayout>
            <DonutChart>
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={categoryBreakdown}
                    dataKey="value"
                    innerRadius={54}
                    outerRadius={74}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry) => (
                      <Cell fill={entry.color} key={entry.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <DonutCenter>
                <strong>{analyzed}</strong>
                <span>analyzed</span>
              </DonutCenter>
            </DonutChart>
            <CategoryList>
              {categoryBreakdown.map((category) => (
                <div key={category.name}>
                  <span>
                    <i style={{ backgroundColor: category.color }} />
                    {category.name}
                  </span>
                  <strong>{category.value}%</strong>
                </div>
              ))}
            </CategoryList>
          </DonutLayout>
          {averageConfidence !== null ? (
            <AiQuality>
              <Sparkles size={16} />
              <span>
                <strong>{Math.round(averageConfidence * 100)}%</strong> average confidence
              </span>
            </AiQuality>
          ) : null}
        </>
      ) : (
        <EmptyState
          description="Completed analyses will appear here after tickets are classified."
          title="No analyses yet"
        />
      )}
    </ChartCard>
  )
}
