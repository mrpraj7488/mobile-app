import { useConfig } from '../contexts/ConfigContext';

export interface FeatureFlags {
  coinsEnabled: boolean;
  adsEnabled: boolean;
  vipEnabled: boolean;
  referralsEnabled: boolean;
  analyticsEnabled: boolean;
}

export function useFeatureFlags(): FeatureFlags {
  const { config } = useConfig();

  return {
    coinsEnabled: config?.features.coinsEnabled ?? true,
    adsEnabled: config?.features.adsEnabled ?? true,
    vipEnabled: config?.features.vipEnabled ?? true,
    referralsEnabled: config?.features.referralsEnabled ?? true,
    analyticsEnabled: config?.features.analyticsEnabled ?? true,
  };
}

export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[flagName];
}