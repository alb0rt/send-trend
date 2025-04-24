// src/components/dashboard/WeekdayRadarChart.jsx
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function WeekdayRadarChart({ weekdayData }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Average Routes by Day of Week</h3>
      {weekdayData.length > 0 && weekdayData.some(d => d.value > 0) ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="70%"
              data={weekdayData}
            >
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis
                domain={[0, 'auto']}
                tickCount={5}
              />
              <Radar
                name="Average Routes"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip formatter={(value) => [`${value} routes`, 'Average']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No climbing data available for this time range.
        </div>
      )}
    </div>
  );
}