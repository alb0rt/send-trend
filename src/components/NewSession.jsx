// src/components/NewSession.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function NewSession() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState('');
  const [showNewGymForm, setShowNewGymForm] = useState(false);
  const [newGym, setNewGym] = useState({ name: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  // Fetch existing gyms on component mount
  useEffect(() => {
    async function fetchGyms() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('gyms')
          .select('id, name, location')
          .order('name');
          
        if (error) throw error;
        
        setGyms(data || []);
        if (data && data.length > 0) {
          setSelectedGym(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching gyms:', error);
        setError('Failed to load gyms');
      } finally {
        setLoading(false);
      }
    }
    
    fetchGyms();
  }, []);

  // Handle creating a new gym
  const handleNewGymSubmit = async (e) => {
    e.preventDefault();
    
    if (!newGym.name || !newGym.location) {
      setError('Gym name and location are required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Insert new gym
      const { data, error } = await supabase
        .from('gyms')
        .insert([{ name: newGym.name, location: newGym.location }])
        .select();
        
      if (error) throw error;
      
      // Update local state
      if (data && data.length > 0) {
        setGyms([...gyms, data[0]]);
        setSelectedGym(data[0].id);
        setShowNewGymForm(false);
        setNewGym({ name: '', location: '' });
      }
    } catch (error) {
      console.error('Error creating gym:', error);
      setError('Failed to create new gym');
    } finally {
      setLoading(false);
    }
  };

  // Handle session creation
  const handleCreateSession = async () => {
    if (!selectedGym) {
      setError('Please select a gym');
      return;
    }
    
    try {
      setLoading(true);
      
      // Get user ID (current implementation has a bug)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Create new session
      const { data, error } = await supabase
        .from('climbing_sessions')
        .insert([{
          user_id: user.id,
          gym_id: selectedGym,
          date
        }])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Navigate to session tracking page
        navigate(`/session/${data[0].id}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create climbing session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Start New Climbing Session</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
      
      {!showNewGymForm ? (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <label className="block text-gray-700 mb-2">Gym</label>
            <button
              type="button"
              onClick={() => setShowNewGymForm(true)}
              className="text-blue-500 text-sm"
            >
              Add New Gym
            </button>
          </div>
          
          <select
            value={selectedGym}
            onChange={(e) => setSelectedGym(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
            disabled={loading || gyms.length === 0}
          >
            {gyms.length === 0 && (
              <option value="">No gyms available</option>
            )}
            
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name} - {gym.location}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <form onSubmit={handleNewGymSubmit} className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Add New Gym</h3>
          
          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Gym Name</label>
            <input
              type="text"
              value={newGym.name}
              onChange={(e) => setNewGym({ ...newGym, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Central Rock"
            />
          </div>
          
          <div className="mb-3">
            <label className="block text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={newGym.location}
              onChange={(e) => setNewGym({ ...newGym, location: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Glastonbury"
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowNewGymForm(false)}
              className="px-4 py-2 bg-gray-200 rounded-lg"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Gym'}
            </button>
          </div>
        </form>
      )}
      
      <button
        onClick={handleCreateSession}
        disabled={loading || !selectedGym}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg mt-4"
      >
        {loading ? 'Creating...' : 'Start Session'}
      </button>
    </div>
  );
}