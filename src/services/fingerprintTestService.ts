/**
 * Fingerprint Test Service
 * 
 * Frontend service for running fingerprint validation tests
 * 
 * @author Beast Browser Team
 */

declare global {
  interface Window {
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export interface TestResult {
  passed: boolean;
  warning?: boolean;
  message: string;
  error?: string;
  [key: string]: any;
}

export interface TestSuiteResult {
  timestamp: string;
  tests: {
    [testName: string]: TestResult;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export type TestName = 'launch' | 'webrtc' | 'canvas' | 'webgl' | 'cloudflare' | 'turnstile';

class FingerprintTestService {
  /**
   * Run all fingerprint tests
   */
  async runAllTests(
    chromePath: string,
    userDataDir: string,
    proxy?: string
  ): Promise<TestSuiteResult> {
    try {
      return await window.electron.invoke('fingerprint:runAllTests', chromePath, userDataDir, proxy);
    } catch (error: any) {
      console.error('Failed to run test suite:', error);
      return {
        timestamp: new Date().toISOString(),
        tests: {},
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          warnings: 0
        }
      };
    }
  }

  /**
   * Run a single quick test
   */
  async quickTest(
    testName: TestName,
    chromePath: string,
    userDataDir: string,
    proxy?: string
  ): Promise<TestResult> {
    try {
      return await window.electron.invoke('fingerprint:quickTest', testName, chromePath, userDataDir, proxy);
    } catch (error: any) {
      console.error(`Failed to run test ${testName}:`, error);
      return {
        passed: false,
        error: error.message || 'Unknown error',
        message: 'Test failed to execute'
      };
    }
  }
}

export const fingerprintTestService = new FingerprintTestService();
