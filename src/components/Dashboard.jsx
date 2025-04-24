// src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { subDays, subYears, format, parseISO } from 'date-fns';

// Import chart components
import ActivityCalendar from './dashboard/ActivityCalendar';
import ClimbingProgressChart from './dashboard/ClimbingProgressChart';
import WeekdayRadarChart from './dashboard/WeekdayRadarChart';
import DifficultyBarChart from './dashboard/DifficultyBarChart';

// Import data utilities
import { 
  processSessionData, 
  processRouteCategories, 
  processDifficultyDistribution,
  processWeekdayData,
  processStackedBarData
} from '../utils/dashboardDataUtils';

export default function Dashboard() {
  const [recentSessions, setRecentSessions] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState([]);
  const [weekdayData, setWeekdayData] = useState([]);
  const [stackedBarData, setStackedBarData] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('365'); // Default to 1 year

  // Fetch data on component mount and when timeRange changes
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);

        // Calculate the date range
        let startDate;

        if (timeRange === 'all') {
          // Set a very old date for "all time" (e.g., 50 years ago)
          startDate = subYears(new Date(), 50).toISOString().split('T')[0];
        } else {
          // Convert timeRange to number of days and subtract from current date
          startDate = subDays(new Date(), parseInt(timeRange)).toISOString().split('T')[0];
        }

        // Get the current user ID
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch recent sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('climbing_sessions')
          .select(`
            id,
            date,
            gyms (name, location)
          `)
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date', { ascending: false })
          .limit(5);

        if (sessionsError) throw sessionsError;
        setRecentSessions(sessionsData || []);

        // Fetch all sessions in the time range with their routes
        const { data: allSessionsData, error: allSessionsError } = await supabase
          .from('climbing_sessions')
          .select(`
            id,
            date,
            session_routes (
              route_category_id,
              unique_routes_completed,
              unique_routes_attempted,
              additional_attempts
            ),
            gyms (
              id,
              name,
              location
            )
          `)
          .eq('user_id', user.id)
          .gte('date', startDate)
          .order('date');

        if (allSessionsError) throw allSessionsError;

        // Fetch all route categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('route_categories')
          .select('id, gym_id, name, difficulty_index, notes');

        if (categoriesError) throw categoriesError;

        // Process data for state updates
        const categoriesMap = processRouteCategories(categoriesData);
        setCategoriesMap(categoriesMap);

        const { progressData, dayOfWeekCounts, difficultyCount } = processSessionData(
          allSessionsData, 
          categoriesMap
        );
        
        setProgressData(progressData);
        
        const formattedDifficultyData = processDifficultyDistribution(difficultyCount);
        setDifficultyDistribution(formattedDifficultyData);
        
        const formattedWeekdayData = processWeekdayData(dayOfWeekCounts);
        setWeekdayData(formattedWeekdayData);
        
        const formattedStackedBarData = processStackedBarData(
          allSessionsData, 
          categoriesMap
        );
        setStackedBarData(formattedStackedBarData);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [timeRange]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Your Climbing Dashboard</h2>
        <div className="flex items-center gap-3">
          <div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
              <option value="730">Last 2 years</option>
              <option value="all">All time</option>
            </select>
          </div>
          <Link
            to="/new-session"
            className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium"
          >
            Start New Session
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading your climbing data...</div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <>
          {/* Calendar Heatmap */}
          <ActivityCalendar 
            progressData={progressData} 
            timeRange={timeRange} 
          />

          {/* Stacked Bar Chart - Routes by Difficulty Over Time */}
          <ClimbingProgressChart 
            stackedBarData={stackedBarData} 
            categoriesMap={categoriesMap} 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Routes by Day of Week (Radar Chart) */}
            <WeekdayRadarChart weekdayData={weekdayData} />

            {/* Routes by Difficulty (Bar Chart) */}
            <DifficultyBarChart difficultyDistribution={difficultyDistribution} />
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
            {recentSessions.length > 0 ? (
              <ul className="divide-y">
                {recentSessions.map(session => (
                  <li key={session.id} className="py-3">
                    <Link
                      to={`/summary/${session.id}`}
                      className="flex justify-between items-center hover:bg-gray-50 p-2 rounded"
                    >
                      <div>
                        <span className="font-medium">
                          {session.gyms ? `${session.gyms.name} - ${session.gyms.location}` : 'Unknown Gym'}
                        </span>
                        <span className="block text-sm text-gray-500">
                          {format(parseISO(session.date), 'MMMM d, yy')}
                        </span>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No recent climbing sessions found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}