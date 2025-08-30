import { create } from 'zustand';
import { getVideoQueue } from '../lib/supabase';

interface Video {
  video_id: string;
  youtube_url?: string;
  title: string;
  duration_seconds: number;
  coin_reward: number;
  views_count: number;
  target_views: number;
  status: string;
  user_id: string;
  completed?: boolean;
  total_watch_time?: number;
  completion_rate?: number;
  hold_until?: string;
  deleted_at?: string;
}

interface VideoState {
  videoQueue: Video[];
  currentVideoIndex: number;
  currentVideo: Video | null;
  isLoading: boolean;
  error: string | null;
  canLoop: boolean;
  fetchVideos: (userId: string) => Promise<void>;
  getCurrentVideo: () => Video | null;
  moveToNextVideo: () => void;
  clearQueue: () => void;
  checkQueueLoop: (userId: string) => Promise<boolean>;
  refreshQueue: (userId: string) => Promise<void>;
  shouldSkipCurrentVideo: () => boolean;
  moveToNextIfNeeded: (userId: string) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  videoQueue: [],
  currentVideoIndex: 0,
  currentVideo: null,
  isLoading: false,
  error: null,
  canLoop: true,

  fetchVideos: async (userId: string) => {
    if (!userId) {
      set({ isLoading: false, error: 'User not authenticated' });
      return;
    }
    set({ isLoading: true, error: null });
    
    try {
      const videos = await getVideoQueue(userId);
      
      if (videos && videos.length > 0) {
        // Normalize backend fields
        const normalized = videos.map((video: any) => ({
          ...video,
          // Use video_id if available, otherwise fall back to id
          video_id: video.video_id || video.id,
          youtube_url: video.youtube_url || '',
          duration_seconds: Number(video.duration_seconds || 30),
          coin_reward: Number(video.coin_reward ?? 10),
          // Ensure these fields have default values
          views_count: video.views_count || 0,
          target_views: video.target_views || 0,
          completed: video.completed || false,
          status: video.status || 'active'
        }));

        // Enhanced safety filter for the new schema
        const safeVideos = normalized.filter(video => {
          // Check for required fields
          const missingFields = [];
          if (!video.video_id) missingFields.push('video_id');
          if (!video.youtube_url) missingFields.push('youtube_url');
          if (!video.title) missingFields.push('title');
          
          const hasRequiredFields = missingFields.length === 0;
          
          // Check if video is not completed
          const isNotCompleted = video.completed !== true && 
                               video.views_count < (video.target_views || 0) &&
                               video.status !== 'completed';
          
          // Check if status is valid
          const hasValidStatus = ['active', 'repromoted'].includes(video.status) ||
                              (video.status === 'on_hold' && new Date(video.hold_until || 0) <= new Date());
          
          const shouldInclude = hasRequiredFields && isNotCompleted && hasValidStatus;
          
          // Debug logging for videos that are filtered out
          if (!shouldInclude) {
            console.log('🚫 VideoStore: Filtering out video:', {
              title: video.title || 'No title',
              status: video.status,
              completed: video.completed,
              views: video.views_count,
              target: video.target_views,
              reason: !hasRequiredFields ? `missing_required_fields: ${missingFields.join(', ')}` : 
                         !isNotCompleted ? 'completed' : 
                         'invalid_status',
              videoData: JSON.stringify({
                video_id: video.video_id,
                youtube_url: video.youtube_url ? 'present' : 'missing',
                title: video.title ? 'present' : 'missing',
                duration_seconds: video.duration_seconds,
                coin_reward: video.coin_reward
              }, null, 2)
            });
          }
          
          return shouldInclude;
        });
        
        // Keep the current index if we're just refreshing the queue
        const { currentVideoIndex } = get();
        const newIndex = currentVideoIndex < safeVideos.length ? currentVideoIndex : 0;
        
        const newCurrentVideo = safeVideos[newIndex] || null;
        set({ 
          videoQueue: safeVideos, 
          currentVideoIndex: newIndex,
          currentVideo: newCurrentVideo,
          isLoading: false,
          error: null,
          canLoop: true
        });
        
        console.log('🎬 VideoStore: Queue updated. Current index:', newIndex, 'Queue size:', safeVideos.length);
      } else {
        console.log('🎬 VideoStore: No videos received from API');
        set({ 
          videoQueue: [], 
          currentVideoIndex: 0,
          currentVideo: null,
          isLoading: false,
          error: 'No videos available. Videos will loop automatically when available!',
          canLoop: true
        });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      set({ 
        isLoading: false, 
        currentVideo: null,
        error: error instanceof Error ? error.message : 'Failed to load videos. Please check your connection.',
        canLoop: false
      });
    }
  },

  getCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex] || null;
    
    
    return currentVideo;
  },

  moveToNextVideo: () => {
    const { videoQueue, currentVideoIndex } = get();


    if (videoQueue.length === 0) {
      return;
    }

    if (currentVideoIndex < videoQueue.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      const nextVideo = videoQueue[nextIndex];
      set({ currentVideoIndex: nextIndex, currentVideo: nextVideo });
    } else {
      // Loop back to beginning for continuous playback
      const firstVideo = videoQueue[0];
      set({ currentVideoIndex: 0, currentVideo: firstVideo });
    }
  },

  clearQueue: () => {
    set({ 
      videoQueue: [], 
      currentVideoIndex: 0,
      currentVideo: null,
      error: null,
      canLoop: false 
    });
  },

  checkQueueLoop: async (userId: string) => {
    try {
      const videos = await getVideoQueue(userId);
      const hasVideos = videos && videos.length > 0;
      set({ canLoop: hasVideos });
      return hasVideos;
    } catch (error) {
      // console.error('Error checking queue loop:', error);
      set({ canLoop: false });
      return false;
    }
  },

  refreshQueue: async (userId: string) => {
    // console.log('🔄 VideoStore: Refreshing video queue');
    await get().fetchVideos(userId);
  },

  // Check if current video should be skipped (completed or reached target)
  shouldSkipCurrentVideo: () => {
    const { videoQueue, currentVideoIndex } = get();
    const currentVideo = videoQueue[currentVideoIndex];
    
    if (!currentVideo) return true;
    
    const shouldSkip = currentVideo.completed === true || 
                      currentVideo.views_count >= currentVideo.target_views ||
                      currentVideo.status === 'completed' ||
                      !['active', 'repromoted'].includes(currentVideo.status) ||
                      (currentVideo.status === 'on_hold' && new Date(currentVideo.hold_until || 0) > new Date());
    
    //   views: currentVideo.views_count,
    //   target: currentVideo.target_views,
    //   status: currentVideo.status
    // });
    
    return shouldSkip;
  },

  // Move to next video if current one should be skipped
  moveToNextIfNeeded: async (userId: string) => {
    const { shouldSkipCurrentVideo, moveToNextVideo, refreshQueue } = get();
    
    if (shouldSkipCurrentVideo()) {
      moveToNextVideo();
      
      if (shouldSkipCurrentVideo()) {
        await refreshQueue(userId);
      }
    }
  },
}));
