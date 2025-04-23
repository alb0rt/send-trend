import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

// Read the CSV file
const csvData = fs.readFileSync('assets/gemini_parsed_cleaned_1.csv', 'utf8');

// Parse the CSV
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true
});

console.log(`Parsed ${records.length} records from CSV`);

// Initialize Supabase client
const supabaseUrl = 'https://wiysiiimbupzbowygcao.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeXNpaWltYnVwemJvd3lnY2FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzcwMTQxNSwiZXhwIjoyMDU5Mjc3NDE1fQ.orLkenrwEh79M2BanZ-n25aDuFXvTkz2n-sUpKCyoH4'; // Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
  try {
    // Extract unique gyms
    const gyms = {};
    records.forEach(record => {
      const key = `${record.Gym_Name}:${record.Gym_Location}`;
      if (!gyms[key]) {
        gyms[key] = {
          name: record.Gym_Name,
          location: record.Gym_Location
        };
      }
    });

    // Insert gyms into Supabase
    console.log(`Inserting ${Object.keys(gyms).length} gyms...`);
    const gymInserts = Object.values(gyms).map(gym => ({
      name: gym.name,
      location: gym.location
    }));

    const { data: insertedGyms, error: gymError } = await supabase
      .from('gyms')
      .upsert(gymInserts, { onConflict: 'name,location', returning: true });

    if (gymError) {
      console.error("Error inserting gyms:", gymError);
      throw gymError;
    }

    const gymMap = {};

    // Check if insertedGyms is null or empty
    if (!insertedGyms || insertedGyms.length === 0) {
      console.log("No gyms returned from upsert - fetching all gyms from database");
      
      // Fetch all gyms from the database
      const { data: allGyms, error: fetchError } = await supabase
        .from('gyms')
        .select('*');
      
      if (fetchError) {
        console.error("Error fetching gyms:", fetchError);
        throw fetchError;
      }
      
      console.log(`Found ${allGyms.length} gyms in database`);
      
      // Use these gyms instead
      const mappedGyms = allGyms.filter(gym => {
        const key = `${gym.name}:${gym.location}`;
        return Object.values(gyms).some(g => `${g.name}:${g.location}` === key);
      });
      
      console.log(`Matched ${mappedGyms.length} gyms`);
      
      // Continue with mappedGyms instead of insertedGyms
      mappedGyms.forEach(gym => {
        const key = `${gym.name}:${gym.location}`;
        gymMap[key] = gym.id;
      });

      console.log("Gym map created with keys:", Object.keys(gymMap));

    } else {
      console.log(`Inserted/updated ${insertedGyms.length} gyms`);
      
      // Create a map of gym keys to IDs
      insertedGyms.forEach(gym => {
        const key = `${gym.name}:${gym.location}`;
        gymMap[key] = gym.id;
      });
    }

    // Extract and insert route categories
    const routeCategories = {};
    records.forEach(record => {
      const gymKey = `${record.Gym_Name}:${record.Gym_Location}`;
      const gymId = gymMap[gymKey];
      
      if (gymId) {
        const categoryKey = `${gymId}:${record.Route_Category}`;
        if (!routeCategories[categoryKey]) {
          routeCategories[categoryKey] = {
            gym_id: gymId,
            name: record.Route_Category,
            difficulty_index: record.Route_Difficulty_Index,
            notes: record.Route_Notes || null
          };
        }
      }
    });

    // Insert route categories
    console.log(`Inserting ${Object.keys(routeCategories).length} route categories...`);
    const categoryInserts = Object.values(routeCategories);
    
    const { data: insertedCategories, error: categoryError } = await supabase
      .from('route_categories')
      .upsert(categoryInserts, { onConflict: 'gym_id,name', returning: true });
    
    if (categoryError) throw categoryError;

    // Create a map of category keys to IDs - handle case when no categories are returned
    const categoryMap = {};
    
    if (!insertedCategories || insertedCategories.length === 0) {
      console.log("No categories returned from upsert - fetching all categories from database");
      
      // Fetch all categories from the database
      const { data: allCategories, error: fetchCategoriesError } = await supabase
        .from('route_categories')
        .select('*');
      
      if (fetchCategoriesError) {
        console.error("Error fetching categories:", fetchCategoriesError);
        throw fetchCategoriesError;
      }
      
      console.log(`Found ${allCategories.length} categories in database`);
      
      // Map categories to our keys
      allCategories.forEach(category => {
        Object.keys(routeCategories).forEach(key => {
          const [gymId, categoryName] = key.split(':');
          if (category.gym_id.toString() === gymId && category.name === categoryName) {
            categoryMap[key] = category.id;
          }
        });
      });
      
      console.log(`Mapped ${Object.keys(categoryMap).length} categories`);
    } else {
      console.log(`Inserted/updated ${insertedCategories.length} categories`);
      
      // Create a map of category keys to IDs
      insertedCategories.forEach(category => {
        const key = `${category.gym_id}:${category.name}`;
        categoryMap[key] = category.id;
      });
    }

    // Group records by date and gym
    const sessions = {};
    records.forEach(record => {
      const sessionKey = `${record.Date}:${record.Gym_Name}:${record.Gym_Location}`;
      if (!sessions[sessionKey]) {
        const gymKey = `${record.Gym_Name}:${record.Gym_Location}`;
        sessions[sessionKey] = {
          date: record.Date,
          gym_id: gymMap[gymKey],
          notes: record.Session_Notes || null,
          routes: []
        };
      }
      
      const gymKey = `${record.Gym_Name}:${record.Gym_Location}`;
      const gymId = gymMap[gymKey];
      const categoryKey = `${gymId}:${record.Route_Category}`;
      const categoryId = categoryMap[categoryKey];
      
      if (categoryId) {
        sessions[sessionKey].routes.push({
          category_id: categoryId,
          completed: record.Unique_Routes_Completed,
          attempted: record.Unique_Routes_Attempted,
          additional: record.Additional_Attempts
        });
      }
    });

    // Insert sessions and routes
    console.log(`Inserting ${Object.keys(sessions).length} sessions...`);
    const userId = '90f6c83c-de95-4737-81fa-aac727945dcd'; // Replace with the actual user ID
    
    for (const sessionKey of Object.keys(sessions)) {
      const session = sessions[sessionKey];
      
      // Insert session
      const { data: insertedSession, error: sessionError } = await supabase
        .from('climbing_sessions')
        .insert([{
          user_id: userId,
          gym_id: session.gym_id,
          date: session.date,
          notes: session.notes
        }])
        .select()
        .single();
      
      if (sessionError) {
        console.error(`Error inserting session ${sessionKey}:`, sessionError);
        continue;
      }
      
      // Insert session routes
      const routeInserts = session.routes.map(route => ({
        session_id: insertedSession.id,
        route_category_id: route.category_id,
        unique_routes_completed: route.completed,
        unique_routes_attempted: route.attempted,
        additional_attempts: route.additional
      }));
      
      if (routeInserts.length > 0) {
        const { error: routeError } = await supabase
          .from('session_routes')
          .insert(routeInserts);
        
        if (routeError) {
          console.error(`Error inserting routes for session ${sessionKey}:`, routeError);
        }
      } else {
        console.log(`No routes to insert for session ${sessionKey}`);
      }
    }
    
    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

importData();