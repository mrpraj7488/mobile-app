// Polyfill for structuredClone if not available
import { useEffect } from 'react';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  };
}

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    window.frameworkReady?.();
  });
}
