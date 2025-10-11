# RPA Automation System

A comprehensive Robotic Process Automation (RPA) system for browser automation with profile management.

## Features

### 🚀 Script Builder
- **Visual Script Creation**: Build automation scripts using a user-friendly interface
- **JavaScript Support**: Write custom JavaScript code for complex automation
- **Pre-built Templates**: Use ready-made templates for common tasks:
  - Auto Scrolling Script
  - Form Auto Filler
  - Auto Clicker
- **Script Validation**: Real-time validation of JavaScript syntax
- **Import/Export**: Save and share scripts as JSON files

### 📚 Script Library
- **Script Management**: Organize and manage your automation scripts
- **Search & Filter**: Find scripts by name, description, or tags
- **Categories**: Organize scripts by type (scrolling, form-filling, clicking, etc.)
- **Favorites**: Mark frequently used scripts as favorites
- **Bulk Operations**: Export all scripts or import multiple scripts
- **Script Preview**: View script details and content preview

### ⚡ Execution Panel
- **Profile Selection**: Choose browser profiles to run scripts on
- **Real-time Monitoring**: Watch execution progress with live logs
- **Execution Control**: Pause, resume, or stop running executions
- **Progress Tracking**: See step-by-step progress with visual indicators
- **Execution History**: View completed and failed executions

### 📊 Monitoring Dashboard
- **Performance Analytics**: Track success rates and execution times
- **Script Performance**: See which scripts are most used and successful
- **Profile Performance**: Monitor which profiles work best
- **Hourly Activity**: View execution patterns throughout the day
- **Success Metrics**: Monitor overall system health and performance

## Usage

### Creating a Script

1. **Navigate to Script Builder**
   - Click on "Script Builder" tab
   - Click "New Script" button

2. **Fill Script Details**
   - Enter script name and description
   - Specify the target website URL
   - Set execution time (in minutes)
   - Choose script type (JavaScript/Custom/Template)

3. **Write Script Content**
   - Use the code editor to write JavaScript
   - Or load from pre-built templates
   - Validate syntax before saving

4. **Save Script**
   - Click "Save Script" to store in library
   - Script will be available for execution

### Running Scripts

1. **Go to Execution Panel**
   - Select a script from the dropdown
   - Choose an active browser profile
   - Review execution preview

2. **Start Execution**
   - Click "Start Execution"
   - Monitor progress in real-time
   - Use controls to pause/resume/stop

3. **View Results**
   - Check execution logs
   - View success/failure status
   - Access execution history

### Script Templates

#### Auto Scrolling Script
```javascript
setTimeout(() => {
    let direction = 1; // 1 for down, -1 for up
    const scrollSpeed = 10;
    const scrollInterval = 16;
    let isScrolling = true;

    function continuousScroll() {
        if (!isScrolling) return;
        
        const maxHeight = document.body.scrollHeight - window.innerHeight;
        const currentPos = window.scrollY;

        if (currentPos >= maxHeight && direction === 1) {
            direction = -1;
        } else if (currentPos <= 0 && direction === -1) {
            direction = 1;
        }

        window.scrollBy({
            top: scrollSpeed * direction,
            behavior: 'smooth'
        });

        setTimeout(continuousScroll, scrollInterval);
    }

    continuousScroll();
}, 10000);
```

#### Form Auto Filler
```javascript
setTimeout(() => {
    const formData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        message: 'This is an automated message'
    };

    Object.keys(formData).forEach(key => {
        const input = document.querySelector(`input[name="${key}"], input[id="${key}"], textarea[name="${key}"]`);
        if (input) {
            input.value = formData[key];
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    setTimeout(() => {
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
            submitBtn.click();
        }
    }, 2000);
}, 5000);
```

#### Auto Clicker
```javascript
setTimeout(() => {
    const clickSelectors = [
        '.like-button',
        '.follow-button',
        '.subscribe-button',
        '[data-testid="like"]',
        '.heart-icon'
    ];

    function clickElements() {
        clickSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element && !element.disabled) {
                    element.click();
                }
            });
        });
    }

    setInterval(clickElements, 3000);
}, 5000);
```

## Data Storage

The RPA system uses localStorage to persist data:

- **Scripts**: `rpa_scripts` - All created scripts
- **Executions**: `rpa_executions` - Execution history and active sessions
- **Profiles**: `antidetect_profiles` - Browser profiles (from existing system)

## Components

### RPADashboard
Main dashboard component that integrates all RPA features with overview statistics and quick actions.

### RPAScriptBuilder
Script creation interface with code editor, templates, and validation.

### RPAScriptLibrary
Script management interface with search, filtering, and organization features.

### RPAExecutionPanel
Execution control interface for running scripts on browser profiles.

### RPAMonitoringDashboard
Analytics and monitoring interface for tracking performance and usage.

## Integration

The RPA system integrates with the existing browser profile system:

- Uses existing profiles from `antidetect_profiles`
- Leverages profile management for script execution
- Maintains compatibility with current profile structure

## Best Practices

1. **Script Development**
   - Always test scripts on non-critical websites first
   - Use appropriate delays between actions
   - Handle errors gracefully with try-catch blocks
   - Validate element existence before interaction

2. **Execution Management**
   - Monitor active executions regularly
   - Set appropriate execution time limits
   - Use pause/resume for long-running scripts
   - Review execution logs for debugging

3. **Performance Optimization**
   - Use efficient selectors (CSS > XPath)
   - Minimize DOM queries
   - Implement proper error handling
   - Monitor success rates and adjust accordingly

## Security Considerations

- Scripts run in browser context with full access
- Validate all user inputs before execution
- Be cautious with external data sources
- Monitor for suspicious activity patterns
- Use profiles with appropriate permissions

## Troubleshooting

### Common Issues

1. **Script Not Executing**
   - Check JavaScript syntax
   - Verify website URL is correct
   - Ensure profile is active
   - Check browser console for errors

2. **Elements Not Found**
   - Verify selectors are correct
   - Add wait conditions for dynamic content
   - Check if elements are in iframes
   - Use more specific selectors

3. **Execution Timeout**
   - Increase execution time limit
   - Optimize script performance
   - Add progress indicators
   - Break long scripts into smaller parts

### Debug Tips

- Use browser developer tools
- Add console.log statements
- Check execution logs in monitoring dashboard
- Test scripts manually before automation
- Use screenshot functionality for debugging
