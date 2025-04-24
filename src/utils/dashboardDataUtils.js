// src/utils/dashboardDataUtils.js
import { parseISO, format, getDay } from 'date-fns';

/**
 * Process route categories data into a lookup map
 */
export function processRouteCategories(categoriesData) {
  const categoriesMap = {};
  categoriesData.forEach(category => {
    categoriesMap[category.id] = category;
  });
  return categoriesMap;
}

/**
 * Process session data to extract progress data, weekday counts, and difficulty distribution
 */
export function processSessionData(allSessionsData, categoriesMap) {
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

  return {
    progressData: formattedProgressData,
    dayOfWeekCounts,
    difficultyCount
  };
}

/**
 * Process difficulty distribution data
 */
export function processDifficultyDistribution(difficultyCount) {
  return Object.values(difficultyCount)
    .sort((a, b) => a.difficulty - b.difficulty);
}

/**
 * Process weekday data for radar chart
 */
export function processWeekdayData(dayOfWeekCounts) {
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
    day.fullMark = maxAvg > 0 ? Math.ceil(maxAvg * 1.2) : 10; // Set scale slightly above max
  });

  return formattedWeekdayData;
}

/**
 * Process data for stacked bar chart
 */
export function processStackedBarData(allSessionsData, categoriesMap) {
  const progressByDateAndDifficulty = {};

  allSessionsData.forEach(session => {
    const dateStr = session.date;
    const dateObj = parseISO(dateStr);
    const gymName = session.gyms ? `${session.gyms.name} - ${session.gyms.location}` : 'Unknown Gym';

    if (!progressByDateAndDifficulty[dateStr]) {
      progressByDateAndDifficulty[dateStr] = {
        date: dateStr,
        formattedDate: format(dateObj, 'MMM d'),
        gymName: gymName,
        sessionId: session.id, // Store session ID for navigation
        difficultyMap: {},
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

            // Store using the difficulty index as the key
            if (!progressByDateAndDifficulty[dateStr][difficultyIndex]) {
              progressByDateAndDifficulty[dateStr][difficultyIndex] = 0;
            }
            progressByDateAndDifficulty[dateStr][difficultyIndex] += completedCount;

            // Store mapping from difficulty index to category id for tooltip display
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

  return Object.values(progressByDateAndDifficulty)
    .sort((a, b) => a.date.localeCompare(b.date));
}