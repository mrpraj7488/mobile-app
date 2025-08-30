import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface VideoUpdate {
  id: string;
  views_count?: number;
  total_watch_time?: number;
  completion_rate?: number;
  completed?: boolean;
  status?: string;
  updated_at?: string;
}

interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  reference_id?: string;
  engagement_duration?: number;
  created_at: string;
}

export function useRealtimeVideoUpdates(videoId?: string, userId?: string, onNetworkError?: () => void) {
  const [videoUpdates, setVideoUpdates] = useState<VideoUpdate | null>(null);
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!videoId && !userId) return;

    // Subscribe to video changes
    const videoSubscription = supabase
      .channel('video-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: videoId ? `id=eq.${videoId}` : undefined
        },
        (payload: any) => {
          
          setVideoUpdates(payload.new as VideoUpdate);
        }
      )
      .subscribe((status: any) => {
        
        setIsConnected(status === 'SUBSCRIBED');
        
        // Handle connection errors
        if (status === 'CHANNEL_ERROR') {
          
          if (onNetworkError) {
            onNetworkError();
          }
        }
      });

    // Subscribe to coin transaction changes
    const transactionSubscription = supabase
      .channel('coin-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coin_transactions',
          filter: videoId ? `reference_id=eq.${videoId}` : undefined
        },
        (payload: any) => {
          
          if (payload.new) {
            setCoinTransactions(prev => {
              const newTransaction = payload.new as CoinTransaction;
              const existingIndex = prev.findIndex(t => t.id === newTransaction.id);
              
              if (existingIndex >= 0) {
                // Update existing transaction
                const updated = [...prev];
                updated[existingIndex] = newTransaction;
                return updated;
              } else {
                // Add new transaction
                return [...prev, newTransaction];
              }
            });
          }
        }
      )
      .subscribe((status: any) => {

        // Handle connection errors for transaction subscription too
        if (status === 'CHANNEL_ERROR') {
          
          if (onNetworkError) {
            onNetworkError();
          }
        }
      });

    // Cleanup subscriptions
    return () => {
      
      videoSubscription.unsubscribe();
      transactionSubscription.unsubscribe();
    };
  }, [videoId, userId, onNetworkError]);

  return {
    videoUpdates,
    coinTransactions,
    isConnected
  };
} 
