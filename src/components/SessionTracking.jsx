// src/components/SessionTracking.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { format } from 'date-fns';

export default function SessionTracking() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  const [sessionDetails, setSessionDetails] = useState(null);
  const [routeCategories, setRouteCategories] = useState([]);
  const [sessionRoutes, setSessionRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    difficulty_index: 1,
    notes: ''
  });

  // Fetch session details and route categories
  useEffect(() => {
    async function fetchSessionData() {
      try {
        setLoading(true);
        
        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('climbing_sessions')
          .select('*, gyms(name, location)')
          .eq('id', sessionId)
          .single();
          
        if (sessionError) throw sessionError;
        setSessionDetails(sessionData);
        setNotes(sessionData.notes || '');
        
        // Fetch route categories for this gym
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('route_categories')
          .select('*')
          .eq('gym_id', sessionData.gym_id)
          .order('difficulty_index');
          
        if (categoriesError) throw categoriesError;
        setRouteCategories(categoriesData || []);
        
        // Fetch existing session routes
        const { data: routesData, error: routesError } = await supabase
          .from('session_routes')
          .select('*')
          .eq('session_id', sessionId);
          
        if (routesError) throw routesError;
        
        // Convert to a map for easier access
        const routesMap = {};
        (routesData || []).forEach(route => {
          routesMap[route.route_category_id] = route;
        });
        
        setSessionRoutes(routesMap);
      } catch (error) {
        console.error('Error fetching session data:', error);
        setError('Failed to load session data');
      } finally {
        setLoading(false);
      }
    }
    
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Add a new route category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategory.name || !sessionDetails) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Add new route category
      const { data, error } = await supabase
        .from('route_categories')
        .insert([{
          gym_id: sessionDetails.gym_id,
          name: newCategory.name,
          difficulty_index: parseInt(newCategory.difficulty_index),
          notes: newCategory.notes || null
        }])
        .select();
        
      if (error) throw error;
      
      // Update local state and re-sort categories
      if (data && data.length > 0) {
        const updatedCategories = [...routeCategories, data[0]];
         const sortedUpdatedCategories = updatedCategories.sort((a, b) => {
            const diffA = a.difficulty_index ?? Infinity;
            const diffB = b.difficulty_index ?? Infinity;
            return diffA - diffB;
         });
        setRouteCategories(sortedUpdatedCategories); // Set the newly sorted categories
        setShowNewCategoryForm(false);
        setNewCategory({ name: '', difficulty_index: 1, notes: '' });
      }
      
    } catch (error) {
      console.error('Error adding route category:', error);
      setError('Failed to add route category');
    } finally {
      setLoading(false);
    }
  };

  // Update route counts
  const updateRouteCount = async (categoryId, field, value) => {
    try {
      // Get current route data
      const currentRouteData = sessionRoutes[categoryId] || {
        session_id: sessionId,
        route_category_id: categoryId,
        unique_routes_completed: 0,
        unique_routes_attempted: 0,
        additional_attempts: 0
      };
      
      // Update the specified field
      const updatedData = {
        ...currentRouteData,
        [field]: Math.max(0, value) // Ensure no negative values
      };
      
      // If entry exists, update it, otherwise insert
      const { data, error } = currentRouteData.id 
        ? await supabase
            .from('session_routes')
            .update(updatedData)
            .eq('id', currentRouteData.id)
            .select()
        : await supabase
            .from('session_routes')
            .insert([updatedData])
            .select();
            
      if (error) throw error;
      
      // Update local state
      if (data && data.length > 0) {
        setSessionRoutes({
          ...sessionRoutes,
          [categoryId]: data[0]
        });
      }
    } catch (error) {
      console.error('Error updating route count:', error);
      setError('Failed to update climb data');
    }
  };

  // Save session notes
  const saveNotes = async () => {
    try {
      const { error } = await supabase
        .from('climbing_sessions')
        .update({ notes })
        .eq('id', sessionId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error saving notes:', error);
      setError('Failed to save notes');
    }
  };

  // End the session and go to summary
  const endSession = async () => {
    await saveNotes();
    navigate(`/summary/${sessionId}`);
  };

  if (loading && !sessionDetails) {
    return <div className="text-center p-8">Loading session data...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      {sessionDetails && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Climbing Session</h2>
          <p className="text-gray-600">
            {sessionDetails.gyms.name} - {sessionDetails.gyms.location}
          </p>
          <p className="text-gray-600">
            {format(new Date(sessionDetails.date), 'MMMM d, yyyy')}
          </p>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Routes</h3>
          <button
            onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
            className="text-blue-500 text-sm"
          >
            {showNewCategoryForm ? 'Cancel' : 'Add New Route Category'}
          </button>
        </div>
        
        {showNewCategoryForm && (
          <form onSubmit={handleAddCategory} className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">Category Name</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="V0 or Blue"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">Difficulty Index (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newCategory.difficulty_index}
                onChange={(e) => setNewCategory({ ...newCategory, difficulty_index: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-gray-700 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={newCategory.notes}
                onChange={(e) => setNewCategory({ ...newCategory, notes: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="V0-V2 or additional context"
              />
            </div>
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Add Category
            </button>
          </form>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Route</th>
                <th className="px-4 py-2 text-center">Completed</th>
                <th className="px-4 py-2 text-center">Attempted</th>
                <th className="px-4 py-2 text-center">Extra Attempts</th>
              </tr>
            </thead>
            <tbody>
              {routeCategories.map((category) => {
                const routeData = sessionRoutes[category.id] || {
                  unique_routes_completed: 0,
                  unique_routes_attempted: 0,
                  additional_attempts: 0
                };
                
                return (
                  <tr key={category.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{category.name}</div>
                      {category.notes && (
                        <div className="text-xs text-gray-500">{category.notes}</div>
                      )}
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex justify-center items-center space-x-2">
                        <button
                          onClick={() => updateRouteCount(
                            category.id, 
                            'unique_routes_completed', 
                            (routeData.unique_routes_completed || 0) - 1
                          )}
                          className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{routeData.unique_routes_completed || 0}</span>
                        <button
                          onClick={() => updateRouteCount(
                            category.id, 
                            'unique_routes_completed', 
                            (routeData.unique_routes_completed || 0) + 1
                          )}
                          className="w-8 h-8 bg-green-500 text-white rounded flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex justify-center items-center space-x-2">
                        <button
                          onClick={() => updateRouteCount(
                            category.id, 
                            'unique_routes_attempted', 
                            (routeData.unique_routes_attempted || 0) - 1
                          )}
                          className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{routeData.unique_routes_attempted || 0}</span>
                        <button
                          onClick={() => updateRouteCount(
                            category.id, 
                            'unique_routes_attempted', 
                            (routeData.unique_routes_attempted || 0) + 1
                          )}
                          className="w-8 h-8 bg-blue-500 text-white rounded flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="flex justify-center items-center space-x-2">
                        <button
                          onClick={() => updateRouteCount(
                            category.id, 
                            'additional_attempts', 
                            (routeData.additional_attempts || 0) - 1
                          )}
                          className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{routeData.additional_attempts || 0}</span>
                        <button
                          onClick={() => updateRouteCount(
                            category.id, 
                            'additional_attempts', 
                            (routeData.additional_attempts || 0) + 1
                          )}
                          className="w-8 h-8 bg-orange-500 text-white rounded flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {routeCategories.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-center">
                    No route categories available. Add one to begin tracking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Session Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          className="w-full px-4 py-2 border rounded-lg h-32"
          placeholder="Add notes about your session..."
        />
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-300 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={endSession}
          className="px-6 py-2 bg-green-500 text-white rounded-lg"
        >
          End Session
        </button>
      </div>
    </div>
  );
}