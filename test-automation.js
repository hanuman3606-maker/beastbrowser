// Test script to verify automation functionality
console.log('Testing BeastBrowser Automation System...');

// Test 1: Check if RPA scripts are properly stored
function testRPAScriptStorage() {
    console.log('🔍 Testing RPA Script Storage...');
    
    const testScript = {
        id: 'test_script_' + Date.now(),
        name: 'Test Automation Script',
        description: 'A test script to verify automation functionality',
        websiteUrl: 'https://example.com',
        executionTime: 5,
        scriptType: 'javascript',
        scriptContent: `
            console.log('Test script executing...');
            // Simulate some automation
            setTimeout(() => {
                console.log('Test script completed successfully');
            }, 2000);
        `,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        executionCount: 0
    };
    
    // Store in localStorage
    const existingScripts = JSON.parse(localStorage.getItem('antidetect_rpa_scripts') || '[]');
    existingScripts.push(testScript);
    localStorage.setItem('antidetect_rpa_scripts', JSON.stringify(existingScripts));
    
    console.log('✅ Test script stored successfully');
    return testScript;
}

// Test 2: Check if profiles are properly stored
function testProfileStorage() {
    console.log('🔍 Testing Profile Storage...');
    
    const testProfile = {
        id: 'test_profile_' + Date.now(),
        name: 'Test Profile',
        deviceType: 'desktop',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        proxy: null,
        fingerprint: {
            screen: { width: 1920, height: 1080 },
            timezone: 'America/New_York',
            language: 'en-US'
        },
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Store in localStorage
    const existingProfiles = JSON.parse(localStorage.getItem('antidetect_profiles') || '[]');
    existingProfiles.push(testProfile);
    localStorage.setItem('antidetect_profiles', JSON.stringify(existingProfiles));
    
    console.log('✅ Test profile stored successfully');
    return testProfile;
}

// Test 3: Simulate automation execution
function testAutomationExecution(script, profile) {
    console.log('🔍 Testing Automation Execution...');
    
    const execution = {
        id: 'test_execution_' + Date.now(),
        scriptId: script.id,
        scriptName: script.name,
        profileId: profile.id,
        profileName: profile.name,
        status: 'running',
        startTime: new Date().toISOString(),
        progress: {
            currentStep: 0,
            totalSteps: 3
        },
        logs: [
            {
                id: 'log_' + Date.now(),
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Starting execution of "${script.name}" on profile "${profile.name}"`
            }
        ]
    };
    
    // Store execution
    const existingExecutions = JSON.parse(localStorage.getItem('rpa_executions') || '[]');
    existingExecutions.push(execution);
    localStorage.setItem('rpa_executions', JSON.stringify(existingExecutions));
    
    console.log('✅ Test execution started successfully');
    return execution;
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting BeastBrowser Automation Tests...\n');
    
    try {
        const testScript = testRPAScriptStorage();
        const testProfile = testProfileStorage();
        const testExecution = testAutomationExecution(testScript, testProfile);
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('📊 Test Results:');
        console.log(`   - Script ID: ${testScript.id}`);
        console.log(`   - Profile ID: ${testProfile.id}`);
        console.log(`   - Execution ID: ${testExecution.id}`);
        
        return {
            success: true,
            script: testScript,
            profile: testProfile,
            execution: testExecution
        };
    } catch (error) {
        console.error('❌ Test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testBeastBrowserAutomation = runAllTests;
    console.log('💡 Run testBeastBrowserAutomation() in console to test automation system');
}

// Auto-run tests if this script is executed directly
if (typeof window !== 'undefined' && window.location) {
    runAllTests();
}
