import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import BatteryOptimizer from '../utils/BatteryOptimizer';

/**
 * Hook for integrating battery optimization into React components
 */
export const useBatteryOptimization = () => {
  const batteryOptimizer = useRef(BatteryOptimizer.getInstance());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const scheduleOptimizedTask = (taskId: string, task: () => void, interval: number) => {
    batteryOptimizer.current.scheduleTask(taskId, task, interval);
  };

  const cancelOptimizedTask = (taskId: string) => {
    batteryOptimizer.current.cancelTask(taskId);
  };

  const isLowPowerMode = () => {
    return batteryOptimizer.current.isInLowPowerMode();
  };

  const getCurrentAppState = () => {
    return batteryOptimizer.current.getAppState();
  };

  return {
    scheduleOptimizedTask,
    cancelOptimizedTask,
    isLowPowerMode,
    getCurrentAppState,
    isBackground: appStateRef.current === 'background',
    isActive: appStateRef.current === 'active',
  };
};
