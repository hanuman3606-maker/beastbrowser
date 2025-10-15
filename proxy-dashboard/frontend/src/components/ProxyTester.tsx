/**
 * Proxy Tester Component
 * 
 * React component for testing proxies with real-time status updates
 * Supports HTTP, HTTPS, SOCKS4, and SOCKS5 proxies
 * 
 * Features:
 * - Single proxy testing
 * - Batch proxy testing
 * - Real-time status updates
 * - Latency display
 * - Error handling with detailed messages
 * 
 * @author Beast Browser Team
 */

import React, { useState } from 'react';
import { testProxy, testMultipleProxies, ProxyConfig, ProxyTestResult } from '../services/proxyService';
import { CheckCircle, XCircle, Loader, AlertCircle, Clock, Globe } from 'lucide-react';

interface ProxyFormData {
  host: string;
  port: string;
  type: 'http' | 'https' | 'socks4' | 'socks5';
  username: string;
  password: string;
}

const ProxyTester: React.FC = () => {
  const [formData, setFormData] = useState<ProxyFormData>({
    host: '',
    port: '',
    type: 'http',
    username: '',
    password: ''
  });

  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ProxyTestResult | null>(null);
  const [batchProxies, setBatchProxies] = useState('');
  const [batchResults, setBatchResults] = useState<ProxyTestResult[]>([]);
  const [batchTesting, setBatchTesting] = useState(false);

  /**
   * Handle form input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Test single proxy
   */
  const handleTestProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.host || !formData.port) {
      alert('Please enter host and port');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const proxyConfig: ProxyConfig = {
        host: formData.host.trim(),
        port: parseInt(formData.port),
        type: formData.type,
        username: formData.username.trim() || undefined,
        password: formData.password.trim() || undefined
      };

      console.log('🧪 Testing proxy:', proxyConfig);
      const testResult = await testProxy(proxyConfig);
      console.log('✅ Test result:', testResult);
      
      setResult(testResult);
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setResult({
        status: 'failed',
        error: error.message || 'Unknown error',
        errorType: 'unknown_error',
        host: formData.host,
        port: parseInt(formData.port),
        type: formData.type,
        latency: 0,
        totalTime: 0
      });
    } finally {
      setTesting(false);
    }
  };

  /**
   * Test multiple proxies from textarea
   * Format: host:port or host:port:type or host:port:type:username:password
   */
  const handleTestBatch = async () => {
    if (!batchProxies.trim()) {
      alert('Please enter proxies (one per line)');
      return;
    }

    setBatchTesting(true);
    setBatchResults([]);

    try {
      // Parse proxies from textarea
      const lines = batchProxies.trim().split('\n');
      const proxies: ProxyConfig[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const parts = trimmed.split(':');
        if (parts.length < 2) continue;

        const proxy: ProxyConfig = {
          host: parts[0].trim(),
          port: parseInt(parts[1]),
          type: (parts[2]?.trim() as any) || 'http',
          username: parts[3]?.trim(),
          password: parts[4]?.trim()
        };

        proxies.push(proxy);
      }

      if (proxies.length === 0) {
        alert('No valid proxies found');
        setBatchTesting(false);
        return;
      }

      console.log(`🧪 Testing ${proxies.length} proxies...`);
      const results = await testMultipleProxies(proxies);
      console.log('✅ Batch test complete:', results);
      
      setBatchResults(results.results);
    } catch (error: any) {
      console.error('❌ Batch test failed:', error);
      alert(`Batch test failed: ${error.message}`);
    } finally {
      setBatchTesting(false);
    }
  };

  /**
   * Get status icon based on result
   */
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  /**
   * Get status color class
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'failed':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  /**
   * Format latency display
   */
  const formatLatency = (latency: number) => {
    if (latency < 100) return 'text-green-600';
    if (latency < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Proxy Testing Dashboard
        </h1>
        <p className="text-gray-600">
          Test HTTP, HTTPS, SOCKS4, and SOCKS5 proxies with real-time validation
        </p>
      </div>

      {/* Single Proxy Test */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Test Single Proxy
        </h2>

        <form onSubmit={handleTestProxy} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Host / IP Address *
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleInputChange}
                placeholder="e.g., 1.2.3.4 or proxy.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleInputChange}
                placeholder="e.g., 8080"
                min="1"
                max="65535"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proxy Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="socks4">SOCKS4</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username (Optional)
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Leave empty if no auth"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Password */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password (Optional)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Leave empty if no auth"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Test Button */}
          <button
            type="submit"
            disabled={testing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Testing Proxy...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Test Proxy
              </>
            )}
          </button>
        </form>

        {/* Single Test Result */}
        {result && (
          <div className={`mt-6 p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}>
            <div className="flex items-start gap-3">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">
                    {result.status === 'working' ? '✅ Proxy Working!' : '❌ Proxy Failed'}
                  </h3>
                  {result.status === 'working' && (
                    <span className={`text-sm font-medium ${formatLatency(result.latency || 0)}`}>
                      <Clock className="w-4 h-4 inline mr-1" />
                      {result.latency}ms
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <p><strong>Proxy:</strong> {result.host}:{result.port} ({result.type.toUpperCase()})</p>
                  
                  {result.status === 'working' ? (
                    <>
                      <p><strong>Detected IP:</strong> {result.ip}</p>
                      <p><strong>Latency:</strong> {result.latency}ms</p>
                      <p><strong>Total Time:</strong> {result.totalTime}ms</p>
                      {result.endpoint && (
                        <p className="text-xs text-gray-600"><strong>Test Endpoint:</strong> {result.endpoint}</p>
                      )}
                    </>
                  ) : (
                    <>
                      <p><strong>Error:</strong> {result.error}</p>
                      <p><strong>Error Type:</strong> {result.errorType}</p>
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Common Causes:</strong>
                        {result.errorType === 'timeout' && ' Proxy is too slow or unreachable'}
                        {result.errorType === 'connection_refused' && ' Proxy is not responding or offline'}
                        {result.errorType === 'auth_failed' && ' Invalid username or password'}
                        {result.errorType === 'dns_error' && ' Invalid proxy address or DNS issue'}
                        {result.errorType === 'host_not_found' && ' Proxy host does not exist'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Proxy Test */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          Test Multiple Proxies (Batch)
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proxies (one per line)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Format: host:port or host:port:type or host:port:type:username:password
            </p>
            <textarea
              value={batchProxies}
              onChange={(e) => setBatchProxies(e.target.value)}
              placeholder="1.2.3.4:8080&#10;5.6.7.8:1080:socks5&#10;proxy.example.com:3128:http:user:pass"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <button
            onClick={handleTestBatch}
            disabled={batchTesting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {batchTesting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Testing {batchProxies.split('\n').filter(l => l.trim()).length} Proxies...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Test All Proxies
              </>
            )}
          </button>
        </div>

        {/* Batch Results */}
        {batchResults.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Results</h3>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  ✅ {batchResults.filter(r => r.status === 'working').length} Working
                </span>
                <span className="text-red-600 font-medium">
                  ❌ {batchResults.filter(r => r.status === 'failed').length} Failed
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {batchResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">
                        {result.host}:{result.port}
                      </span>
                      <span className="text-xs bg-white px-2 py-1 rounded">
                        {result.type.toUpperCase()}
                      </span>
                    </div>

                    {result.status === 'working' ? (
                      <div className="text-right text-sm">
                        <div className={`font-medium ${formatLatency(result.latency || 0)}`}>
                          {result.latency}ms
                        </div>
                        <div className="text-xs text-gray-600">
                          IP: {result.ip}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right text-sm text-red-600">
                        {result.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProxyTester;
