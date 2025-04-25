// src/components/ResetPasswordConfirm.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Navbar } from './Navbar';
import Container from './Container';

export default function ResetPasswordConfirm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // Check if there's a reset token in the URL
  useEffect(() => {
    // When this component loads, Supabase Auth will automatically process the recovery token
    // that's in the URL hash fragment, so we don't need to extract it manually
    
    // Just check if we're in a recovery flow by checking the auth session
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        setMessage({ 
          type: 'error', 
          text: 'Invalid or expired password reset link. Please request a new one.' 
        });
      }
    };
    
    checkSession();
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage(null);
      
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      setMessage({ 
        type: 'success', 
        text: 'Password reset successful! Redirecting to login page...' 
      });
      
      // Clear form
      setPassword('');
      setConfirmPassword('');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        // Force redirect to login page
        window.location.href = '/login';
      }, 2000);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error resetting password. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="pt-16 py-12">
        <Container>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please enter your new password below
          </p>
          
          {message && (
            <div className={`rounded-md p-4 mt-4 ${
              message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </p>
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handlePasswordReset}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">New Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="New password"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </div>
          </form>
          
          <div className="text-center mt-4">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </div>
        </Container>
      </div>
    </>
  );
}