// src/components/dashboard/ClimbingProgressChart.jsx
import { useNavigate } from 'react-router-dom';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function ClimbingProgressChart({ stackedBarData, categoriesMap }) {
  // Add navigate hook for routing
  const navigate = useNavigate();

  // Handle click on a bar to navigate to session summary
  const handleBarClick = (data) => {
    if (data && data.activeLabel) {
      // Find session ID for this data point
      const dateData = stackedBarData.find(d => d.formattedDate === data.activeLabel);
      if (dateData && dateData.sessionId) {
        navigate(`/summary/${dateData.sessionId}`);
      }
    }
  };

  // Custom tooltip for the stacked bar chart
  const CustomStackedBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Find the data for the current date label
      const dateData = stackedBarData.find(d => d.formattedDate === label);

      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          {/* Display gym information if available */}
          {dateData?.gymName && (
            <p className="text-xs text-gray-600 mb-1">{dateData.gymName}</p>
          )}
          {payload.map((entry, index) => {
            // Only show tooltip entries for the Bar data (which are numeric difficulty indices)
            if (!isNaN(parseInt(entry.dataKey))) {
              // Find the corresponding category name using categoriesMap
              const categoryId = dateData?.difficultyMap?.[entry.dataKey];
              const category = categoriesMap?.[categoryId];
              const displayName = category?.name || `Difficulty ${entry.dataKey}`;

              return (
                <p
                  key={`item-${index}`}
                  className="text-sm"
                  style={{ color: entry.color }}
                >
                  {displayName}: {entry.value}
                </p>
              );
            }
            // Also display average difficulty in the tooltip if it's in the payload
            if (entry.dataKey === 'averageDifficulty') {
              return (
                <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
                  {entry.name}: {entry.value}
                </p>
              );
            }
            return null; // Hide other payload entries
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4">Your Recent Sessions</h3>
      {stackedBarData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={stackedBarData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={handleBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="formattedDate" />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#2563eb"
                label={{
                  value: 'Routes Completed',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#16a34a"
                domain={[0, 'dataMax + 1']}
                label={{
                  value: 'Average Difficulty',
                  angle: -90,
                  position: 'insideRight',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomStackedBarTooltip />} />
              <Legend formatter={(value) => {
                // For legend, show category name if available, otherwise difficulty index
                if (Object.keys(categoriesMap).length > 0 && stackedBarData.length > 0) {
                  const sampleDataPoint = stackedBarData.find(d => d.difficultyMap?.[value] !== undefined);
                  if (sampleDataPoint) {
                    const categoryId = sampleDataPoint.difficultyMap[value];
                    const category = categoriesMap[categoryId];
                    return category?.name || `Difficulty ${value}`;
                  }
                }
                // Fallback if data or categoriesMap is not ready
                return `Difficulty ${value}`;
              }}/>

              {/* Dynamic Bars based on difficulty indices */}
              {stackedBarData.length > 0 && Object.keys(stackedBarData[0] || {})
                .filter(key => !isNaN(parseInt(key)) && parseInt(key) > 0)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((difficultyIndex, index) => (
                  <Bar
                    key={difficultyIndex}
                    dataKey={difficultyIndex}
                    yAxisId="left"
                    stackId="a"
                    name={difficultyIndex}
                    fill={["#8884d8", "#82ca9d", "#ffc658", "#a4de6c", "#d0ed57", "#ff8042", "#f7a7a3", "#a3c3f7", "#a3f7c3", "#f7eda3"][index % 10]}
                    className="cursor-pointer"

                  />
                ))}

              {/* Line for average difficulty */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageDifficulty"
                name="Avg Difficulty"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
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