// 🎯 ULTIMATE SMOOTH SCROLLING AUTOMATION
// Human-like scrolling: Top → Bottom → Top → Middle → Random positions
// Author: Beast Browser
// Usage: Copy this entire script into RPA Script Content field

(function() {
  'use strict';
  
  console.log('🎯 SMOOTH SCROLL: Initializing...');
  console.log('📍 URL:', window.location.href);
  
  // ============================================
  // Configuration
  // ============================================
  const config = {
    initialDelay: 3000,        // Wait 3 seconds before starting
    scrollSpeed: 2,            // Pixels per frame (lower = slower, more natural)
    pauseAtEnd: 1500,          // Pause at top/bottom (milliseconds)
    randomPauses: true,        // Random pauses during scroll
    randomPauseChance: 0.02,   // 2% chance per frame
    randomPauseMin: 500,       // Min pause duration
    randomPauseMax: 2000,      // Max pause duration
    cycles: 3                  // How many complete cycles to run
  };
  
  // ============================================
  // Helper Functions
  // ============================================
  
  function getPageHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
  }
  
  function getCurrentScroll() {
    return window.pageYOffset || document.documentElement.scrollTop;
  }
  
  function getViewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight;
  }
  
  function getMaxScroll() {
    return getPageHeight() - getViewportHeight();
  }
  
  function randomPause(min, max) {
    const duration = Math.floor(Math.random() * (max - min + 1)) + min;
    console.log(`⏸️ PAUSE: Random pause for ${duration}ms`);
    return new Promise(resolve => setTimeout(resolve, duration));
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================
  // Smooth Scroll Functions
  // ============================================
  
  async function smoothScrollTo(targetY, speed = config.scrollSpeed) {
    const startY = getCurrentScroll();
    const distance = targetY - startY;
    const direction = distance > 0 ? 1 : -1;
    
    console.log(`📜 Scrolling from ${Math.round(startY)} to ${Math.round(targetY)} (${Math.round(Math.abs(distance))}px)`);
    
    return new Promise(async (resolve) => {
      let currentY = startY;
      
      async function step() {
        // Check if we've reached target
        if (Math.abs(targetY - currentY) < speed) {
          window.scrollTo(0, targetY);
          resolve();
          return;
        }
        
        // Random pauses for human-like behavior
        if (config.randomPauses && Math.random() < config.randomPauseChance) {
          await randomPause(config.randomPauseMin, config.randomPauseMax);
        }
        
        // Scroll
        currentY += speed * direction;
        window.scrollTo(0, currentY);
        
        // Continue
        requestAnimationFrame(step);
      }
      
      requestAnimationFrame(step);
    });
  }
  
  // Scroll to top
  async function scrollToTop() {
    console.log('⬆️ SCROLLING TO TOP');
    await smoothScrollTo(0);
    console.log('✅ Reached top');
  }
  
  // Scroll to bottom
  async function scrollToBottom() {
    console.log('⬇️ SCROLLING TO BOTTOM');
    const maxScroll = getMaxScroll();
    await smoothScrollTo(maxScroll);
    console.log('✅ Reached bottom');
  }
  
  // Scroll to middle
  async function scrollToMiddle() {
    console.log('🎯 SCROLLING TO MIDDLE');
    const maxScroll = getMaxScroll();
    const middle = maxScroll / 2;
    await smoothScrollTo(middle);
    console.log('✅ Reached middle');
  }
  
  // Scroll to random position
  async function scrollToRandom() {
    const maxScroll = getMaxScroll();
    const randomPos = Math.floor(Math.random() * maxScroll);
    const percentage = Math.round((randomPos / maxScroll) * 100);
    
    console.log(`🎲 SCROLLING TO RANDOM POSITION: ${Math.round(randomPos)}px (${percentage}%)`);
    await smoothScrollTo(randomPos);
    console.log('✅ Reached random position');
  }
  
  // ============================================
  // Main Automation Sequence
  // ============================================
  
  async function runScrollSequence() {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 SMOOTH SCROLL: Starting automation...');
      console.log(`📏 Page height: ${getPageHeight()}px`);
      console.log(`👁️ Viewport: ${getViewportHeight()}px`);
      console.log(`📊 Max scroll: ${getMaxScroll()}px`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      for (let cycle = 1; cycle <= config.cycles; cycle++) {
        console.log(`\n🔄 ===== CYCLE ${cycle}/${config.cycles} =====`);
        
        // 1. Scroll to bottom
        await scrollToBottom();
        await sleep(config.pauseAtEnd);
        
        // 2. Scroll back to top
        await scrollToTop();
        await sleep(config.pauseAtEnd);
        
        // 3. Scroll to middle
        await scrollToMiddle();
        await sleep(config.pauseAtEnd);
        
        // 4. Random scrolling (3-5 random positions)
        const randomScrolls = Math.floor(Math.random() * 3) + 3; // 3-5 times
        console.log(`🎲 Doing ${randomScrolls} random scrolls...`);
        
        for (let i = 0; i < randomScrolls; i++) {
          await scrollToRandom();
          await sleep(800); // Short pause between random scrolls
        }
        
        console.log(`✅ Cycle ${cycle} complete!`);
      }
      
      // Final position: back to top
      console.log('\n🏁 FINAL: Scrolling back to top...');
      await scrollToTop();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SMOOTH SCROLL: Automation complete!');
      console.log(`📊 Total cycles completed: ${config.cycles}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
    } catch (error) {
      console.error('❌ SMOOTH SCROLL: Error occurred:', error);
      console.error('Stack:', error.stack);
    }
  }
  
  // ============================================
  // Start Automation
  // ============================================
  
  console.log(`⏰ SMOOTH SCROLL: Starting in ${config.initialDelay / 1000} seconds...`);
  
  setTimeout(() => {
    runScrollSequence();
  }, config.initialDelay);
  
})();
