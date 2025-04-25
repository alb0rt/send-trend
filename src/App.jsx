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
import Layout from './components/Layout';
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
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event, session);
      setSession(session);
      setLoading(false);
    });

    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="text-center p-8">Loading...</div>;
    if (!session) return <Navigate to="/login" />;
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {session ? (
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/new-session" element={<NewSession />} />
              <Route path="/session/:sessionId" element={<SessionTracking />} />
              <Route path="/summary/:sessionId" element={<SessionSummary />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPasswordRequest />} />
            <Route path="/reset-password/confirm" element={<ResetPasswordConfirm />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;