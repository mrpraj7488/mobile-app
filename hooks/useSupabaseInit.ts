import { useState, useEffect } from 'react';
import { fetchRuntimeConfig, getSupabase } from '../lib/supabase';

export const useSupabaseInit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch runtime config (cached if already loaded)
        const config = await fetchRuntimeConfig();
        if (!config) {
          throw new Error('Failed to load runtime configuration from admin panel');
        }

        // Check if client is now initialized with the config
        const client = getSupabase();
        if (!client) {
          throw new Error('Supabase client initialization failed after config load');
        }

        // Test the client with a simple query to ensure it's working
        try {
          // This will fail if the API key is invalid
          await client.from('videos').select('count').limit(1);
        } catch (testError: any) {
          throw new Error(`Supabase connection failed: ${testError.message}`);
        }
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown initialization error');
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSupabase();
  }, []);

  return { isInitialized, isLoading, error };
};
