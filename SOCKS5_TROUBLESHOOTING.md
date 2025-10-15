# SOCKS5 Proxy Troubleshooting Guide

## Common Issues and Solutions

### 1. ERR_PROXY_CONNECTION_FAILED

**Symptoms:**
- Browser shows "ERR_PROXY_CONNECTION_FAILED" error
- No internet access through proxy
- Connection timeout errors

**Solutions:**
1. **Verify Proxy Details**: Check that host, port, username, and password are correct
2. **Test Connectivity**: Use the test script: `node test-socks5-connection.js`
3. **Check Firewall**: Ensure firewall isn't blocking the connection
4. **Verify Proxy Status**: Confirm the SOCKS5 proxy server is running and accessible

### 2. Proxy Not Working in Chromium

**Symptoms:**
- Proxy appears to connect but traffic isn't routed through it
- IP address detection shows local IP instead of proxy IP
- Websites show your real location

**Solutions:**
1. **Check Proxy Args**: Ensure `--proxy-server` is correctly formatted
2. **Verify Bypass List**: Confirm `--proxy-bypass-list=` is empty to route all traffic
3. **DNS Resolution**: Check that `--host-resolver-rules` is properly configured
4. **Test with Simple HTTP Proxy**: Try with a basic HTTP proxy to isolate SOCKS5 issues

### 3. Playwright Proxy Issues

**Symptoms:**
- Mobile browser fails to load pages
- Proxy authentication failures
- Timeouts in mobile emulation

**Solutions:**
1. **Check Proxy Configuration**: Verify proxy object structure in Playwright launch options
2. **Authentication**: Ensure username/password are correctly passed
3. **Browser Args**: Confirm stealth flags aren't interfering with proxy connections
4. **Viewport Issues**: Test with different viewport sizes

## Diagnostic Steps

### Step 1: Test Proxy Independently
```bash
# Edit test-socks5-connection.js with your proxy details
node test-socks5-connection.js
```

### Step 2: Check Application Logs
Look for these key log messages:
- "🔧 Creating SOCKS5 tunnel for:"
- "✅ SOCKS5 tunnel created!"
- "📡 SOCKS5 upstream URL:"
- "⚠️ SOCKS5 connection error:"
- "❌ Failed to create SOCKS5 tunnel:"

### Step 3: Verify Proxy Configuration
Check that your profile has:
```json
{
  "proxy": {
    "type": "socks5",
    "host": "your-proxy-host.com",
    "port": 1080,
    "username": "optional",
    "password": "optional"
  },
  "useBuiltinProxy": true
}
```

## Advanced Troubleshooting

### Enable Verbose Logging
Temporarily modify `socks5-handler.js` to enable verbose logging:
```javascript
const server = new Server({
  // ... other options
  verbose: true, // Change to true for debugging
});
```

### Test Direct Connection
Try connecting directly to your SOCKS5 proxy using curl:
```bash
# Test SOCKS5 connection (requires curl with SOCKS5 support)
curl --socks5 your-proxy-host.com:1080 http://ip-api.com/json
```

### Check Port Availability
Ensure the local HTTP proxy port isn't blocked:
- Windows: `netstat -an | findstr :PORT`
- Check antivirus/firewall settings

## Common Configuration Issues

### 1. Chrome SOCKS5 Scheme Compatibility ⚠️ CRITICAL
**Issue**: Chrome/Chromium doesn't recognize `socks5://` scheme in `--proxy-server` flag
**Solution**: The app automatically converts `socks5://` to `socks://` which Chrome interprets as SOCKS5
**Note**: This is handled automatically in the latest version - no user action required

### 2. Incorrect Proxy Type
Make sure `proxy.type` is set to "socks5" (lowercase)

### 3. Authentication Problems
- Ensure username/password are URL-encoded if they contain special characters
- Check if authentication is required by your proxy provider

### 4. Port Blocking
- Some networks block non-standard ports
- Try using common ports like 80, 443, or 8080 if possible

### 5. DNS Resolution Issues
- If websites fail to load but IP detection works, check DNS settings
- Try adding `--host-resolver-rules` to force DNS through proxy

## Contact Support

If issues persist after trying all solutions:
1. Provide exact error messages from logs
2. Share your proxy configuration (without credentials)
3. Include the output from the test script
4. Mention which browser (Chrome139 or Playwright) is affected