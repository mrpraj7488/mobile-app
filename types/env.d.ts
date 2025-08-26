declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ENV: string;
      EXPO_PUBLIC_API_BASE_URL: string;
    }
  }
}

export {};