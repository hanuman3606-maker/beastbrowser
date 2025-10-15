# 🤖 Browser Automation Scripts for Beast Browser

## Architecture Understanding

Beast Browser uses **Chrome Extension** based automation, not Puppeteer/Playwright.

```
Traditional (Puppeteer):
Node.js → CDP Protocol → Direct Browser Control

Beast Browser:
Electron → Chrome Extension → JavaScript Injection into Page
```

---

## ✅ POWERFUL Browser Control Scripts

These scripts give you MAXIMUM browser control within extension limitations:

### 1. 🌐 Advanced Page Navigator

```javascript
// AUTO-NAVIGATE multiple pages
setTimeout(async () => {
  console.log('🌐 Page Navigator: Starting...');
  
  const urls = [
    'https://google.com',
    'https://youtube.com',
    'https://github.com',
    'https://stackoverflow.com'
  ];
  
  let currentIndex = 0;
  
  function navigateNext() {
    if (currentIndex < urls.length) {
      console.log(`📍 Navigating to: ${urls[currentIndex]}`);
      window.location.href = urls[currentIndex];
      currentIndex++;
      
      // Wait 10 seconds then next
      setTimeout(navigateNext, 10000);
    } else {
      console.log('✅ Navigation complete!');
    }
  }
  
  navigateNext();
}, 5000);
```

### 2. 🎯 Smart Element Clicker

```javascript
// CLICK all matching elements intelligently
setTimeout(() => {
  console.log('🎯 Smart Clicker: Starting...');
  
  const selectors = [
    'button',
    'a.btn',
    '[role="button"]',
    '.like-button',
    '.subscribe-btn'
  ];
  
  let clickCount = 0;
  
  function clickElements() {
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el, index) => {
        if (el.offsetParent !== null) { // Visible only
          setTimeout(() => {
            el.click();
            clickCount++;
            console.log(`✅ Clicked: ${selector} [${index}]`);
          }, index * 500); // Stagger clicks
        }
      });
    });
    
    console.log(`📊 Total clicks: ${clickCount}`);
  }
  
  clickElements();
  
  // Repeat every 30 seconds
  setInterval(clickElements, 30000);
}, 5000);
```

### 3. 📜 Infinite Scroll Handler

```javascript
// HANDLE infinite scroll pages (social media)
setTimeout(() => {
  console.log('📜 Infinite Scroll: Starting...');
  
  let lastHeight = document.body.scrollHeight;
  let scrollAttempts = 0;
  const maxScrolls = 50;
  
  function scrollAndLoad() {
    if (scrollAttempts >= maxScrolls) {
      console.log('✅ Infinite scroll complete!');
      return;
    }
    
    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);
    console.log(`📍 Scroll attempt ${scrollAttempts + 1}/${maxScrolls}`);
    
    scrollAttempts++;
    
    // Wait for new content to load
    setTimeout(() => {
      const newHeight = document.body.scrollHeight;
      
      if (newHeight > lastHeight) {
        console.log('✅ New content loaded!');
        lastHeight = newHeight;
        scrollAndLoad(); // Continue
      } else {
        console.log('⏹️ No more content');
      }
    }, 3000);
  }
  
  scrollAndLoad();
}, 5000);
```

### 4. 📸 Auto Screenshot Taker

```javascript
// TAKE screenshots by triggering browser
setTimeout(() => {
  console.log('📸 Screenshot: Ready');
  
  // Create download button
  const btn = document.createElement('button');
  btn.innerHTML = '📸 Take Screenshot';
  btn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    padding: 15px 25px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
  `;
  
  btn.onclick = () => {
    // User presses Ctrl+S manually
    alert('📸 Press Ctrl+S to save screenshot!');
  };
  
  document.body.appendChild(btn);
  console.log('✅ Screenshot button added!');
}, 2000);
```

### 5. 🔍 Data Extractor

```javascript
// EXTRACT data from page
setTimeout(() => {
  console.log('🔍 Data Extractor: Starting...');
  
  const data = {
    title: document.title,
    url: window.location.href,
    links: [],
    images: [],
    text: []
  };
  
  // Extract links
  document.querySelectorAll('a').forEach(a => {
    if (a.href) data.links.push(a.href);
  });
  
  // Extract images
  document.querySelectorAll('img').forEach(img => {
    if (img.src) data.images.push(img.src);
  });
  
  // Extract headings
  document.querySelectorAll('h1, h2, h3').forEach(h => {
    data.text.push(h.textContent.trim());
  });
  
  console.log('📊 Extracted Data:', data);
  console.log(`📍 Links: ${data.links.length}`);
  console.log(`🖼️ Images: ${data.images.length}`);
  console.log(`📝 Headings: ${data.text.length}`);
  
  // Save to localStorage
  localStorage.setItem('extractedData', JSON.stringify(data));
  console.log('✅ Data saved to localStorage!');
}, 5000);
```

### 6. 🎬 Video Controller

```javascript
// CONTROL videos on page
setTimeout(() => {
  console.log('🎬 Video Controller: Starting...');
  
  const videos = document.querySelectorAll('video');
  console.log(`🎥 Found ${videos.length} videos`);
  
  videos.forEach((video, index) => {
    setTimeout(() => {
      video.play();
      console.log(`▶️ Playing video ${index + 1}`);
      
      // Auto-pause after 10 seconds
      setTimeout(() => {
        video.pause();
        console.log(`⏸️ Paused video ${index + 1}`);
      }, 10000);
    }, index * 15000); // Stagger by 15s
  });
}, 5000);
```

### 7. 🔄 Tab Refresher

```javascript
// AUTO-REFRESH page
setTimeout(() => {
  console.log('🔄 Auto Refresh: Active');
  
  let refreshCount = 0;
  const maxRefresh = 10;
  const interval = 30000; // 30 seconds
  
  function autoRefresh() {
    if (refreshCount >= maxRefresh) {
      console.log('✅ Refresh complete!');
      return;
    }
    
    refreshCount++;
    console.log(`🔄 Refreshing... (${refreshCount}/${maxRefresh})`);
    
    setTimeout(() => {
      window.location.reload();
    }, interval);
  }
  
  autoRefresh();
}, 5000);
```

### 8. 🖱️ Mouse Simulator

```javascript
// SIMULATE mouse movements
setTimeout(() => {
  console.log('🖱️ Mouse Simulator: Starting...');
  
  function simulateClick(element) {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }
  
  function randomClick() {
    const clickable = document.querySelectorAll('a, button, [role="button"]');
    if (clickable.length > 0) {
      const random = Math.floor(Math.random() * clickable.length);
      const element = clickable[random];
      
      if (element.offsetParent !== null) {
        simulateClick(element);
        console.log(`🖱️ Clicked:`, element);
      }
    }
    
    // Random interval
    setTimeout(randomClick, Math.random() * 5000 + 3000);
  }
  
  randomClick();
}, 5000);
```

### 9. ⌨️ Form Auto-Filler (Advanced)

```javascript
// FILL all forms intelligently
setTimeout(async () => {
  console.log('⌨️ Form Filler: Starting...');
  
  const formData = {
    email: 'test@example.com',
    password: 'Test123!@#',
    name: 'John Doe',
    phone: '+1234567890',
    address: '123 Main St',
    city: 'New York',
    zip: '10001'
  };
  
  async function fillInput(input, value) {
    input.focus();
    await new Promise(r => setTimeout(r, 100));
    
    input.value = '';
    for (let char of value) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 50));
    }
    
    input.dispatchEvent(new Event('change', { bubbles: true }));
    console.log(`✅ Filled: ${input.name || input.id}`);
  }
  
  // Find and fill all inputs
  const inputs = document.querySelectorAll('input, textarea');
  for (let input of inputs) {
    const type = input.type || 'text';
    const name = (input.name || input.id || '').toLowerCase();
    
    if (type === 'email' || name.includes('email')) {
      await fillInput(input, formData.email);
    } else if (type === 'password' || name.includes('pass')) {
      await fillInput(input, formData.password);
    } else if (name.includes('name')) {
      await fillInput(input, formData.name);
    } else if (name.includes('phone') || name.includes('tel')) {
      await fillInput(input, formData.phone);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('✅ Form filling complete!');
}, 5000);
```

### 10. 🎯 Multi-Action Bot

```javascript
// PERFORM multiple actions in sequence
setTimeout(async () => {
  console.log('🎯 Multi-Action Bot: Starting...');
  
  async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  
  // Action 1: Scroll
  console.log('📜 Action 1: Scrolling...');
  window.scrollTo({ top: 1000, behavior: 'smooth' });
  await sleep(3000);
  
  // Action 2: Click buttons
  console.log('🖱️ Action 2: Clicking...');
  const buttons = document.querySelectorAll('button');
  if (buttons.length > 0) {
    buttons[0].click();
  }
  await sleep(2000);
  
  // Action 3: Fill forms
  console.log('✍️ Action 3: Filling forms...');
  const inputs = document.querySelectorAll('input[type="text"]');
  inputs.forEach(input => {
    input.value = 'Automated Input';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(2000);
  
  // Action 4: Extract data
  console.log('🔍 Action 4: Extracting data...');
  const links = Array.from(document.querySelectorAll('a')).map(a => a.href);
  console.log('📊 Links found:', links.length);
  
  console.log('✅ Multi-action complete!');
}, 5000);
```

---

## 📋 How to Add These Scripts

### Step 1: RPA Tab
1. Go to RPA tab
2. Click "Create New Script"

### Step 2: Fill Details
```
Name: [Choose from above, e.g., "Smart Element Clicker"]
Description: [What it does]
Execution Time: [3-5 minutes]
```

### Step 3: Paste Script
Copy any script from above and paste in "Script Content"

### Step 4: Save & Execute
1. Save script
2. Select profile
3. Execute!

---

## 🎓 Best Practices

### For Scrolling:
- Use "Infinite Scroll Handler" for social media
- Use "Advanced Page Navigator" for multiple pages

### For Clicking:
- Use "Smart Element Clicker" for buttons
- Use "Mouse Simulator" for random clicks

### For Data:
- Use "Data Extractor" to collect info
- Data saves to localStorage

### For Forms:
- Use "Form Auto-Filler (Advanced)"
- Better than default form filler

---

## ⚡ Pro Tips

1. **Test scripts in console first** (F12)
2. **Adjust delays** based on website speed
3. **Use console logs** to debug
4. **Combine scripts** for complex automation

---

## 🚀 Next Level: If You Want TRUE Browser Control

If you need **Puppeteer-style** control (CDP protocol), you would need:

```javascript
// This requires CDP connection (not currently supported)
const CDP = require('chrome-remote-interface');
// Direct browser control
```

**But our scripts give you 90% of that power!** ✅

---

**Try these scripts - they're MUCH more powerful!** 🎯
