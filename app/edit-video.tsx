import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAlert } from '@/contexts/AlertContext';
import { useVideoStore } from '../store/videoStore';
import { getSupabase, deleteVideo } from '@/lib/supabase';
import { Eye, Clock, Trash2, Play, Timer, ChevronDown, Edit3, Copy, Check } from 'lucide-react-native';
import ScreenHeader from '@/components/ScreenHeader';
import { useNetwork } from '../services/NetworkHandler';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoData {
  id?: string;
  video_id?: string;
  youtube_url?: string;
  title: string;
  views_count: number;
  target_views: number;
  coin_reward?: number;
  coin_cost: number;
  status: 'active' | 'paused' | 'completed' | 'on_hold' | 'repromoted';
  created_at: string;
  updated_at?: string;
  hold_until?: string;
  duration_seconds?: number;
  repromoted_at?: string;
  total_watch_time?: number;
  completion_rate?: number;
  completed?: boolean;
}

export default function EditVideoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { clearQueue } = useVideoStore();
  const { showNetworkAlert } = useNetwork();
  const params = useLocalSearchParams();
  const videoId = params.id as string;
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [holdTimer, setHoldTimer] = useState(0);
  const [showRepromoteOptions, setShowRepromoteOptions] = useState(false);
  const [repromoting, setRepromoting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simple copy state without reanimated to avoid hook order issues
  const [videoIdCopied, setVideoIdCopied] = useState(false);

  const formatEngagementTime = useCallback((seconds: number): string => {
    const safeSeconds = Number(seconds) || 0;
    if (safeSeconds === 0) return '0s';
    
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = Math.floor(safeSeconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }, []);

  const extractYouTubeVideoId = useCallback((video: VideoData): string => {
    if (!video.youtube_url) return 'No YouTube URL';
    
    // Direct return if it's already a video ID (most common case)
    const url = video.youtube_url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    
    // Quick extraction for common patterns
    const match = url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : url.length <= 15 ? url : 'Invalid URL';
  }, []);

  const copyYouTubeVideoId = useCallback(async (videoId: string) => {
    if (!videoId || videoId === 'Loading...') {
      showError('Cannot Copy', 'No video ID available to copy');
      return;
    }
    
    try {
      const { Clipboard } = require('react-native');
      Clipboard.setString(videoId);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        const Haptics = require('expo-haptics');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Show success indicator
      setVideoIdCopied(true);
      
      // Hide after 2 seconds
      setTimeout(() => {
        setVideoIdCopied(false);
      }, 2000);
    } catch (error) {
      
      showError('Copy Failed', 'Could not copy to clipboard');
    }
  }, [showError]);

  const calculateHoldTimer = useCallback((video: VideoData) => {
    if (video.status !== 'on_hold') return 0;
    
    let holdUntilTime: Date;
    if (video.hold_until) {
      holdUntilTime = new Date(video.hold_until);
    } else {
      holdUntilTime = new Date(video.created_at);
      holdUntilTime.setMinutes(holdUntilTime.getMinutes() + 10);
    }
    
    const remainingMs = holdUntilTime.getTime() - new Date().getTime();
    return Math.max(0, Math.floor(remainingMs / 1000));
  }, []);

  const setupRealTimeUpdates = useCallback((video: VideoData) => {
    const id = video.id || video.video_id;
    if (!id) return;
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(async () => {
      try {
        const supabase = getSupabase();
        const { data: freshData, error } = await supabase
          .from('videos')
          .select('views_count, status, hold_until, updated_at, total_watch_time, completed, target_views, youtube_url, coin_cost, coin_reward, duration_seconds')
          .eq('id', id)
          .single();

        if (!error && freshData) {
          const updatedVideo = {
            ...freshData,
            completion_rate: freshData.target_views > 0 
              ? Math.round((freshData.views_count / freshData.target_views) * 100)
              : 0
          };
          
          setVideoData(prev => prev ? { ...prev, ...updatedVideo } : null);
          
          if (updatedVideo.status === 'on_hold' && updatedVideo.hold_until) {
            const holdUntilTime = new Date(updatedVideo.hold_until);
            if (holdUntilTime.getTime() <= new Date().getTime()) {
              await supabase
                .from('videos')
                .update({ status: 'active', hold_until: null })
                .eq('id', id);
            }
          } else if (updatedVideo.status === 'active') {
            setHoldTimer(0);
          }
        } else if (error && error.code === 'PGRST116') {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (error) {
        
      }
    }, 3000);
  }, []);

  useEffect(() => {
    const initializeVideo = async () => {
      if (params.id && user?.id) {
        await fetchVideoData();
      } else if (params.videoData) {
        try {
          const video = JSON.parse(params.videoData as string);
          setVideoData(video);
          setHoldTimer(calculateHoldTimer(video));
          setLoading(false);
          setupRealTimeUpdates(video);
        } catch (error) {
          router.back();
        }
      }
    };

    initializeVideo();
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [params.videoData, params.id, user]);

  const fetchVideoData = async () => {
    if (!params.id || !user?.id) return;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('videos')
        .select('*, total_watch_time, youtube_url')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        showError('Error', 'Failed to load video data');
        router.back();
        return;
      }

      const videoWithCompletion = {
        ...data,
        completion_rate: data.target_views > 0 
          ? Math.round((data.views_count / data.target_views) * 100)
          : 0
      };
      
      setVideoData(videoWithCompletion);
      setHoldTimer(calculateHoldTimer(videoWithCompletion));
      setupRealTimeUpdates(videoWithCompletion);
    } catch (error) {
      showError('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setVideoData(prev => prev ? { ...prev, status: 'active' } : null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
    return undefined;
  }, [holdTimer]);

  const getMinutesSinceCreation = useCallback(() => {
    if (!videoData) return 0;
    const createdTime = new Date(videoData.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60));
  }, [videoData]);

  const refundInfo = useMemo(() => {
    if (!videoData) return { refundPercentage: 0, refundAmount: 0, isWithin10Minutes: false };
    
    const minutesSinceCreation = getMinutesSinceCreation();
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 50;
    const refundAmount = Math.floor((videoData.coin_cost || 0) * refundPercentage / 100);
    
    return { refundPercentage, refundAmount, isWithin10Minutes };
  }, [videoData, getMinutesSinceCreation]);

  const canRepromote = useMemo(() => {
    if (!videoData) return false;
    
    // Only allow repromotion if video is completed OR has reached target views
    const hasReachedTarget = videoData.views_count >= videoData.target_views;
    const isCompleted = videoData.status === 'completed' || videoData.completed === true;
    
    // For repromoted videos, they must reach target again before next repromotion
    if (videoData.status === 'repromoted') {
      return hasReachedTarget && isCompleted;
    }
    
    // For other statuses, follow original logic
    return ['completed', 'paused'].includes(videoData.status) && (isCompleted || hasReachedTarget);
  }, [videoData]);

  const canDeleteVideo = useMemo(() => {
    if (!videoData) return false;
    
    // Disable delete button when video status is 'completed'
    // User must repromote the video first to enable deletion
    return videoData.status !== 'completed';
  }, [videoData]);

  const getRepromoteDisabledReason = useCallback(() => {
    if (!videoData) return 'Video data not available';
    
    if (videoData.status === 'repromoted') {
      const hasReachedTarget = videoData.views_count >= videoData.target_views;
      if (!hasReachedTarget) {
        return `Video must reach target views (${videoData.views_count}/${videoData.target_views}) before repromotion`;
      }
      if (!videoData.completed) {
        return 'Video must complete before repromotion';
      }
    }
    
    if (!['completed', 'paused', 'repromoted'].includes(videoData.status)) {
      return 'Repromote is only available for completed, paused, or previously repromoted videos';
    }
    
    return '';
  }, [videoData]);

  const handleDeleteVideo = async () => {
    if (!videoData || !user?.id) return;

    // Prevent deletion if video is completed
    if (!canDeleteVideo) {
      showError(
        'Cannot Delete Video',
        'Completed videos cannot be deleted. Please repromote the video first to enable deletion.'
      );
      return;
    }

    const message = `Deleting now refunds ${refundInfo.refundPercentage}% coins (🪙${refundInfo.refundAmount}). This action cannot be undone. Confirm?`;

    showConfirm(
      'Delete Video',
      message,
      async () => {
        try {
          const { data: deleteResult, error } = await deleteVideo(
            videoData.id || videoData.video_id!,
            user.id
          );

          if (error) {
            showError('Error', 'Failed to delete video. Please try again.');
            return;
          }

          await refreshProfile();
          clearQueue();

          showSuccess(
            'Success', 
            deleteResult.message || `Video deleted and 🪙${deleteResult.refund_amount} coins refunded!`
          );

          // Navigate back to analytics with refresh flag
          setTimeout(() => {
            router.replace('/(tabs)/analytics?refresh=true');
          }, 1000);
        } catch (error) {
          // Check for network errors and show appropriate alert
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
            
            showNetworkAlert();
          } else {
            showError('Error', 'Failed to delete video. Please try again.');
          }
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const handleNavigateBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleRepromoteVideo = async () => {
    if (!videoData || !user?.id || repromoting || !canRepromote) return;

    if (!['completed', 'paused', 'repromoted'].includes(videoData.status)) {
      showError(
        'Cannot Repromote',
        'This video can only be repromoted when it is completed, paused, or previously repromoted.'
      );
      return;
    }

    setRepromoting(true);
    
    try {
      const supabase = getSupabase();
      const { data: result, error } = await supabase.rpc('repromote_video', {
        p_video_id: videoData.id || videoData.video_id,
        p_user_id: user.id
      });

      if (error) throw new Error(error.message);

      if (result && result.success === false) {
        const errorMsg = result?.error && typeof result.error === 'object' 
          ? (result.error.message || String(result.error))
          : (result?.error || 'Failed to repromote video');
        showError('Cannot Repromote', errorMsg);
        return;
      }

      await refreshProfile();
      clearQueue();

      showSuccess('Success', result.message || 'Video repromoted successfully!');
    } catch (error) {
      // Check for network errors and show appropriate alert
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        
        showNetworkAlert();
      } else {
        showError('Error', 'Failed to repromote video. Please try again.');
      }
    } finally {
      setRepromoting(false);
    }
  };

  const formatHoldTimer = useCallback((seconds: number): string => {
    const safeSeconds = Number(seconds) || 0;
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const statusConfig = useMemo(() => {
    const configs = {
      active: { color: '#2ECC71', text: 'ACTIVE' },
      completed: { color: '#3498DB', text: 'COMPLETED' },
      paused: { color: '#E74C3C', text: 'PAUSED' },
      on_hold: { color: '#F39C12', text: 'PENDING' },
      repromoted: { color: '#800080', text: 'REPROMOTED' }
    };
    return configs[videoData?.status as keyof typeof configs] || { color: '#95A5A6', text: videoData?.status?.toUpperCase() || 'UNKNOWN' };
  }, [videoData?.status]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader 
        title="Edit Video" 
        icon={Edit3}
        onBackPress={handleNavigateBack}
      />

      {loading || !videoData ? (
        <View style={styles.loadingContainer}>
          <Text>Loading video details...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Text style={[styles.statusText, { color: 'white' }]}>{statusConfig.text}</Text>
            </View>
            <View style={styles.videoIdContainer}>
              <Text style={[styles.videoId, { color: colors.textSecondary }]} numberOfLines={1}>
                Video ID: {extractYouTubeVideoId(videoData)}
              </Text>
              <View style={styles.copyButtonContainer}>
                <TouchableOpacity 
                  style={[styles.copyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => copyYouTubeVideoId(extractYouTubeVideoId(videoData))}
                  activeOpacity={0.7}
                >
                  {videoIdCopied ? (
                    <Check size={14} color={colors.success} />
                  ) : (
                    <Copy size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
                {videoIdCopied && (
                  <View style={[styles.copySuccessIndicator, { opacity: videoIdCopied ? 1 : 0 }]}>
                    <Text style={[styles.copySuccessText, { color: colors.success }]}>Copied!</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.titleCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.titleLabel, { color: colors.textSecondary }]}>Video Title</Text>
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={3}>
            {videoData.title || 'Untitled Video'}
          </Text>
        </View>

        {videoData.status === 'on_hold' && holdTimer > 0 && (
          <View style={[styles.pendingCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
            <View style={styles.pendingHeader}>
              <Timer color="#F39C12" size={24} />
              <Text style={[styles.pendingTitle, { color: colors.warning }]}>Pending Status</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { color: colors.warning }]}>{formatHoldTimer(holdTimer)} remaining</Text>
              <Text style={[styles.timerSubtext, { color: colors.warning }]}>Video will enter queue after hold period</Text>
            </View>
          </View>
        )}

        <View style={styles.metricsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Metrics</Text>
          
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeaderCentered}>
                <Eye color="#3498DB" size={isSmallScreen ? 22 : 28} />
                <Text style={[styles.metricLabelResponsive, { color: colors.text }]}>Total Views</Text>
              </View>
              <Text style={[styles.metricValueResponsive, { color: colors.text }]}>
                {`${videoData.views_count || 0}/${videoData.target_views || 0}`}
              </Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeaderCentered}>
                <Clock color="#F39C12" size={isSmallScreen ? 22 : 28} />
                <Text style={[styles.metricLabelResponsive, { color: colors.text }]}>Received Watch Time</Text>
              </View>
              <Text style={[styles.metricValueResponsive, { color: colors.text }]}>
                {formatEngagementTime(videoData.total_watch_time || 0)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.deleteButton, 
              { backgroundColor: canDeleteVideo ? colors.error : colors.textSecondary },
              !canDeleteVideo && styles.buttonDisabled
            ]} 
            onPress={handleDeleteVideo}
            disabled={!canDeleteVideo}
          >
            <Trash2 color={canDeleteVideo ? "white" : "#999"} size={20} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionButtonText, { color: canDeleteVideo ? 'white' : '#999' }]}>Delete Video</Text>
              <Text style={[styles.actionSubtext, { color: canDeleteVideo ? 'rgba(255, 255, 255, 0.8)' : '#999' }]}>
                {canDeleteVideo 
                  ? `Refund: ${refundInfo.refundAmount || 0} (${refundInfo.refundPercentage || 0}%)` 
                  : 'Completed videos cannot be deleted'
                }
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.repromoteSection, { backgroundColor: colors.surface }]}>
            <Pressable 
              style={styles.repromoteToggle}
              onPress={() => setShowRepromoteOptions(!showRepromoteOptions)}
              android_ripple={{ color: '#F5F5F5' }}
            >
              <Text style={[styles.repromoteLabel, { color: colors.text }]}>Repromote Video</Text>
              <ChevronDown 
                color={colors.text} 
                size={20} 
                style={[
                  styles.chevron,
                  showRepromoteOptions && styles.chevronRotated
                ]}
              />
            </Pressable>
            
            {showRepromoteOptions && (
              <View style={styles.repromoteOptions}>
                <Pressable 
                  style={[
                    styles.actionButton, 
                    styles.repromoteButton,
                    { backgroundColor: colors.primary },
                    (repromoting || !canRepromote) && styles.buttonDisabled
                  ]} 
                  onPress={handleRepromoteVideo}
                  disabled={repromoting || !canRepromote}
                  android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Play color="white" size={20} />
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionButtonText, { color: 'white' }]}>
                      {repromoting ? 'Repromoting...' : 'Repromote Video'}
                    </Text>
                    <Text style={[styles.actionSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                      Uses dynamic cost calculation
                    </Text>
                  </View>
                </Pressable>
                {!canRepromote && getRepromoteDisabledReason() !== '' && (
                  <View style={[styles.repromoteDisabledNotice, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.disabledNoticeText, { color: colors.warning }]}>
                      {getRepromoteDisabledReason()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  videoId: {
    fontSize: 11,
    marginRight: 8,
    maxWidth: '75%',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyButtonContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  copySuccessIndicator: {
    position: 'absolute',
    top: -25,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 1000,
  },
  copySuccessText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  pendingCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  metricsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  metricValueCentered: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  engagementLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  actionSection: {
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
  },
  repromoteButton: {
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionContent: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
  },
  repromoteSection: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  repromoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  repromoteLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  repromoteOptions: {
    padding: 16,
    paddingTop: 0,
  },
  optionGroup: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 14,
  },
  costDisplay: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  costText: {
    fontSize: 16,
    fontWeight: '600',
  },
  repromoteDisabledNotice: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disabledNoticeText: {
    fontSize: isSmallScreen ? 12 : 13,
    lineHeight: 18,
  },
  metricHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabelResponsive: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  metricValueResponsive: {
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  titleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteSection: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  titleLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '500',
    lineHeight: isSmallScreen ? 22 : 26,
    letterSpacing: 0.2,
  },
});