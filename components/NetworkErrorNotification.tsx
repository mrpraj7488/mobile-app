import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NetworkErrorNotificationProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const NetworkErrorNotification: React.FC<NetworkErrorNotificationProps> = ({ 
  error, 
  onRetry, 
  onDismiss 
}) => {
  if (!error) return null;

  const isNetworkError = error.includes('internet') || error.includes('network') || error.includes('connection');
  const isNoVideosError = error.includes('No videos available');

  return (
    <View style={[
      styles.container,
      isNetworkError ? styles.networkError : styles.infoError
    ]}>
      <View style={styles.content}>
        <Ionicons 
          name={isNetworkError ? "wifi-outline" : "information-circle-outline"} 
          size={24} 
          color={isNetworkError ? "#ff6b6b" : "#4dabf7"} 
          style={styles.icon}
        />
        <Text style={[
          styles.errorText,
          isNetworkError ? styles.networkErrorText : styles.infoErrorText
        ]}>
          {error}
        </Text>
      </View>
      
      <View style={styles.actions}>
        {isNetworkError && onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  networkError: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  infoError: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4dabf7',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  networkErrorText: {
    color: '#d63031',
  },
  infoErrorText: {
    color: '#0984e3',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  retryButton: {
    backgroundColor: '#4dabf7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
});

export default NetworkErrorNotification;
