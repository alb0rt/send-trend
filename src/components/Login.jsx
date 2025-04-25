// src/components/Login.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { supabase } from '../supabase';
import { Navbar } from './Navbar';
import Container from './Container';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      let result;
      
      if (isSignUp) {
        // Sign up
        result = await supabase.auth.signUp({
          email,
          password,
        });
      } else {
        // Sign in
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      if (isSignUp && result.data?.user) {
        setMessage({ 
          type: 'success', 
          text: 'Registration successful! Please check your email for confirmation.'
        });
      }
    } catch (error) {
      console.error('Auth error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred during authentication'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Google auth error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'An error occurred during Google authentication'
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
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isSignUp 
              ? 'Already have an account? ' 
              : 'Don\'t have an account? '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setMessage(null);
              }}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
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
          
          {/* Google Sign In Button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
              </span>
              {loading ? 'Loading...' : 'Sign in with Google'}
            </button>
          </div>
          
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
            </div>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>
            
            {/* Add Forgot Password Link */}
            {!isSignUp && (
              <div className="flex items-center justify-end">
                <Link
                  to="/reset-password"
                  className="font-medium text-sm text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            )}
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {loading ? (
                  'Loading...'
                ) : (
                  isSignUp ? 'Sign up with Email' : 'Sign in with Email'
                )}
              </button>
            </div>
          </form>
        </Container>
      </div>
    </>
  );
}