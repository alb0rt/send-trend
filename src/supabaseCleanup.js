// src/supabaseCleanup.js
import { supabase } from './supabase';

// This helps with cleaning up Supabase listeners on hot reloads
let previousListeners = [];

// Function to clean up listeners on hot reload
export function cleanupSupabaseListeners() {
  previousListeners.forEach(subscription => {
    if (typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe();
    }
  });
  previousListeners = [];
}

// Function to register listeners for cleanup
export function registerListener(subscription) {
  previousListeners.push(subscription);
  return subscription;
}

// Clean up listeners when the module is hot-reloaded
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupSupabaseListeners();
  });
}