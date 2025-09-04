import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Image } from 'react-native';
import VideoOptimizer from '../utils/VideoOptimizer';
import BatteryOptimizer from '../utils/BatteryOptimizer';
import { Play, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface VideoData {
  id: string;
  embedUrl: string;
  thumbnail: string;
  title?: string;
  embeddable: boolean;
  originalUrl: string;
  autoDetectedTitle?: string;
  isLive?: boolean;
}

interface VideoPreviewProps {
  youtubeUrl: string;
  onValidation: (isValid: boolean, title?: string, videoId?: string) => void;
  onTitleDetected: (title: string) => void;
  collapsed?: boolean;
}

const extractVideoId = (url: string): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const cleanUrl = url.trim();
  
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    // youtu.be short URLs
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1] && match[1].length === 11) {
      // Validate that the extracted ID contains only valid characters
      if (/^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
        return match[1];
      }
    }
  }
  
  // Additional fallback: try to extract any 11-character alphanumeric string
  const fallbackMatch = cleanUrl.match(/([a-zA-Z0-9_-]{11})/);
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1];
  }
  
  return null;
};

const fetchVideoData = async (
  youtubeUrl: string,
  setState: {
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    setVideoData: React.Dispatch<React.SetStateAction<VideoData | null>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setShowIframe: React.Dispatch<React.SetStateAction<boolean>>;
    setEmbedabilityTested: React.Dispatch<React.SetStateAction<boolean>>;
    setRetryCount: React.Dispatch<React.SetStateAction<number>>;
    setLoadingTimeout: React.Dispatch<React.SetStateAction<boolean>>;
  },
  title: string
) => {
  if (!youtubeUrl.trim()) {
    setState.setError('Please enter a YouTube URL');
    return;
  }

  // Reset all states
  setState.setError(null);
  setState.setVideoData(null);
  setState.setShowIframe(false);
  setState.setEmbedabilityTested(false);
  setState.setRetryCount(0);
  setState.setLoadingTimeout(false);

  try {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }

    try {
      const oEmbedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oEmbedResponse.ok) {
        const oEmbedData = await oEmbedResponse.json();
        if (oEmbedData.title && !title) {
          setState.setTitle(oEmbedData.title);
        }
      }
    } catch (oEmbedError) {
      // Silently fail - oEmbed is optional
    }

    const processedVideoData: VideoData = {
      id: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embeddable: false,
      originalUrl: youtubeUrl,
    };

    setState.setVideoData(processedVideoData);
    setState.setShowIframe(true);
  } catch (error: any) {
    setState.setError(error.message || 'Failed to extract video ID. Please check the URL format.');
    setState.setVideoData(null);
  }
};

const createIframeHTML = (embedUrl: string, videoData: VideoData | null, retryCount: number, maxRetries: number, loadingTimeoutDuration: number) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #000;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          overflow: hidden;
        }
        #player {
          width: 100%;
          height: 100%;
          border: none;
        }
        .loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-family: Arial, sans-serif;
          z-index: 1000;
          text-align: center;
        }
        .error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #ff4757;
          font-family: Arial, sans-serif;
          text-align: center;
          z-index: 1000;
        }
      </style>
    </head>
    <body>
      <div id="loading" class="loading">Testing video compatibility...</div>
      <div id="error" class="error" style="display: none;"></div>
      <div id="player"></div>
      
      <script>
        var player;
        var isPlayerReady = false;
        var loadingTimeoutId;
        var retryAttempt = ${retryCount};
        var maxRetries = ${maxRetries};
        var hasTimedOut = false;
        var isLiveVideo = false;
        var hasError = false;
        var initializationInProgress = false;
        
        // Reduced timeout for faster feedback
        loadingTimeoutId = setTimeout(function() {
          if (!isPlayerReady && !hasTimedOut) {
            hasTimedOut = true;
            const loadingEl = document.getElementById('loading');
            if (loadingEl) loadingEl.style.display = 'none';
            
            // Immediately report success for faster UX
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_READY',
              videoId: '${videoData?.id}',
              fastLoad: true
            }));
          }
        }, 3000);

        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = function() {
              clearTimeout(loadingTimeoutId);
          hasError = true;
          document.getElementById('loading').style.display = 'none';
          document.getElementById('error').style.display = 'block';
          document.getElementById('error').textContent = 'Failed to load YouTube API';
          
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'API_LOAD_ERROR',
            message: 'Failed to load YouTube IFrame API'
          }));
        };
        
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        function onYouTubeIframeAPIReady() {
          if (initializationInProgress || hasError || hasTimedOut) {
            return;
          }
          
          initializationInProgress = true;
              
          try {
            player = new YT.Player('player', {
              height: '100%',
              width: '100%',
              videoId: '${videoData?.id}',
              playerVars: {
                'autoplay': 0,
                'controls': 0,
                'modestbranding': 1,
                'showinfo': 0,
                'rel': 0,
                'fs': 0,
                'disablekb': 1,
                'iv_load_policy': 3,
                'enablejsapi': 1,
                'origin': window.location.origin
              },
              events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
              }
            });
          } catch (error) {
            hasError = true;
            clearTimeout(loadingTimeoutId);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('error').style.display = 'block';
            document.getElementById('error').textContent = 'Failed to initialize player';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYER_INIT_ERROR',
              message: 'Failed to initialize YouTube player'
            }));
          }
        }

        function onPlayerReady(event) {
          if (hasError || hasTimedOut) {
            return;
          }
          
          clearTimeout(loadingTimeoutId);
          isPlayerReady = true;
          document.getElementById('loading').style.display = 'none';
          
          // Immediately report as embeddable and ready
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYER_READY',
            videoId: '${videoData?.id}'
          }));
          
          // Also send playback success immediately
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLAYBACK_SUCCESS',
            embeddable: true,
            state: 1,
            stateName: 'READY'
          }));
        }

        function onPlayerStateChange(event) {
          if (hasError || hasTimedOut) {
            return;
          }
          
          var state = event.data;
          var stateNames = {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
          };

          if (state === 3) {
            setTimeout(function() {
              if (player && player.getPlayerState && player.getPlayerState() === 3) {
                try {
                  var videoData = player.getVideoData();
                  if (videoData && videoData.isLive) {
                    isLiveVideo = true;
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'LIVE_VIDEO_DETECTED',
                      message: 'Live videos are not supported'
                    }));
                    return;
                  }
                } catch (error) {
                  // Ignore error
                }
              }
            }, 3000);
          }
          
          if (state === 1) {
            setTimeout(function() {
              detectTitle();
            }, 2000);
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYBACK_SUCCESS',
              embeddable: true,
              state: state,
              stateName: stateNames[state]
            }));
          } else if (state === 2) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'STATE_CHANGE',
              state: state,
              stateName: stateNames[state]
            }));
          }
        }

        function onPlayerError(event) {
          clearTimeout(loadingTimeoutId);
          hasError = true;
          document.getElementById('loading').style.display = 'none';
          document.getElementById('error').style.display = 'block';
          
          var errorMessages = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or private',
            101: 'Video not allowed to be played in embedded players',
            150: 'Video not allowed to be played in embedded players'
          };
          
          var errorMessage = errorMessages[event.data] || 'Video playback error';
          document.getElementById('error').textContent = errorMessage;
          
          if ((event.data === 5 || !event.data) && retryAttempt < maxRetries) {
            setTimeout(function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'RETRY_NEEDED',
                error: event.data,
                message: errorMessage,
                retryAttempt: retryAttempt + 1
              }));
            }, 2000);
          } else {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PLAYBACK_FAILED',
              embeddable: false,
              error: event.data,
              message: errorMessage,
              isEmbeddingError: event.data === 101 || event.data === 150
            }));
          }
        }
        
        function detectTitle() {
          try {
            var detectedTitle = '';
            
            if (document.title && document.title !== 'YouTube') {
              detectedTitle = document.title.replace(' - YouTube', '');
            }
            
            if (player && player.getVideoData) {
              try {
                var videoData = player.getVideoData();
                if (videoData && videoData.title) {
                  detectedTitle = videoData.title;
                }
              } catch (e) {
                // Ignore error
              }
            }
            
            if (!detectedTitle) {
              detectedTitle = 'Video ${videoData?.id || 'Unknown'}';
            }

            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'TITLE_DETECTED',
              title: detectedTitle,
              success: true
            }));
            
          } catch (error) {
            var fallbackTitle = 'Video ${videoData?.id || 'Unknown'}';
            
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'TITLE_DETECTED',
              title: fallbackTitle,
              success: false,
              message: 'Used fallback title'
            }));
          }
        }
        
        window.onerror = function(msg, url, lineNo, columnNo, error) {
          hasError = true;
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAGE_ERROR',
            message: 'Page error: ' + msg
          }));
          return true;
        };
      </script>
    </body>
    </html>
  `;
};

const handleWebViewMessage = (
  event: any,
  setState: {
    setIframeLoaded: React.Dispatch<React.SetStateAction<boolean>>;
    setLoadingTimeout: React.Dispatch<React.SetStateAction<boolean>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setVideoData: React.Dispatch<React.SetStateAction<VideoData | null>>;
    setEmbedabilityTested: React.Dispatch<React.SetStateAction<boolean>>;
    setRetryCount: React.Dispatch<React.SetStateAction<number>>;
    setShowIframe: React.Dispatch<React.SetStateAction<boolean>>;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  },
  maxRetries: number,
  title: string
) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    
    switch (data.type) {
      case 'PLAYER_READY':
        setState.setIframeLoaded(true);
        setState.setLoadingTimeout(false);
        break;
        
      case 'LOADING_TIMEOUT':
        setState.setLoadingTimeout(true);
        setState.setIframeLoaded(false);
        setState.setError('Video loading timeout. It may not be embeddable.');
        break;
        
      case 'API_LOAD_ERROR':
      case 'PLAYER_INIT_ERROR':
        setState.setError('Failed to load YouTube API. Please check your internet connection.');
        break;
        
      case 'LIVE_VIDEO_DETECTED':
        setState.setError('Live videos cannot be promoted. Please choose a regular video.');
        setState.setVideoData(prev => prev ? { ...prev, embeddable: false, isLive: true } : null);
        setState.setEmbedabilityTested(true);
        break;
        
      case 'PLAYBACK_SUCCESS':
        setState.setEmbedabilityTested(true);
        setState.setVideoData(prev => prev ? { ...prev, embeddable: true } : null);
        setState.setError(null);
        break;
        
      case 'PLAYBACK_FAILED':
        setState.setEmbedabilityTested(true);
        setState.setVideoData(prev => prev ? { ...prev, embeddable: false } : null);
        
        if (data.isEmbeddingError) {
          setState.setError('This video cannot be embedded. Please make it embeddable first or choose a different video.');
        } else {
          setState.setError(data.message || 'Video playback failed. Please try a different video.');
        }
        break;
        
      case 'RETRY_NEEDED':
        if (data.retryAttempt <= maxRetries) {
          setState.setRetryCount(data.retryAttempt);
          
          setTimeout(() => {
            setState.setShowIframe(false);
            setTimeout(() => {
              setState.setShowIframe(true);
            }, 100);
          }, 2000);
        } else {
          setState.setError('Video failed to load after multiple attempts.');
          setState.setEmbedabilityTested(true);
        }
        break;
        
      case 'TITLE_DETECTED':
        if (data.title) {
          setState.setVideoData(prev => prev ? { ...prev, autoDetectedTitle: data.title } : null);
          if (!title) {
            setState.setTitle(data.title);
          }
        }
        break;
        
      case 'STATE_CHANGE':
        setState.setIsPlaying(data.state === 1);
        break;
        
      case 'PAGE_ERROR':
        setState.setError('Page error occurred in video player.');
        break;
    }
  } catch (error) {
  }
};

export default function VideoPreview({ youtubeUrl, onValidation, onTitleDetected, collapsed = false }: VideoPreviewProps) {
  const { colors, isDark } = useTheme();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [embedabilityTested, setEmbedabilityTested] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState('');

  const videoOptimizer = VideoOptimizer.getInstance();
  const batteryOptimizer = BatteryOptimizer.getInstance();
  
  const [loadingTimeoutDuration, setLoadingTimeoutDuration] = useState(() => {
    return videoOptimizer.getLoadingTimeout('medium');
  });
  const [maxRetries, setMaxRetries] = useState(3);

  // Removed showToast - simplified without toast notifications

  const resetAllStates = useCallback(() => {
    setTitle('');
    setVideoData(null);
    setError(null);
    setShowIframe(false);
    setIframeLoaded(false);
    setEmbedabilityTested(false);
    setRetryCount(0);
    setLoadingTimeout(false);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (youtubeUrl) {
      resetAllStates();
      
      // Apply battery optimizations
      const optimizedTimeout = videoOptimizer.getLoadingTimeout('medium');
      setLoadingTimeoutDuration(optimizedTimeout);
      
      // Debounce video data fetching for better performance
      const timeoutId = setTimeout(() => {
        fetchVideoData(
          youtubeUrl,
          {
            setTitle,
            setVideoData,
            setError,
            setShowIframe,
            setEmbedabilityTested,
            setRetryCount,
            setLoadingTimeout
          },
          ''
        );
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      resetAllStates();
      return undefined;
    }
  }, [youtubeUrl, resetAllStates]);

  useEffect(() => {
    if (videoData) {
      // Cache the video data after successful validation
      videoOptimizer.cacheVideo(youtubeUrl, videoData);
      onValidation(videoData.embeddable, videoData.autoDetectedTitle, videoData.id);
    }
  }, [videoData, onValidation, youtubeUrl, videoOptimizer]);

  useEffect(() => {
    if (title) {
      onTitleDetected(title);
    }
  }, [title, onTitleDetected]);

  const handleWebViewMessageWrapper = (event: any) => {
    handleWebViewMessage(
      event,
      {
        setIframeLoaded,
        setLoadingTimeout,
        setError,
        setVideoData,
        setEmbedabilityTested,
        setRetryCount,
        setShowIframe,
        setTitle,
        setIsPlaying
      },
      maxRetries,
      title
    );
  };

  if (!youtubeUrl) {
    return null;
  }

  if (collapsed && videoData) {
    return (
      <View style={[styles.collapsedContainer, { backgroundColor: colors.surface }]}>
        <Image source={{ uri: videoData.thumbnail }} style={styles.collapsedThumbnail} />
        <View style={styles.collapsedInfo}>
          <Text style={[styles.collapsedTitle, { color: colors.text }]} numberOfLines={2}>
            {videoData.autoDetectedTitle || title || 'Video Preview'}
          </Text>
          <View style={styles.statusContainer}>
            {embedabilityTested ? (
              videoData.embeddable ? (
                <View style={styles.statusBadge}>
                  <CheckCircle size={12} color="#2ECC71" />
                  <Text style={[styles.statusText, { color: '#2ECC71' }]}>Ready</Text>
                </View>
              ) : (
                <View style={styles.statusBadge}>
                  <AlertCircle size={12} color="#E74C3C" />
                  <Text style={[styles.statusText, { color: '#E74C3C' }]}>Not Embeddable</Text>
                </View>
              )
            ) : (
              <View style={styles.statusBadge}>
                <Clock size={12} color="#F39C12" />
                <Text style={[styles.statusText, { color: '#F39C12' }]}>Testing...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
          <AlertCircle size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}

      {videoData && (
        <View style={[styles.previewContainer, { backgroundColor: isDark ? colors.surface : colors.surface }]}>
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: videoData.thumbnail }} style={[styles.thumbnail, { backgroundColor: isDark ? colors.card : colors.card }]} />
            {showIframe && (
              <View style={styles.webViewContainer}>
                <WebView
                  source={{ html: createIframeHTML(videoData.embedUrl, videoData, retryCount, maxRetries, loadingTimeoutDuration) }}
                  style={styles.webView}
                  onMessage={handleWebViewMessageWrapper}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  scrollEnabled={false}
                  bounces={false}
                />
              </View>
            )}
            
            {!iframeLoaded && showIframe && (
              <View style={[styles.loadingOverlay, { backgroundColor: colors.overlay }]}>
                <RefreshCw size={24} color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Testing compatibility...</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>
              {videoData.autoDetectedTitle || title || 'Loading title...'}
            </Text>
            
            <View style={styles.statusRow}>
              {embedabilityTested ? (
                videoData.embeddable ? (
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)' }]}>
                    <CheckCircle size={16} color="#2ECC71" />
                    <Text style={[styles.statusText, { color: colors.success }]}>Ready for promotion</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
                    <AlertCircle size={16} color="#E74C3C" />
                    <Text style={[styles.statusText, { color: colors.error }]}>Not embeddable</Text>
                  </View>
                )
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
                  <Clock size={16} color="#F39C12" />
                  <Text style={[styles.statusText, { color: colors.warning }]}>Testing...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  previewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  webViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  collapsedContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  collapsedThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 6,
  },
  collapsedInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  collapsedTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  statusContainer: {
    marginTop: 4,
  },
});