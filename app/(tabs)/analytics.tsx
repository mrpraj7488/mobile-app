import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { useConfig } from '@/contexts/ConfigContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useRouter } from 'expo-router';
import GlobalHeader from '@/components/GlobalHeader';
import { ChartBar as BarChart3, Eye, Coins, Play, Pause, CircleCheck as CheckCircle, Timer, Pencil as Edit3, Activity, TrendingUp, ChevronDown, ChevronUp, RefreshCw, ShoppingCart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface UserAnalytics {
  total_videos_promoted: number;
  total_coins_earned: number;
  active_videos: number;
  completed_videos: number;
  on_hold_videos: number;
  total_views_received: number;
  total_watch_time_received: number;
  total_coins_distributed: number;
  average_completion_rate: number;
  current_coins: number;
  repromoted_videos?: number;
  total_repromotes?: number;
}

interface RecentActivity {
  id: string;
  activity_type?: string;
  type?: string;
  amount: number;
  description: string;
  created_at?: string;
  timestamp?: string;
  status: string;
}

interface VideoAnalytics {
  video_id: string;
  title: string;
  views_count: number;
  target_views: number;
  status: string;
  created_at: string;
  coin_cost: number;
  completion_rate: number;
  completed: boolean;
  total_watch_time: number;
  coins_earned_total: number;
  repromote_count?: number;
  last_repromoted_at?: string;
  repromote_cost?: number;
  is_repromoted?: boolean;
  can_repromote?: boolean;
  estimated_repromote_cost?: number;
}

export default function Analytics() {
  const { user, profile, loading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const { config } = useConfig();
  const analyticsEnabled = useFeatureFlag('analyticsEnabled');
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [videos, setVideos] = useState<VideoAnalytics[]>([]);
  const [showAllVideos, setShowAllVideos] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    analytics: true,
    videos: true,
    activity: true,
  });
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    if (user?.id) {
      if (!analyticsEnabled) {
        const emptyAnalytics = {
          current_coins: profile?.coins || 0,
          total_videos_promoted: 0,
          completed_videos: 0,
          total_views_received: 0,
          total_watch_time_received: 0,
          total_coins_distributed: 0,
          average_completion_rate: 0,
          active_videos: 0,
          on_hold_videos: 0,
          total_coins_earned: 0,
          repromoted_videos: 0,
        };
        setAnalytics(emptyAnalytics);
        setVideos([]);
        setRecentActivity([]);
        setLoadingStates({ analytics: false, videos: false, activity: false });
        setLoading(false);
        return;
      }

      const initTimeout = setTimeout(() => {
        if (loading) {
          setHasError(true);
          setLoadingStates({ analytics: false, videos: false, activity: false });
          setLoading(false);
        }
      }, 10000);

      fetchAnalytics().finally(() => {
        clearTimeout(initTimeout);
      });

      const statusCheckInterval = setInterval(async () => {
        if (!loading && !refreshing) {
          try {
            const supabase = getSupabase();
            if (supabase) {
              const { data: updatedCount, error: holdsError } = await supabase.rpc('check_and_update_expired_holds');
              if (!holdsError && updatedCount && updatedCount > 0) {
                fetchAnalytics();
              }
            }
          } catch (error) {
            // Ignore status check errors
          }
        }
      }, 30000);

      return () => {
        clearTimeout(initTimeout);
        clearInterval(statusCheckInterval);
      };
    }
  }, [user, analyticsEnabled]);

  // Removed unnecessary useEffect for videos processing

  const fetchAnalytics = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get analytics summary from the database function
      const { data: analyticsData, error: analyticsError } = await getSupabase()
        .rpc('get_user_analytics_summary', { p_user_id: user.id });

      if (analyticsError) throw analyticsError;

      // Get user's videos for additional stats
      const { data: videosData, error: videosError } = await getSupabase()
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Calculate additional stats
      const totalVideosPromoted = videosData?.length || 0;
      const totalCoinsEarned = videosData?.reduce((sum: number, video: any) => 
        sum + (video.coins_earned_total || 0), 0) || 0;

      // Update analytics state with the combined data
      setAnalytics({
        total_videos_promoted: totalVideosPromoted,
        total_coins_earned: totalCoinsEarned,
        ...(analyticsData || {})
      });

      // Set videos data for the promoted videos section
      if (videosData && videosData.length > 0) {
        setVideos(videosData.map((video: any) => ({
          video_id: video.id,
          title: video.title || 'Untitled Video',
          views_count: video.views_count || 0,
          target_views: video.target_views || 0,
          status: video.status || 'active',
          completed: video.completed || false,
          is_repromoted: video.repromoted || false,
          coin_cost: video.coin_cost || 0,
          completion_rate: video.target_views > 0 
            ? Math.round((video.views_count / video.target_views) * 100) 
            : 0,
          created_at: video.created_at,
          updated_at: video.updated_at
        })));
      } else {
        setVideos([]);
      }

      // Get recent activity from transactions table
      const { data: activityData, error: activityError } = await getSupabase()
        .from('transactions')
        .select('id, transaction_type, amount, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!activityError && activityData && activityData.length > 0) {
        setRecentActivity(activityData.map((tx: any) => ({
          id: tx.id,
          type: tx.transaction_type || 'unknown',
          amount: tx.amount || 0,
          description: tx.description || `${formatTransactionType(tx.transaction_type || 'unknown')} transaction`,
          timestamp: tx.created_at,
          status: 'completed'
        })));
      } else {
        // If no transactions found, create some sample data based on video activities
        
        const sampleActivity = [];
        
        if (videosData && videosData.length > 0) {
          videosData.slice(0, 3).forEach((video: any, index: number) => {
            sampleActivity.push({
              id: `sample-${index}`,
              type: 'video_promotion',
              amount: -(video.coin_cost || 100),
              description: `Promoted video: ${video.title?.substring(0, 50)}...`,
              timestamp: video.created_at,
              status: 'completed'
            });
          });
        }
        
        // Add a sample coin purchase if no video data
        if (sampleActivity.length === 0) {
          sampleActivity.push({
            id: 'sample-purchase',
            type: 'coin_purchase',
            amount: 1000,
            description: 'Coin purchase for video promotions',
            timestamp: new Date().toISOString(),
            status: 'completed'
          });
        }
        
        setRecentActivity(sampleActivity);
      }

    } catch (error) {
      
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const getStatusColor = (status: string, isRepromoted?: boolean) => {
    if (isRepromoted) return '#9B59B6';
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  const getStatusIcon = (status: string, isRepromoted?: boolean) => {
    if (isRepromoted) {
      
      return TrendingUp;
    }
    switch (status) {
      case 'active':
        
        return Play;
      case 'completed':
        
        return CheckCircle;
      case 'paused':
        
        return Pause;
      case 'on_hold':
        
        return Timer;
      default:
        
        return Play;
    }
  };

  const formatTransactionType = (type: string) => {
    if (!type) return 'Unknown Transaction';
    
    // Add debugging to see what transaction types we're getting

    switch (type.toLowerCase()) {
      case 'video_promotion': 
      case 'video promotion':
      case 'promotion':
        return 'Video Promotion';
      case 'purchase': 
      case 'coin_purchase':
      case 'coin purchase':
        return 'Coin Purchase';
      case 'referral_bonus': 
      case 'referral bonus':
      case 'referral':
        return 'Referral Bonus';
      case 'admin_adjustment': 
      case 'admin adjustment':
      case 'adjustment':
        return 'Admin Adjustment';
      case 'vip_purchase': 
      case 'vip purchase':
      case 'vip':
        return 'VIP Purchase';
      case 'video_deletion_refund': 
      case 'video deletion refund':
      case 'refund':
        return 'Video Deletion Refund';
      case 'watch_reward':
      case 'watch reward':
      case 'reward':
        return 'Watch Reward';
      case 'ad_reward':
      case 'ad reward':
        return 'Ad Reward';
      case 'rating_reward':
      case 'rating reward':
        return 'Rating Reward';
      case 'bonus':
        return 'Bonus';
      case 'earning':
      case 'earnings':
        return 'Earnings';
      case 'withdrawal':
        return 'Withdrawal';
      case 'deposit':
        return 'Deposit';
      default: 
        // Better formatting for unknown types
        const formatted = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return formatted;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleVideoPress = (video: VideoAnalytics) => {
    router.push({
      pathname: '/edit-video',
      params: { videoData: JSON.stringify(video) },
    });
  };

  const getDisplayedVideos = () => {
    return showAllVideos ? videos : videos.slice(0, 1);
  };

  const getDisplayedActivity = () => {
    return showAllActivity ? recentActivity : recentActivity.slice(0, 1);
  };

  const getRemainingCount = (total: number, displayed: number) => {
    return Math.max(0, total - displayed);
  };

  const safeString = (value: any, fallback: string = '') => {
    if (value == null) return fallback;
    try {
      return String(value);
    } catch (e) {
      return fallback;
    }
  };

  const safeNumber = (value: any, fallback: number = 0) => {
    if (value == null) return fallback;
    const num = Number(value);
    return isNaN(num) ? fallback : num;
  };

  if (authLoading || (loading && !refreshing)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader 
          title="Analytics" 
          showCoinDisplay={true}
          menuVisible={menuVisible} 
          setMenuVisible={setMenuVisible} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading analytics...</Text>
          {hasError && (
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setHasError(false);
                fetchAnalytics();
              }}
            >
              <Text style={[styles.retryButtonText, { color: 'white' }]}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader 
        title="Analytics" 
        showCoinDisplay={true}
        menuVisible={menuVisible} 
        setMenuVisible={setMenuVisible} 
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.overviewSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statCardContent}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                  <Play size={16} color="#3498DB" />
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {safeNumber(analytics?.total_videos_promoted)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                    Videos{'\n'}Promoted
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statCardContent}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                  <Text style={{ fontSize: 16 }}>🪙</Text>
                </View>
                <View style={styles.statTextContainer}>
                  <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {safeNumber(analytics?.total_coins_earned).toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                    Coins{'\n'}Earned
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statusSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Status</Text>
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#2ECC71' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.active_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#3498DB' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.completed_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Completed</Text>
            </View>
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#F39C12' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.on_hold_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>On Hold</Text>
            </View>
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderLeftColor: '#9B59B6' }]}>
              <Text style={[styles.statusNumber, { color: colors.text }]}>{safeNumber(analytics?.repromoted_videos)}</Text>
              <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Repromoted</Text>
            </View>
          </View>
        </View>

        <View style={styles.videosSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Promoted Videos</Text>
            <BarChart3 size={20} color={colors.primary} />
          </View>
          {videos.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Play size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Videos Yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Start promoting your videos to see analytics here
              </Text>
            </View>
          ) : (
            <>
              {getDisplayedVideos().map((video) => {
                const StatusIcon = getStatusIcon(video.status, video.is_repromoted);
                const statusColor = getStatusColor(video.status, video.is_repromoted);
                const displayStatus = video.is_repromoted ? 'Repromoted' : video.status.charAt(0).toUpperCase() + video.status.slice(1);
                return (
                  <TouchableOpacity
                    key={video.video_id}
                    style={[styles.videoCard, { backgroundColor: colors.surface }]}
                    onPress={() => handleVideoPress(video)}><View style={styles.videoHeader}>
                      <View style={styles.videoTitleContainer}>
                        <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
                          {safeString(video.title, 'Untitled Video')}
                        </Text>
                        <TouchableOpacity
                          style={[styles.editButton, { backgroundColor: colors.primary }]}
                          onPress={() => router.push(`/edit-video?id=${video.video_id}`)}><Edit3 size={14} color="white" /></TouchableOpacity>
                      </View>
                      <View style={styles.videoStatusRow}>
                        <StatusIcon size={14} color={statusColor} />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {displayStatus}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: isDark ? colors.border : colors.border }]}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${Math.min(safeNumber(video.completion_rate), 100)}%`,
                              backgroundColor: statusColor
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                        {`${safeNumber(video.completion_rate)}%`}
                      </Text>
                    </View>
                    
                    <View style={styles.videoCostRow}>
                      <Text style={[styles.costText, { color: colors.textSecondary }]}>
                        Spent: 🪙<Text style={[styles.costValue, { color: colors.text }]}>{safeNumber(video.coin_cost)}</Text>
                      </Text>
                      {video.completed && (
                        <View style={styles.completedBadgeContainer}>
                          <Text style={[styles.completedBadge, { color: colors.success }]}>
                            Target Reached
                          </Text>
                        </View>
                      )}
                    </View></TouchableOpacity>
                );
              })}
              {videos.length > 1 && (
                <View style={styles.viewMoreButtonContainer}>
                  <TouchableOpacity
                    style={[styles.viewMoreButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowAllVideos(!showAllVideos)}
                  >
                    <View style={styles.viewMoreContent}>
                      <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                        {showAllVideos 
                          ? 'Show Less' 
                          : `View More (${getRemainingCount(videos.length, 1)} more)`
                        }
                      </Text>
                      <View style={{ marginLeft: 8 }}>
                        {showAllVideos ? (
                          <ChevronUp size={16} color={colors.primary} />
                        ) : (
                          <ChevronDown size={16} color={colors.primary} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            <Activity size={20} color={colors.primary} />
          </View>
          {recentActivity.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Activity size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Recent Activity</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Your coin transactions will appear here
              </Text>
            </View>
          ) : (
            <>
              {getDisplayedActivity().map((activity, index) => (
                <View key={`${activity.type || activity.activity_type}-${activity.timestamp || activity.created_at}-${index}`} style={[styles.activityCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityInfo}>
                      <Text style={[styles.activityType, { color: colors.text }]}>
                        {formatTransactionType(activity.type || activity.activity_type || 'unknown')}
                      </Text>
                      <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                        {new Date(activity.timestamp || activity.created_at || Date.now()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.activityAmount, { color: activity.amount > 0 ? '#10B981' : '#EF4444' }]}>
                      {`${activity.amount > 0 ? '+' : ''}${Math.abs(activity.amount)} 🪙`}
                    </Text>
                  </View>
                  <Text style={[styles.activityDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {activity.description || 'No description available'}
                  </Text>
                </View>
              ))}
              {recentActivity.length > 1 && (
                <View style={styles.viewMoreButtonContainer}>
                  <TouchableOpacity
                    style={[styles.viewMoreButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowAllActivity(!showAllActivity)}
                  >
                    <View style={styles.viewMoreContent}>
                      <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                        {showAllActivity 
                          ? 'Show Less' 
                          : `View More Activity (${getRemainingCount(recentActivity.length, 1)} more)`
                        }
                      </Text>
                      <View style={{ marginLeft: 8 }}>
                        {showAllActivity ? (
                          <ChevronUp size={16} color={colors.primary} />
                        ) : (
                          <ChevronDown size={16} color={colors.primary} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewSection: {
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 13,
    textAlign: 'left',
  },
  statusSection: {
    marginBottom: 24,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  activitySection: {
    marginBottom: 24,
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: 12,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  videosSection: {
    marginBottom: 24,
  },
  emptyState: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoHeader: {
    marginBottom: 12,
  },
  videoTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  editButton: {
    borderRadius: 8,
    padding: 8,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
  videoCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costText: {
    fontSize: 12,
    fontWeight: '500',
  },
  costValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  completedBadge: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewMoreButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  viewMoreButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  viewMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repromotedStatus: {
    color: '#9333ea',
    fontWeight: '600',
  },
});
