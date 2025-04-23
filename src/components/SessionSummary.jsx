// src/components/SessionSummary.jsx
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export default function SessionSummary() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [routeStats, setRouteStats] = useState([]);
  const [totalRoutes, setTotalRoutes] = useState({ completed: 0, attempted: 0, additional: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch session data
  useEffect(() => {
    async function fetchSessionData() {
      try {
        setLoading(true);
        
        // Fetch session details with gym info
        const { data: sessionDetails, error: sessionError } = await supabase
          .from('climbing_sessions')
          .select(`
            id,
            date,
            notes,
            gyms (name, location)
          `)
          .eq('id', sessionId)
          .single();
          
        if (sessionError) throw sessionError;
        setSessionData(sessionDetails);
        
        // Fetch session routes with route category info
        const { data: routesData, error: routesError } = await supabase
          .from('session_routes')
          .select(`
            id,
            unique_routes_completed,
            unique_routes_attempted,
            additional_attempts,
            route_category:route_category_id (
              id,
              name,
              difficulty_index,
              notes
            )
          `)
          .eq('session_id', sessionId);
          
        if (routesError) throw routesError;
        
        // Process routes data
        if (routesData) {
          // Calculate totals
          const totals = {
            completed: 0,
            attempted: 0,
            additional: 0
          };
          
          // Transform data for display
          const formattedRouteStats = routesData
            .filter(route => route.route_category) // Filter out any routes with missing category data
            .map(route => {
              totals.completed += route.unique_routes_completed || 0;
              totals.attempted += route.unique_routes_attempted || 0;
              totals.additional += route.additional_attempts || 0;
              
              return {
                categoryId: route.route_category.id,
                categoryName: route.route_category.name,
                difficultyIndex: route.route_category.difficulty_index,
                notes: route.route_category.notes,
                completed: route.unique_routes_completed || 0,
                attempted: route.unique_routes_attempted || 0,
                additional: route.additional_attempts || 0,
                successRate: route.unique_routes_attempted > 0 
                  ? ((route.unique_routes_completed / route.unique_routes_attempted) * 100).toFixed(1)
                  : 0
              };
            })
            .sort((a, b) => a.difficultyIndex - b.difficultyIndex);
          
          setRouteStats(formattedRouteStats);
          setTotalRoutes(totals);
        }
      } catch (error) {
        console.error('Error fetching session summary:', error);
        setError('Failed to load session summary');
      } finally {
        setLoading(false);
      }
    }
    
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Handle session deletion
  const handleDeleteSession = async () => {
    try {
      setDeleteLoading(true);
      
      // First, delete all session routes (due to foreign key constraints)
      const { error: routesError } = await supabase
        .from('session_routes')
        .delete()
        .eq('session_id', sessionId);
        
      if (routesError) throw routesError;
      
      // Then delete the session itself
      const { error: sessionError } = await supabase
        .from('climbing_sessions')
        .delete()
        .eq('id', sessionId);
        
      if (sessionError) throw sessionError;
      
      // Navigate back to dashboard after successful deletion
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session. Please try again.');
      setShowDeleteDialog(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Prepare data for difficulty distribution pie chart
  const difficultyDistributionData = routeStats
    .filter(stat => stat.completed > 0)
    .map(stat => ({
      name: stat.categoryName,
      value: stat.completed,
      difficultyIndex: stat.difficultyIndex
    }));
  
  // Chart colors based on difficulty (harder routes get darker colors)
  const COLORS = ['#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658', '#ff9800', '#ff5722', '#e91e63'];
  
  if (loading) {
    return <div className="text-center p-8">Loading session summary...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error}</p>
        <Link 
          to="/" 
          className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {sessionData && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Session Summary</h2>
          <p className="text-lg">
            {sessionData.gyms ? `${sessionData.gyms.name} - ${sessionData.gyms.location}` : 'Unknown Gym'}
          </p>
          <p className="text-gray-600">
            {format(parseISO(sessionData.date), 'MMMM d, yyyy')}
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-green-700">Routes Completed</h3>
          <p className="text-3xl font-bold text-green-700 mt-2">{totalRoutes.completed}</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-blue-700">Routes Attempted</h3>
          <p className="text-3xl font-bold text-blue-700 mt-2">{totalRoutes.attempted}</p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg shadow text-center">
          <h3 className="text-lg font-semibold text-orange-700">Additional Attempts</h3>
          <p className="text-3xl font-bold text-orange-700 mt-2">{totalRoutes.additional}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Routes by Difficulty</h3>
          {difficultyDistributionData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {difficultyDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[Math.min(entry.difficultyIndex - 1, COLORS.length - 1)]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} routes`, 'Completed']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No routes completed in this session.
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Success Rate</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {totalRoutes.attempted > 0 
                  ? `${((totalRoutes.completed / totalRoutes.attempted) * 100).toFixed(1)}%` 
                  : 'N/A'}
              </p>
              <p className="text-gray-500 mt-2">
                {totalRoutes.completed} completed out of {totalRoutes.attempted} attempted
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Routes Detail</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Route
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attempted
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Additional
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {routeStats.length > 0 ? (
                routeStats.map((route) => (
                  <tr key={route.categoryId}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{route.categoryName}</div>
                      {route.notes && (
                        <div className="text-xs text-gray-500">{route.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {route.difficultyIndex}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {route.completed}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {route.attempted}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                      {route.additional}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className={`text-sm font-medium ${
                        route.successRate > 75 
                          ? 'text-green-600' 
                          : route.successRate > 50 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`}>
                        {route.successRate}%
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                    No route data available for this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {sessionData && sessionData.notes && (
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold mb-2">Session Notes</h3>
          <p className="text-gray-700 whitespace-pre-line">{sessionData.notes}</p>
        </div>
      )}
      
      <div className="flex gap-4">
        <Link
          to="/"
          className="px-6 py-2 bg-gray-200 rounded-lg"
        >
          Back to Dashboard
        </Link>
        <Link
          to={`/session/${sessionId}`}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg"
        >
          Continue Session
        </Link>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Delete Session
        </button>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Session</h3>
            <p className="mb-6">
              Are you sure you want to delete this session? This action cannot be undone and all your climbing data for this session will be permanently removed.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}