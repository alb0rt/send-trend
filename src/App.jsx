// src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { registerListener } from './supabaseCleanup';

// Import components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NewSession from './components/NewSession';
import SessionTracking from './components/SessionTracking';
import SessionSummary from './components/SessionSummary';
import Navbar from './components/Navbar';
import ResetPasswordRequest from './components/ResetPasswordRequest';
import ResetPasswordConfirm from './components/ResetPasswordConfirm';


function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(null);

  useEffect(() => {
    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false); // Ensure loading is set to false
      }
    }

    initializeAuth();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session); // Log auth state changes for debugging
      setSession(session);
      setLoading(false); // Ensure loading is set to false after state change
    });

    // Clean up the listener on component unmount
    return () => {
      if (authListener) {
         authListener.subscription.unsubscribe();
      }
    };

  }, []); // Empty dependency array ensures this runs only once on mount


  // Function to check if user profile exists and create if it doesn't
  async function checkUserProfile(user) {
    try {
      // Log user data to help with debugging
      console.log('Checking profile for user:', user.id);
      console.log('User metadata:', user.user_metadata);

      // Check if user profile exists in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is expected if profile doesn't exist
        console.error('Error checking user profile:', error);
        return;
      }

      // Get avatar URL from multiple possible locations in Google auth data
      const avatarUrl = user.user_metadata?.avatar_url ||
                       user.user_metadata?.picture ||
                       '';

      if (!data) {
        // Profile doesn't exist, create it
        console.log('Creating new profile for user:', user.id);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              avatar_url: avatarUrl,
              created_at: new Date()
            }
          ]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
      } else {
        // Profile exists, but update it with latest Google data
        console.log('Updating existing profile for user:', user.id);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || data.full_name || '',
            avatar_url: avatarUrl || data.avatar_url || '',
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error updating user profile:', updateError);
        }
      }
    } catch (error) {
      console.error('Error in user profile check:', error);
    }
  }

  useEffect(() => {
    // Set a timeout to exit loading state if it takes too long
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout reached, forcing exit from loading state');
        setLoading(false);
      }
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(loadingTimeout);
  }, [loading]);

  // Note: This useEffect is likely not needed for auth but keeping it if it's for dashboard data loading
  // useEffect(() => {
  //   async function fetchDashboardData() {
  //     try {
  //       setLoading(true);
  //       // Fetch data logic...
  //     } catch (error) {
  //       console.error('Error fetching dashboard data:', error);
  //       setError('Failed to load dashboard data');
  //     } finally {
  //       setLoading(false); // Ensure loading is set to false
  //     }
  //   }

  //   fetchDashboardData();
  // }, [timeRange]); // Dependency on timeRange suggests this is for dashboard data


  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="text-center p-8">Loading...</div>;
    if (!session) return <Navigate to="/login" />;
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {session && <Navbar />}
        <div className="pt-16 pb-8">
          <Routes>
            <Route path="/login" element={
              !session ? <Login /> : <Navigate to="/" />
            } />

            {/* Password Reset Routes */}
            <Route path="/reset-password" element={<ResetPasswordRequest />} />
            <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            <Route path="/new-session" element={
              <ProtectedRoute>
                <NewSession />
              </ProtectedRoute>
            } />

            <Route path="/session/:sessionId" element={
              <ProtectedRoute>
                <SessionTracking />
              </ProtectedRoute>
            } />

            <Route path="/summary/:sessionId" element={
              <ProtectedRoute>
                <SessionSummary />
              </ProtectedRoute>
            } />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;