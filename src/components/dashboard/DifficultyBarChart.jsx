// src/components/dashboard/DifficultyBarChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function DifficultyBarChart({ difficultyDistribution }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Routes by Difficulty</h3>
      {difficultyDistribution.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={difficultyDistribution}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="difficultyLabel" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Routes Completed" fill="#8884d8" />
            </BarChart>
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