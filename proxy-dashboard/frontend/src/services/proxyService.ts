/**
 * Proxy Service
 * 
 * Frontend service for communicating with proxy testing API
 * Handles HTTP requests and error handling
 * 
 * @author Beast Browser Team
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface ProxyConfig {
  host: string;
  port: number;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
}

export interface ProxyTestResult {
  status: 'working' | 'failed';
  host: string;
  port: number;
  type: string;
  ip?: string;
  latency?: number;
  totalTime: number;
  endpoint?: string;
  error?: string;
  errorType?: string;
}

export interface BatchTestResponse {
  success: boolean;
  results: ProxyTestResult[];
  stats: {
    total: number;
    working: number;
    failed: number;
    avgLatency: number;
  };
}

/**
 * Test single proxy
 */
export async function testProxy(config: ProxyConfig): Promise<ProxyTestResult> {
  try {
    console.log('📡 Sending test request to API:', config);
    
    const response = await fetch(`${API_BASE_URL}/test-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ API response:', data);

    if (!data.success) {
      throw new Error(data.error || 'Test failed');
    }

    return data.result;
  } catch (error: any) {
    console.error('❌ API request failed:', error);
    throw new Error(error.message || 'Failed to test proxy');
  }
}

/**
 * Test multiple proxies concurrently
 */
export async function testMultipleProxies(
  proxies: ProxyConfig[],
  concurrency: number = 5
): Promise<BatchTestResponse> {
  try {
    console.log(`📡 Sending batch test request: ${proxies.length} proxies`);
    
    const response = await fetch(`${API_BASE_URL}/test-proxies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ proxies, concurrency })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Batch test complete:', data);

    if (!data.success) {
      throw new Error(data.error || 'Batch test failed');
    }

    return data;
  } catch (error: any) {
    console.error('❌ Batch test failed:', error);
    throw new Error(error.message || 'Failed to test proxies');
  }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
