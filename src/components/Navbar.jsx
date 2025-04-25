// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export function Navbar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user || null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);
  
  const handleSignOut = async () => {
    try {
      setLoading(true);
      
      // Close any open menus first
      setProfileOpen(false);
      setMenuOpen(false);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign out:', error.message);
        throw error;
      }
      
      // Clear user state
      setUser(null);
      
      // Force redirect to login page
      window.location.href = '/login';
      
    } catch (error) {
      console.error('Error signing out:', error);
      // Show an error message to the user if needed
    } finally {
      setLoading(false);
    }
  };
  
  // Get user display name and avatar
  const displayName = user?.profile?.full_name || user?.user_metadata?.full_name || user?.email || 'User';
  
  // Check multiple possible locations for the avatar URL
  const avatarUrl = user?.profile?.avatar_url || 
                   user?.user_metadata?.avatar_url || 
                   user?.user_metadata?.picture;
  
  // Get initials for avatar placeholder
  const getInitials = () => {
    if (user?.profile?.full_name) {
      return user.profile.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };
  
  // If no user is authenticated, show simplified navbar
  if (!user) {
    return (
      <nav className="bg-white shadow fixed w-full z-10">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-start h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  SendTrend
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }
  
  return (
    <nav className="bg-white shadow fixed w-full z-10">
      <div className="w-[512px] mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-blue-600">
                SendTrend
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/new-session"
                className="border-transparent text-gray-500 hover:border-blue-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                New Session
              </Link>
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Profile dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  type="button"
                  className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <span className="sr-only">Open user menu</span>
                  {avatarUrl ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={avatarUrl}
                      alt={displayName}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      {getInitials()}
                    </div>
                  )}
                </button>
              </div>
              
              {/* Profile dropdown menu */}
              {profileOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <div className="px-4 py-2 text-xs text-gray-500">
                    Signed in as
                    <div className="font-medium text-gray-900">{displayName}</div>
                  </div>
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={handleSignOut}
                    disabled={loading}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    {loading ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {menuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${menuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
          >
            Dashboard
          </Link>
          <Link
            to="/new-session"
            onClick={() => setMenuOpen(false)}
            className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
          >
            New Session
          </Link>
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          {/* Mobile profile section */}
          <div className="flex items-center px-4">
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img
                  className="h-10 w-10 rounded-full"
                  src={avatarUrl}
                  alt={displayName}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                  {getInitials()}
                </div>
              )}
            </div>
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">{displayName}</div>
              <div className="text-sm font-medium text-gray-500">{user?.email}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                handleSignOut();
              }}
              className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}