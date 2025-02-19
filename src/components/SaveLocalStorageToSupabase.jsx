import React, { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SaveLocalStorageToSupabase() {
  useEffect(() => {
    async function handleSave() {
      // Example: read 'userProfile' from localStorage
      const localDataStr = localStorage.getItem('userProfile');
      if (!localDataStr) {
        console.log("No 'userProfile' found in localStorage.");
        return;
      }

      const localData = JSON.parse(localDataStr);

      // Insert or upsert into your Supabase table
      const { data, error } = await supabase
        .from('profiles')
        .insert([
          {
            name: localData.name,
            age: localData.age,
            // etc...
          }
        ]);

      if (error) {
        console.error('Error inserting data into Supabase:', error);
      } else {
        console.log('Data inserted successfully:', data);
      }
    }

    // Immediately call it on component mount
    handleSave();
  }, []);

  // Optionally, return null or some minimal message
  return null;
}
