// src/components/Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  format,
  subDays,
  parseISO,
  subYears,
  startOfWeek,
  addDays,
  eachDayOfInterval,
  getDay,
  isWithinInterval
} from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart, // Keep BarChart import if used elsewhere
  Bar,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart // Corrected: Import ComposedChart
} from 'recharts';

export default function Dashboard() {
  const [recentSessions, setRecentSessions] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState([]);
  const [weekdayData, setWeekdayData] = useState([]);
  const [stackedBarData, setStackedBarData] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({}); // Add state for categoriesMap
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

        // Create a map of route categories for easy lookup
        const categoriesMap = {};
        categoriesData.forEach(category => {
          categoriesMap[category.id] = category;
        });
        setCategoriesMap(categoriesMap); // Set categoriesMap to state

        // Process data for progress chart (routes completed by date)
        const progressByDate = {};
        const difficultyCount = {};

        // Track days of week
        const dayOfWeekCounts = [
          { name: 'Sunday', value: 0, count: 0, fill: '#FF5733' },
          { name: 'Monday', value: 0, count: 0, fill: '#FFC300' },
          { name: 'Tuesday', value: 0, count: 0, fill: '#36DBCA' },
          { name: 'Wednesday', value: 0, count: 0, fill: '#3498DB' },
          { name: 'Thursday', value: 0, count: 0, fill: '#9B59B6' },
          { name: 'Friday', value: 0, count: 0, fill: '#1ABC9C' },
          { name: 'Saturday', value: 0, count: 0, fill: '#2ECC71' }
        ];

        allSessionsData.forEach(session => {
          const dateStr = session.date;
          const dateObj = parseISO(dateStr);
          const gymName = session.gyms ? `${session.gyms.name} - ${session.gyms.location}` : 'Unknown Gym';

          if (!progressByDate[dateStr]) {
            progressByDate[dateStr] = {
              date: dateStr,
              dateObj: dateObj, // Store the actual date object for calendar heatmap
              totalCompleted: 0,
              averageDifficulty: 0,
              difficultySum: 0,
              routesWithDifficulty: 0,
              gymVisits: {}
            };
          }

          // Track gym visits
          progressByDate[dateStr].gymVisits[gymName] = true;

          // Process session routes
          if (session.session_routes) {
            session.session_routes.forEach(route => {
              if (route.unique_routes_completed > 0) {
                const completedCount = route.unique_routes_completed;
                progressByDate[dateStr].totalCompleted += completedCount;

                // Track routes by weekday
                const weekdayIndex = getDay(dateObj); // 0 = Sunday, 6 = Saturday
                dayOfWeekCounts[weekdayIndex].value += completedCount;
                dayOfWeekCounts[weekdayIndex].count += 1; // Count days for average calculation

                // Get difficulty info if available
                const category = categoriesMap[route.route_category_id];
                if (category && category.difficulty_index) {
                  progressByDate[dateStr].difficultySum += category.difficulty_index * completedCount;
                  progressByDate[dateStr].routesWithDifficulty += completedCount;

                  // Track difficulty distribution
                  const diffIndex = category.difficulty_index;
                  if (!difficultyCount[diffIndex]) {
                    difficultyCount[diffIndex] = {
                      difficulty: diffIndex,
                      difficultyLabel: category.name,
                      count: 0
                    };
                  }
                  difficultyCount[diffIndex].count += completedCount;
                }
              }
            });
          }
        });

        // Calculate average difficulty and format data for chart
        const formattedProgressData = Object.values(progressByDate).map(day => {
          if (day.routesWithDifficulty > 0) {
            day.averageDifficulty = +(day.difficultySum / day.routesWithDifficulty).toFixed(1);
          }

          // Count unique gyms visited
          day.gymCount = Object.keys(day.gymVisits).length;

          // Format date for display
          day.formattedDate = format(parseISO(day.date), 'MMM d');

          return day;
        }).sort((a, b) => a.date.localeCompare(b.date));

        setProgressData(formattedProgressData);

        // Format difficulty distribution data
        const formattedDifficultyData = Object.values(difficultyCount)
          .sort((a, b) => a.difficulty - b.difficulty);

        setDifficultyDistribution(formattedDifficultyData);

        // Process data for stacked bar chart (routes completed by date and difficulty index)
        const progressByDateAndDifficulty = {};

        allSessionsData.forEach(session => {
          const dateStr = session.date;
          const dateObj = parseISO(dateStr);
          const gymName = session.gyms ? `${session.gyms.name} - ${session.gyms.location}` : 'Unknown Gym';

          if (!progressByDateAndDifficulty[dateStr]) {
            progressByDateAndDifficulty[dateStr] = {
              date: dateStr,
              formattedDate: format(dateObj, 'MMM d'),
              gymName: gymName,  // Add gym information here
              difficultyMap: {},  // Maps the difficulty index to the category id
              totalDifficultySum: 0,
              totalRoutes: 0,
              averageDifficulty: 0
            };
          }

          if (session.session_routes) {
            session.session_routes.forEach(route => {
              if (route.unique_routes_completed > 0) {
                const completedCount = route.unique_routes_completed;
                const category = categoriesMap[route.route_category_id];

                if (category && category.difficulty_index) {
                  const difficultyIndex = category.difficulty_index;

                  // Store using the difficulty index as the key instead of the name
                  if (!progressByDateAndDifficulty[dateStr][difficultyIndex]) {
                    progressByDateAndDifficulty[dateStr][difficultyIndex] = 0;
                  }
                  progressByDateAndDifficulty[dateStr][difficultyIndex] += completedCount;

                  // Store the mapping from difficulty index to category id for tooltip display
                  progressByDateAndDifficulty[dateStr].difficultyMap[difficultyIndex] = route.route_category_id;

                  // Add to difficulty sum for average calculation
                  progressByDateAndDifficulty[dateStr].totalDifficultySum += (difficultyIndex * completedCount);
                  progressByDateAndDifficulty[dateStr].totalRoutes += completedCount;
                }
              }
            });
          }

          // Calculate average difficulty for each day
          if (progressByDateAndDifficulty[dateStr].totalRoutes > 0) {
            progressByDateAndDifficulty[dateStr].averageDifficulty =
              +(progressByDateAndDifficulty[dateStr].totalDifficultySum /
                progressByDateAndDifficulty[dateStr].totalRoutes).toFixed(1);
          }
        });

        const formattedStackedBarData = Object.values(progressByDateAndDifficulty)
          .sort((a, b) => a.date.localeCompare(b.date));

        setStackedBarData(formattedStackedBarData);


        // Calculate average routes per day of week
        const formattedWeekdayData = dayOfWeekCounts.map(day => {
          // Calculate average if we have data for this day
          if (day.count > 0) {
            day.value = +(day.value / day.count).toFixed(1);
          }
          return day;
        });

        // Set the max value for the radial chart scale
        const maxAvg = Math.max(...formattedWeekdayData.map(d => d.value));
        formattedWeekdayData.forEach(day => {
          day.fullMark = maxAvg > 0 ? Math.ceil(maxAvg * 1.2) : 10; // Set scale slightly above max for better visualization
        });

        // Update state with weekly data
        setWeekdayData(formattedWeekdayData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [timeRange]);

  // Generate calendar data for heatmap
  const calendarData = useMemo(() => {
    if (!progressData.length) return [];

    const today = new Date();
    let startDate;

    // Calculate start date based on time range
    if (timeRange === 'all') {
      // For "all time", use the earliest date in the data
      const firstDataDate = progressData.length > 0 ? progressData[0]?.dateObj : null;
      const oneYearAgo = subDays(today, 365); // Fallback to 1 year if no data or very old data
      startDate = firstDataDate || oneYearAgo;
    } else {
      // Use the start date from the selected time range
      startDate = subDays(today, parseInt(timeRange));
    }

    // For very short time ranges (less than 2 weeks), extend to show at least 2 weeks
    // for better visual context
    if (parseInt(timeRange) < 14 && timeRange !== 'all') {
      startDate = subDays(today, 14);
    }

    // Get all days in the interval
    const dateInterval = { start: startDate, end: today };

    // Group days by week for the calendar
    const weeks = [];
    let currentWeek = [];

    // Start from the beginning of the week containing startDate
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 }); // 0 = Sunday

    // Create array of all days
    for (let i = 0; i < 368; i++) { // Maximum 52 weeks (364 days) + buffer
      const day = addDays(weekStart, i);

      // Skip if beyond today
      if (day > today) break;

      // Skip if before startDate (unless it's part of the same week)
      if (day < startDate && getDay(day) !== 0) {
        // But keep days needed to fill out the first week
        if (i >= 7) continue;
      }

      // Create a new week array if this is the first day of week (Sunday)
      if (getDay(day) === 0) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        currentWeek = [];
      }

      // Find if there's data for this day
      const dayData = progressData.find(d =>
        d.dateObj &&
        d.dateObj.getFullYear() === day.getFullYear() &&
        d.dateObj.getMonth() === day.getMonth() &&
        d.dateObj.getDate() === day.getDate()
      );

      currentWeek.push({
        date: day,
        month: day.getMonth(),
        count: dayData?.totalCompleted || 0,
        formattedDate: format(day, 'MMM d')
      });
    }

    // Add the last week
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [progressData, timeRange]);

  // Generate monthly summary data for the month heatmap
  const monthlyData = useMemo(() => {
    if (!progressData.length) return [];

    // Only process if time range is 3+ months
    const isLongTimeRange = timeRange === 'all' || parseInt(timeRange) >= 90;
    if (!isLongTimeRange) return [];

    // Group data by month and year
    const monthMap = {};

    progressData.forEach(day => {
      if (!day.dateObj) return;

      const yearMonth = format(day.dateObj, 'yyyy-MM');
      const monthName = format(day.dateObj, 'MMM');

      if (!monthMap[yearMonth]) {
        monthMap[yearMonth] = {
          id: yearMonth,
          month: monthName,
          totalRoutes: 0,
          totalSessions: 0,
          days: 0
        };
      }

      monthMap[yearMonth].totalRoutes += day.totalCompleted || 0;
      monthMap[yearMonth].days += 1;
      monthMap[yearMonth].totalSessions += 1;
    });

    // Convert to array and sort chronologically
    return Object.values(monthMap)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(month => ({
        ...month,
        averagePerDay: +(month.totalRoutes / month.days).toFixed(1)
      }));
  }, [progressData, timeRange]);


  // Custom tooltip for the dual-axis line chart (Routes Completed and Average Difficulty Over Time)
  const CustomLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p
              key={`item-${index}`}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


    // Custom tooltip for the stacked bar chart (Routes by Difficulty Over Time)
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
          {/* Calendar Heatmap - Moved to top and made more compact */}
          <div className="bg-white p-3 rounded-lg shadow mb-4">
            <h3 className="text-md font-semibold mb-2">Climbing Activity</h3>
            {calendarData.length > 0 ? (
              <div className="overflow-x-auto pb-1">
                <div className="min-w-max">
                  {/* Week header row */}
                  <div className="flex">
                    <div className="w-8 text-right pr-1 text-xs text-gray-500"></div>
                    {calendarData.map((week, weekIndex) => {
                      // Get first day of the week for label
                      const firstDay = week[0]?.date;
                      // Format as "Jan 1" for first week of month or first week in view
                      const weekLabel = firstDay
                        ? (firstDay.getDate() <= 7 || weekIndex === 0 ? format(firstDay, 'MMM d') : format(firstDay, 'd'))
                        : '';

                      return (
                        <div key={`week-${weekIndex}`} className="w-3 text-center mx-px">
                          <div className="text-[7px] text-gray-400 truncate" title={weekLabel}>
                            {weekLabel.substring(0, 1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day rows - one for each day of week (Sunday, Monday, etc.) */}
                  {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
                    const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek];

                    return (
                      <div key={`day-${dayOfWeek}`} className="flex items-center h-3 mb-px">
                        <div className="w-8 text-right pr-1 text-[9px] text-gray-500">
                          {dayName}
                        </div>
                        <div className="flex">
                          {calendarData.map((week, weekIndex) => {
                            // Find the corresponding day in this week
                            const day = week.find(d => getDay(d.date) === dayOfWeek);

                            // If no matching day (could happen at edges of date range), render empty cell
                            if (!day) {
                              return <div key={`empty-${weekIndex}-${dayOfWeek}`} className="w-3 h-3 mx-px"></div>;
                            }

                            // Determine cell color based on count
                            let bgColor = 'bg-gray-100'; // Default empty

                            if (day.count > 0) {
                              if (day.count <= 3) bgColor = 'bg-green-200';
                              else if (day.count <= 6) bgColor = 'bg-green-300';
                              else if (day.count <= 10) bgColor = 'bg-green-400';
                              else bgColor = 'bg-green-500';
                            }

                            return (
                              <div
                                key={`day-${weekIndex}-${dayOfWeek}`}
                                className={`w-3 h-3 ${bgColor} rounded-[2px] mx-px relative group`}
                                title={`${day.formattedDate}: ${day.count} routes`}
                              >
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1 py-0.5 mb-0.5 whitespace-nowrap transition-opacity z-10">
                                  {day.formattedDate}: {day.count} routes
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Legend */}
                  <div className="flex justify-end mt-1">
                    <div className="flex items-center text-xs text-gray-500 gap-px">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-100 rounded-sm mr-px"></div>
                        <span className="text-[9px]">0</span>
                      </div>
                      <div className="flex items-center ml-1">
                        <div className="w-2 h-2 bg-green-200 rounded-sm mr-px"></div>
                        <span className="text-[9px]">1-3</span>
                      </div>
                      <div className="flex items-center ml-1">
                        <div className="w-2 h-2 bg-green-300 rounded-sm mr-px"></div>
                        <span className="text-[9px]">4-6</span>
                      </div>
                      <div className="flex items-center ml-1">
                        <div className="w-2 h-2 bg-green-400 rounded-sm mr-px"></div>
                        <span className="text-[9px]">7-10</span>
                      </div>
                      <div className="flex items-center ml-1">
                        <div className="w-2 h-2 bg-green-500 rounded-sm mr-px"></div>
                        <span className="text-[9px]">10+</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No climbing data available for this time range.
              </div>
            )}
          </div>

          {/* Stacked Bar Chart - Routes by Difficulty Over Time */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-semibold mb-4">Your Climbing Progress</h3>
            {stackedBarData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Corrected: Use ComposedChart */}
                  <ComposedChart
                    data={stackedBarData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
                    <Tooltip content={<CustomStackedBarTooltip categoriesMap={categoriesMap} stackedBarData={stackedBarData} />} />
                    <Legend formatter={(value) => {
                      // For legend, show category name if available, otherwise difficulty index
                      // Check if categoriesMap has been populated yet
                      if (Object.keys(categoriesMap).length > 0 && stackedBarData.length > 0) {
                          const sampleDataPoint = stackedBarData.find(d => d.difficultyMap?.[value] !== undefined);
                          if (sampleDataPoint) {
                              const categoryId = sampleDataPoint.difficultyMap[value];
                              const category = categoriesMap[categoryId];
                              return category?.name || `Difficulty ${value}`;
                          }
                      }
                      // Fallback if data or categoriesMap is not ready or doesn't contain the key
                      return `Difficulty ${value}`;
                    }}/>

                    {/* Dynamic Bars based on difficulty indices instead of names */}
                    {Object.keys(stackedBarData[0] || {})
                      .filter(key => !isNaN(parseInt(key)) && parseInt(key) > 0)
                      .sort((a, b) => parseInt(a) - parseInt(b))
                      .map((difficultyIndex, index) => (
                        <Bar
                          key={difficultyIndex}
                          dataKey={difficultyIndex}
                          yAxisId="left"
                          stackId="a"
                          name={difficultyIndex} // Use difficulty index as name for the Bar
                          fill={["#8884d8", "#82ca9d", "#ffc658", "#a4de6c", "#d0ed57", "#ff8042", "#f7a7a3", "#a3c3f7", "#a3f7c3", "#f7eda3"][index % 10]}
                        />
                      ))}

                    {/* Add line for average difficulty */}
                    <Line
                      yAxisId="right" // Assign to the right Y-axis
                      type="monotone"
                      dataKey="averageDifficulty"
                      name="Avg Difficulty" // Name for the legend and tooltip
                      stroke="#16a34a" // Color for the line
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


          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Routes by Day of Week (Radar Chart) */}
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

            {/* Routes by Difficulty (Bar Chart) */}
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