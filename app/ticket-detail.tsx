import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Animated
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Paperclip, X, ArrowLeft, Shield, User as UserIcon, FileText, Image as ImageIcon, Download, Check, RefreshCw, CircleAlert as AlertCircle, Clock, MessageSquare, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { getSupabase } from '@/lib/supabase';
import { useNotification } from '@/contexts/NotificationContext';
import CustomAlert from '@/components/CustomAlert';
import * as DocumentPicker from 'expo-document-picker';
import FileUploadService from '@/services/FileUploadService';
import * as Haptics from 'expo-haptics';
import { useNetwork } from '../services/NetworkHandler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isTinyScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = ReAnimated.createAnimatedComponent(TouchableOpacity);

function TicketDetailScreen() {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const supabase = getSupabase();
  const { showError, showSuccess, showInfo } = useNotification();
  const { showNetworkAlert } = useNetwork();
  const scrollViewRef = useRef(null);

  // State
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animation values for enhanced interactions
  const sendButtonScale = useSharedValue(1);
  const attachButtonScale = useSharedValue(1);

  // Load ticket data
  useEffect(() => {
    if (params.id) {
      loadTicketData();
      setupRealtimeSubscription();
      
      // Animate on mount
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, [params.id]);

  const setupRealtimeSubscription = () => {
    if (!params.id || !user?.id) return;

    const subscription = supabase
      .channel(`ticket_${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          loadTicketData();
        }
      )
      .subscribe();

    setRealtimeSubscription(subscription);
  };

  const loadTicketData = async () => {
    if (!params.id) return;

    setLoading(true);
    try {
      // Load ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', params.id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Load conversation
      const { data: conversationData, error: conversationError } = await supabase
        .rpc('get_ticket_conversation', { p_ticket_id: params.id });

      if (conversationError) throw conversationError;
      
      // Format messages
      const formattedMessages = conversationData || [];
      
      // Add initial message
      if (ticketData) {
        formattedMessages.unshift({
          id: 'initial',
          user_id: ticketData.reported_by,
          message: ticketData.description,
          is_admin: false,
          created_at: ticketData.created_at,
          attachments: ticketData.attachments || []
        });
      }

      setMessages(formattedMessages);
      
      // Mark as read
      if (ticketData && !ticketData.is_read) {
        await supabase
          .from('support_tickets')
          .update({ is_read: true })
          .eq('id', params.id);
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error loading ticket:', error);
      
      // Check for network errors and show appropriate alert
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        console.log('🚨 NETWORK ERROR in loadTicket - Showing network alert');
        showNetworkAlert();
      } else {
        showError('Error', 'Failed to load ticket details');
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTicketData();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!user?.id || !params.id) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate send button
    sendButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSending(true);
    try {
      // Upload attachments if any
      let attachmentData = [];
      if (attachments.length > 0) {
        try {
          // Ensure storage bucket exists
          await FileUploadService.ensureBucketExists();
          
          // Upload files to ticket folder
          const uploadedFiles = await FileUploadService.uploadMultipleFiles(
            attachments,
            params.id as string,
            user.id
          );
          
          // Format attachment data with URLs
          attachmentData = uploadedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.url,
            path: file.path,
            uploaded_at: new Date().toISOString()
          }));
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          showError('Upload Failed', 'Failed to upload attachments. Please try again.');
          setSending(false);
          return;
        }
      }

      // Add message
      const { data, error } = await supabase.rpc('add_ticket_message', {
        p_ticket_id: params.id,
        p_user_id: user.id,
        p_message: newMessage.trim(),
        p_is_admin: false,
        p_attachments: attachmentData
      });

      if (error) throw error;

      // Clear input
      setNewMessage('');
      setAttachments([]);

      // Reload conversation
      await loadTicketData();

      showSuccess('Message Sent', 'Your message has been sent successfully');

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check for network errors and show appropriate alert
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch') || errorMessage.includes('TypeError')) {
        console.log('🚨 NETWORK ERROR in sendMessage - Showing network alert');
        showNetworkAlert();
      } else {
        showError('Error', 'Failed to send message');
      }
    } finally {
      setSending(false);
    }
  };

  const handlePickDocument = async () => {
    if (attachments.length >= 3) {
      showError('Limit Reached', 'You can only attach up to 3 files per message');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate attach button
    attachButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          showError('File Too Large', 'File size must be less than 5MB');
          return;
        }

        setAttachments([...attachments, {
          name: file.name,
          size: file.size,
          uri: file.uri,
          mimeType: file.mimeType || 'application/octet-stream'
        }]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = (status) => {
    const iconSize = isTinyScreen ? 16 : 18;
    switch(status) {
      case 'active': return <AlertCircle size={iconSize} color={colors.primary} />;
      case 'pending': return <Clock size={iconSize} color={colors.warning} />;
      case 'answered': return <MessageSquare size={iconSize} color={colors.accent} />;
      case 'completed': return <CheckCircle size={iconSize} color={colors.success} />;
      case 'closed': return <XCircle size={iconSize} color={colors.textSecondary} />;
      default: return <AlertCircle size={iconSize} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return colors.primary;
      case 'pending': return colors.warning;
      case 'answered': return colors.accent;
      case 'completed': return colors.success;
      case 'closed': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const renderMessage = ({ item, index }) => {
    const isAdmin = item.is_admin;
    const isCurrentUser = !isAdmin;
    const messageTime = new Date(item.created_at);
    const timeString = messageTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

    return (
      <Animated.View 
        style={[
          styles.messageWrapper,
          isCurrentUser ? styles.userMessageWrapper : styles.adminMessageWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Avatar for admin messages - LEFT SIDE */}
        {isAdmin && (
          <View style={[
            styles.avatar, 
            { backgroundColor: colors.primary }
          ]}>
            <Shield size={isTinyScreen ? 14 : 16} color="white" />
          </View>
        )}
        
        <View style={styles.messageContent}>
          {/* Sender name label */}
          <Text style={[
            styles.senderLabel,
            {
              color: isAdmin 
                ? (isDark ? colors.primary + 'DD' : colors.primary) 
                : (isDark ? colors.accent + 'DD' : colors.accent),
              textAlign: isCurrentUser ? 'right' : 'left',
              marginLeft: isAdmin ? (isTinyScreen ? 8 : 10) : 0,
              marginRight: isCurrentUser ? (isTinyScreen ? 8 : 10) : 0,
              fontWeight: '600',
              opacity: isDark ? 0.95 : 1
            }
          ]}>
            {isAdmin ? 'Support Team' : userName}
          </Text>
          
          {/* Message bubble with tail */}
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.userBubble : styles.adminBubble,
            { 
              backgroundColor: isCurrentUser 
                ? (isDark ? colors.primary + '25' : colors.primary + '10')
                : (isDark ? colors.surface : colors.card),
              maxWidth: screenWidth * (isTinyScreen ? 0.8 : 0.75),
              borderWidth: 1,
              borderColor: isCurrentUser 
                ? (isDark ? colors.primary + '60' : colors.primary + '40')
                : (isDark ? colors.border + '80' : colors.border)
            }
          ]}>
            {/* Message text */}
            <Text style={[
              styles.messageText, 
              { 
                color: isDark ? colors.text : colors.text,
                fontSize: isTinyScreen ? 13 : 14,
                lineHeight: isTinyScreen ? 18 : 20,
                fontWeight: '400'
              }
            ]}>
              {item.message}
            </Text>

            {/* Attachments */}
            {item.attachments && item.attachments.length > 0 && (
              <View style={styles.messageAttachments}>
                {item.attachments.map((attachment: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[
                      styles.attachmentChip,
                      { 
                        backgroundColor: isDark ? colors.card : colors.surface,
                        borderColor: isDark ? colors.border + '60' : colors.border
                      }
                    ]}
                    onPress={async () => {
                      if (attachment.url) {
                        const downloadUrl = await FileUploadService.getDownloadUrl(attachment.path);
                        if (downloadUrl) {
                          showInfo('Opening File', `Opening ${attachment.name}...`);
                        }
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {attachment.type?.includes('image') ? (
                      <ImageIcon size={isTinyScreen ? 12 : 14} color={colors.primary} />
                    ) : (
                      <FileText size={isTinyScreen ? 12 : 14} color={colors.primary} />
                    )}
                    <Text 
                      style={[
                        styles.attachmentName, 
                        { 
                          color: isDark ? colors.text : colors.text,
                          fontWeight: '500'
                        }
                      ]} 
                      numberOfLines={1}
                    >
                      {attachment.name}
                    </Text>
                    <Download size={isTinyScreen ? 10 : 12} color={colors.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Time and status */}
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime, 
                { 
                  color: isDark ? colors.textSecondary + 'CC' : colors.textSecondary,
                  fontSize: isTinyScreen ? 10 : 11,
                  opacity: isDark ? 0.9 : 0.8
                }
              ]}>
                {timeString}
              </Text>
              {isCurrentUser && (
                <Text style={[
                  styles.messageStatus,
                  {
                    color: item.sent === false ? colors.error : colors.success,
                    fontSize: isTinyScreen ? 10 : 11,
                    fontWeight: '600'
                  }
                ]}>
                  {item.sent === false ? 'Failed' : 'Sent'}
                </Text>
              )}
            </View>
          </View>
        </View>
        
        {/* Avatar for user messages - RIGHT SIDE */}
        {isCurrentUser && (
          <View style={[
            styles.avatar, 
            { backgroundColor: colors.accent }
          ]}>
            <Text style={[
              styles.avatarText,
              { fontSize: isTinyScreen ? 12 : 14 }
            ]}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // Animated styles
  const sendButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const attachButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: attachButtonScale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? [colors.headerBackground, colors.surface] : [colors.primary, colors.primary]}
          style={styles.gradientHeader}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading...</Text>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading ticket details...
          </Text>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Ticket not found
          </Text>
          <TouchableOpacity 
            style={[styles.errorButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'completed';

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Enhanced Header with Gradient */}
        <LinearGradient
          colors={isDark 
            ? [colors.headerBackground + 'F0', colors.surface + '95'] 
            : [colors.primary, colors.primary + 'CC']
          }
          style={styles.gradientHeader}
        >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={[
              styles.headerTitle,
              {
                textShadowColor: isDark ? 'transparent' : 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
                fontWeight: '700'
              }
            ]} numberOfLines={1}>
              #{ticket.id.slice(0, 8)}
            </Text>
            <View style={[
              styles.statusBadge, 
              { 
                backgroundColor: isDark 
                  ? getStatusColor(ticket.status) + '35'
                  : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark 
                  ? getStatusColor(ticket.status) + '60'
                  : getStatusColor(ticket.status),
                borderWidth: isDark ? 1 : 2
              }
            ]}>
              {getStatusIcon(ticket.status)}
              <Text style={[
                styles.statusText, 
                { 
                  color: isDark 
                    ? getStatusColor(ticket.status)
                    : getStatusColor(ticket.status),
                  fontWeight: '800',
                  textShadowColor: isDark ? 'transparent' : 'rgba(0,0,0,0.1)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 1
                }
              ]}>
                {ticket.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <RefreshCw size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Enhanced Ticket Info */}
      <View style={[styles.ticketInfo, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={isDark 
            ? ['rgba(74, 144, 226, 0.12)', 'rgba(74, 144, 226, 0.04)']
            : ['rgba(128, 0, 128, 0.10)', 'rgba(128, 0, 128, 0.02)']
          }
          style={styles.ticketInfoGradient}
        >
          <Text style={[
            styles.ticketTitle, 
            { 
              color: isDark ? colors.text + 'F0' : colors.text,
              fontWeight: '700',
              textShadowColor: isDark ? 'transparent' : 'rgba(255,255,255,0.5)',
              textShadowOffset: { width: 0, height: 0.5 },
              textShadowRadius: 1
            }
          ]}>
            {ticket.title}
          </Text>
          <View style={styles.ticketMeta}>
            <View style={[
              styles.metaChip, 
              { 
                backgroundColor: isDark 
                  ? colors.primary + '20'
                  : colors.primary + '15',
                borderColor: isDark 
                  ? colors.primary + '40'
                  : colors.primary + '60',
                borderWidth: isDark ? 1 : 1.5
              }
            ]}>
              <Text style={[
                styles.ticketMetaText, 
                { 
                  color: isDark ? colors.primary : colors.primary,
                  fontWeight: '700',
                  textShadowColor: isDark ? 'transparent' : 'rgba(255,255,255,0.8)',
                  textShadowOffset: { width: 0, height: 0.5 },
                  textShadowRadius: 0.5
                }
              ]}>
                {ticket.category}
              </Text>
            </View>
            <View style={[
              styles.metaChip, 
              { 
                backgroundColor: isDark 
                  ? colors.warning + '20'
                  : colors.warning + '15',
                borderColor: isDark 
                  ? colors.warning + '40'
                  : colors.warning + '60',
                borderWidth: isDark ? 1 : 1.5
              }
            ]}>
              <Text style={[
                styles.ticketMetaText, 
                { 
                  color: isDark ? colors.warning : colors.warning,
                  fontWeight: '700',
                  textShadowColor: isDark ? 'transparent' : 'rgba(255,255,255,0.8)',
                  textShadowOffset: { width: 0, height: 0.5 },
                  textShadowRadius: 0.5
                }
              ]}>
                {ticket.priority}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Enhanced Chat Background */}
      <View style={[
        styles.chatBackground, 
        { backgroundColor: isDark ? colors.background + 'F5' : colors.background + 'FA' }
      ]}>
        {/* Messages */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
        />
      </View>

      {/* Enhanced Input Area */}
      {!isTicketClosed && (
        <View style={[
          styles.inputArea, 
          { 
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          }
        ]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(74, 144, 226, 0.05)', 'transparent']
              : ['rgba(128, 0, 128, 0.05)', 'transparent']
            }
            style={styles.inputAreaGradient}
          >
            {/* Enhanced Attachments Preview */}
            {attachments.length > 0 && (
              <ScrollView 
                horizontal 
                style={styles.attachmentsPreview}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.attachmentsPreviewContent}
              >
                {attachments.map((attachment, index) => (
                  <View key={index} style={[
                    styles.attachmentPreview, 
                    { 
                      backgroundColor: colors.surface,
                      borderColor: colors.border
                    }
                  ]}>
                    <FileText size={isTinyScreen ? 12 : 14} color={colors.primary} />
                    <Text style={[styles.attachmentPreviewName, { color: colors.text }]} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removeAttachment(index)}
                      style={styles.removeAttachment}
                      activeOpacity={0.7}
                    >
                      <XCircle size={isTinyScreen ? 16 : 18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {/* Enhanced Input Row */}
            <View style={styles.inputRow}>
              <AnimatedTouchableOpacity 
                style={[
                  styles.attachButton,
                  { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: attachments.length >= 3 ? 0.5 : 1
                  },
                  attachButtonAnimatedStyle
                ]}
                onPress={handlePickDocument}
                disabled={attachments.length >= 3}
                activeOpacity={0.7}
              >
                <Paperclip 
                  size={isTinyScreen ? 18 : 20} 
                  color={attachments.length >= 3 ? colors.textSecondary : colors.primary} 
                />
              </AnimatedTouchableOpacity>
              
              <View style={[
                styles.messageInputContainer,
                { 
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border
                }
              ]}>
                <TextInput
                  style={[styles.messageInput, { color: colors.text }]}
                  placeholder="Type your message..."
                  placeholderTextColor={colors.textSecondary}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={500}
                />
              </View>
              
              <AnimatedTouchableOpacity 
                style={[
                  styles.sendButton, 
                  { 
                    backgroundColor: (!newMessage.trim() && attachments.length === 0) || sending 
                      ? colors.textSecondary
                      : colors.primary,
                  },
                  sendButtonAnimatedStyle
                ]}
                onPress={handleSendMessage}
                disabled={(!newMessage.trim() && attachments.length === 0) || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={isTinyScreen ? 18 : 20} color="white" />
                )}
              </AnimatedTouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Enhanced Closed Ticket Notice */}
      {isTicketClosed && (
        <View style={[styles.closedNotice, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark 
              ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']
              : ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']
            }
            style={styles.closedNoticeGradient}
          >
            <CheckCircle size={isTinyScreen ? 18 : 20} color={getStatusColor(ticket.status)} />
            <Text style={[styles.closedNoticeText, { color: colors.text }]}>
              This ticket has been {ticket.status}
            </Text>
          </LinearGradient>
        </View>
      )}

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + (isTinyScreen ? 12 : 16) : (isTinyScreen ? 45 : 50),
    paddingBottom: isTinyScreen ? 10 : 12,
    paddingHorizontal: isTinyScreen ? 12 : isSmallScreen ? 16 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  backButton: {
    padding: isTinyScreen ? 6 : 8,
    width: isTinyScreen ? 36 : 40,
    height: isTinyScreen ? 36 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 6 : 8,
    marginHorizontal: isTinyScreen ? 8 : 12,
  },
  headerTitle: {
    fontSize: isTinyScreen ? 18 : 22,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: isTinyScreen ? 36 : 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 6 : 8,
    paddingVertical: isTinyScreen ? 3 : 4,
    borderRadius: isTinyScreen ? 10 : 12,
    gap: isTinyScreen ? 3 : 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusText: {
    fontSize: isTinyScreen ? 9 : 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  refreshButton: {
    padding: isTinyScreen ? 6 : 8,
    width: isTinyScreen ? 36 : 40,
    height: isTinyScreen ? 36 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 18 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: isTinyScreen ? 12 : 16,
  },
  loadingText: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 20 : 32,
    gap: isTinyScreen ? 16 : 20,
  },
  errorText: {
    fontSize: isTinyScreen ? 16 : 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: isTinyScreen ? 20 : 24,
    paddingVertical: isTinyScreen ? 10 : 12,
    borderRadius: isTinyScreen ? 8 : 10,
  },
  errorButtonText: {
    color: 'white',
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: '600',
  },
  ticketInfo: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    overflow: 'hidden',
  },
  ticketInfoGradient: {
    padding: isTinyScreen ? 12 : isSmallScreen ? 14 : 16,
  },
  ticketTitle: {
    fontSize: isTinyScreen ? 16 : isSmallScreen ? 17 : 18,
    fontWeight: '600',
    marginBottom: isTinyScreen ? 8 : 10,
    lineHeight: isTinyScreen ? 20 : 24,
  },
  ticketMeta: {
    flexDirection: 'row',
    gap: isTinyScreen ? 8 : 10,
    flexWrap: 'wrap',
  },
  metaChip: {
    paddingHorizontal: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 12 : 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ticketMetaText: {
    fontSize: isTinyScreen ? 11 : 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chatBackground: {
    flex: 1,
  },
  messagesContainer: {
    padding: isTinyScreen ? 10 : isSmallScreen ? 12 : 16,
    paddingBottom: isTinyScreen ? 16 : 20,
  },
  messageSeparator: {
    height: isTinyScreen ? 6 : 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  adminMessageWrapper: {
    justifyContent: 'flex-start',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: isTinyScreen ? 32 : 36,
    height: isTinyScreen ? 32 : 36,
    borderRadius: isTinyScreen ? 16 : 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: isTinyScreen ? 6 : 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
  },
  messageContent: {
    maxWidth: isTinyScreen ? '78%' : '75%',
    position: 'relative',
  },
  senderLabel: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '600',
    marginBottom: isTinyScreen ? 3 : 4,
    letterSpacing: 0.3,
  },
  messageBubble: {
    paddingHorizontal: isTinyScreen ? 10 : 12,
    paddingVertical: isTinyScreen ? 8 : 10,
    borderRadius: isTinyScreen ? 14 : 16,
    position: 'relative',
    minWidth: isTinyScreen ? 60 : 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userBubble: {
    borderTopRightRadius: isTinyScreen ? 4 : 6,
    marginRight: isTinyScreen ? 6 : 8,
  },
  adminBubble: {
    borderTopLeftRadius: isTinyScreen ? 4 : 6,
    marginLeft: isTinyScreen ? 6 : 8,
  },
  messageText: {
    letterSpacing: 0.2,
  },
  messageAttachments: {
    marginTop: isTinyScreen ? 8 : 10,
    gap: isTinyScreen ? 4 : 6,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 10 : 12,
    gap: isTinyScreen ? 4 : 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  attachmentName: {
    fontSize: isTinyScreen ? 11 : 12,
    flex: 1,
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: isTinyScreen ? 4 : 6,
    justifyContent: 'flex-end',
    gap: isTinyScreen ? 4 : 6,
  },
  messageTime: {
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageStatus: {
    fontWeight: '500',
    fontStyle: 'italic',
  },
  inputArea: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? (isTinyScreen ? 20 : 25) : (isTinyScreen ? 8 : 10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  inputAreaGradient: {
    paddingHorizontal: isTinyScreen ? 10 : isSmallScreen ? 12 : 16,
    paddingTop: isTinyScreen ? 8 : 10,
  },
  attachmentsPreview: {
    maxHeight: isTinyScreen ? 40 : 45,
    marginBottom: isTinyScreen ? 8 : 10,
  },
  attachmentsPreviewContent: {
    paddingRight: isTinyScreen ? 8 : 12,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 14 : 16,
    marginRight: isTinyScreen ? 6 : 8,
    gap: isTinyScreen ? 4 : 6,
    borderWidth: 1,
    maxWidth: isTinyScreen ? 140 : 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attachmentPreviewName: {
    fontSize: isTinyScreen ? 11 : 12,
    flex: 1,
    fontWeight: '500',
  },
  removeAttachment: {
    padding: isTinyScreen ? 2 : 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: isTinyScreen ? 8 : 10,
  },
  attachButton: {
    width: isTinyScreen ? 40 : 44,
    height: isTinyScreen ? 40 : 44,
    borderRadius: isTinyScreen ? 20 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageInputContainer: {
    flex: 1,
    borderRadius: isTinyScreen ? 20 : 22,
    borderWidth: 1,
    minHeight: isTinyScreen ? 40 : 44,
    maxHeight: isTinyScreen ? 100 : 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageInput: {
    fontSize: isTinyScreen ? 13 : 14,
    paddingHorizontal: isTinyScreen ? 12 : 14,
    paddingVertical: Platform.OS === 'ios' ? (isTinyScreen ? 10 : 12) : (isTinyScreen ? 6 : 8),
    minHeight: isTinyScreen ? 40 : 44,
    maxHeight: isTinyScreen ? 90 : 100,
    textAlignVertical: 'center',
    lineHeight: isTinyScreen ? 18 : 20,
  },
  sendButton: {
    width: isTinyScreen ? 40 : 44,
    height: isTinyScreen ? 40 : 44,
    borderRadius: isTinyScreen ? 20 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  closedNotice: {
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    overflow: 'hidden',
  },
  closedNoticeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTinyScreen ? 12 : 16,
    gap: isTinyScreen ? 6 : 8,
  },
  closedNoticeText: {
    fontSize: isTinyScreen ? 13 : 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default TicketDetailScreen;