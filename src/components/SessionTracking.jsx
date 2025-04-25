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
  const [sessionRoutes, setSessionRoutes] = useState({});
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
      
      // Update local state
      if (data && data.length > 0) {
        setRouteCategories([...routeCategories, data[0]]);
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
    return <div className="w-full px-4 py-6 text-center">Loading session data...</div>;
  }

  if (error) {
    return (
      <div className="w-full px-4 py-6 text-center">
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
    <div className="max-w-lg mx-auto px-2 py-4">
      {sessionDetails && (
        <div className="mb-4">
          <h2 className="text-xl font-bold">Climbing Session</h2>
          <p className="text-sm text-gray-600">
            {sessionDetails.gyms.name} - {sessionDetails.gyms.location}
          </p>
          <p className="text-sm text-gray-600">
            {format(new Date(sessionDetails.date), 'MMMM d, yyyy')}
          </p>
        </div>
      )}
      
      <div className="bg-white p-3 rounded-lg shadow-md w-full mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Routes</h3>
          <button
            onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
            className="text-blue-500 text-xs px-2 py-1 border border-blue-500 rounded-md"
          >
            {showNewCategoryForm ? 'Cancel' : 'Add Route'}
          </button>
        </div>
        
        {showNewCategoryForm && (
          <form onSubmit={handleAddCategory} className="mb-4 p-3 border rounded-lg bg-gray-50">
            <div className="mb-2">
              <label className="block text-gray-700 text-sm mb-1">Category Name</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
                placeholder="V0 or Blue"
              />
            </div>
            
            <div className="mb-2">
              <label className="block text-gray-700 text-sm mb-1">Difficulty (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={newCategory.difficulty_index}
                onChange={(e) => setNewCategory({ ...newCategory, difficulty_index: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            
            <div className="mb-3">
              <label className="block text-gray-700 text-sm mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={newCategory.notes}
                onChange={(e) => setNewCategory({ ...newCategory, notes: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
                placeholder="Easy - Medium"
              />
            </div>
            
            <button
              type="submit"
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded"
            >
              Add Category
            </button>
          </form>
        )}
        
        {/* Routes Table - Mobile Optimized */}
        <div className="w-full">
          {/* Column Headers */}
          <div className="grid grid-cols-4 gap-1 py-1 bg-gray-100 rounded-t-lg mb-1">
            <div className="col-span-1 text-xs font-medium text-gray-700 pl-2">Route</div>
            <div className="col-span-1 text-xs font-medium text-gray-700 text-center">Comp</div>
            <div className="col-span-1 text-xs font-medium text-gray-700 text-center">Attempt</div>
            <div className="col-span-1 text-xs font-medium text-gray-700 text-center">Extra</div>
          </div>
          
          {/* Route Rows */}
          {routeCategories.map((category) => {
            const routeData = sessionRoutes[category.id] || {
              unique_routes_completed: 0,
              unique_routes_attempted: 0,
              additional_attempts: 0
            };
            
            return (
              <div key={category.id} className="grid grid-cols-4 gap-1 items-center py-2 border-b">
                {/* Route Name Column */}
                <div className="col-span-1 pr-1 pl-2">
                  <div className="font-medium text-sm truncate">{category.name}</div>
                  {category.notes && (
                    <div className="text-xs text-gray-500 truncate">{category.notes}</div>
                  )}
                </div>
                
                {/* Completed Column */}
                <div className="col-span-1 flex flex-col items-center">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => updateRouteCount(
                        category.id, 
                        'unique_routes_completed', 
                        (routeData.unique_routes_completed || 0) - 1
                      )}
                      className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      <span className="text-lg">-</span>
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{routeData.unique_routes_completed || 0}</span>
                    <button
                      onClick={() => updateRouteCount(
                        category.id, 
                        'unique_routes_completed', 
                        (routeData.unique_routes_completed || 0) + 1
                      )}
                      className="w-7 h-7 bg-green-500 text-white rounded-full flex items-center justify-center"
                    >
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>
                
                {/* Attempted Column */}
                <div className="col-span-1 flex flex-col items-center">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => updateRouteCount(
                        category.id, 
                        'unique_routes_attempted', 
                        (routeData.unique_routes_attempted || 0) - 1
                      )}
                      className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      <span className="text-lg">-</span>
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{routeData.unique_routes_attempted || 0}</span>
                    <button
                      onClick={() => updateRouteCount(
                        category.id, 
                        'unique_routes_attempted', 
                        (routeData.unique_routes_attempted || 0) + 1
                      )}
                      className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center"
                    >
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>
                
                {/* Extra Attempts Column */}
                <div className="col-span-1 flex flex-col items-center">
                  <div className="flex items-center justify-center space-x-1">
                    <button
                      onClick={() => updateRouteCount(
                        category.id, 
                        'additional_attempts', 
                        (routeData.additional_attempts || 0) - 1
                      )}
                      className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center"
                    >
                      <span className="text-lg">-</span>
                    </button>
                    <span className="text-sm font-medium w-5 text-center">{routeData.additional_attempts || 0}</span>
                    <button
                      onClick={() => updateRouteCount(
                        category.id, 
                        'additional_attempts', 
                        (routeData.additional_attempts || 0) + 1
                      )}
                      className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center"
                    >
                      <span className="text-lg">+</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          
          {routeCategories.length === 0 && (
            <div className="py-3 text-center text-sm text-gray-500">
              No route categories. Add one to begin tracking.
            </div>
          )}
        </div>
      </div>
      
      {/* Notes Section */}
      <div className="bg-white p-3 rounded-lg shadow-md w-full mb-4">
        <label className="block text-gray-700 text-sm mb-1">Session Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          className="w-full px-3 py-2 border rounded-lg text-sm h-24"
          placeholder="Add notes about your session..."
        />
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-gray-300 rounded-lg text-sm"
        >
          Cancel
        </button>
        <button
          onClick={endSession}
          className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm"
        >
          End Session
        </button>
      </div>
    </div>
  );
}