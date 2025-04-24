// src/components/dashboard/ActivityCalendar.jsx
import { useMemo } from 'react';
import { format, subDays, startOfWeek, addDays, getDay } from 'date-fns';

export default function ActivityCalendar({ progressData, timeRange }) {
  // Generate calendar data for heatmap
  const calendarData = useMemo(() => {
    if (!progressData || !progressData.length) return [];

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

  return (
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
  );
}