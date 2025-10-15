// 🎯 IMPROVED SMOOTH SCROLLING - Fast & Natural
// Copy this entire script into RPA Script Content field

(function() {
  'use strict';
  
  console.log('🎯 SMOOTH SCROLL: Initializing...');
  console.log('📍 URL:', window.location.href);
  
  // ============================================
  // Configuration - IMPROVED SPEED!
  // ============================================
  const config = {
    initialDelay: 2000,        // Wait 2 seconds before starting
    scrollSpeed: 8,            // FASTER! (was 2, now 8)
    pauseAtEnd: 1000,          // Shorter pauses (was 1500)
    randomPauses: true,        // Random pauses during scroll
    randomPauseChance: 0.01,   // Less frequent pauses (was 0.02)
    randomPauseMin: 300,       // Shorter pauses
    randomPauseMax: 1000,      // Shorter pauses
    cycles: 2                  // Fewer cycles (was 3)
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
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================
  // BETTER Smooth Scroll - Using smooth behavior
  // ============================================
  
  function smoothScrollTo(targetY) {
    return new Promise((resolve) => {
      const startY = getCurrentScroll();
      const distance = Math.abs(targetY - startY);
      
      // Use browser's native smooth scroll for better performance
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
      
      // Estimate scroll duration based on distance
      const duration = Math.min(distance / 2, 2000); // Max 2 seconds
      
      console.log(`📜 Scrolling to ${Math.round(targetY)}px (${Math.round(distance)}px distance)`);
      
      // Wait for scroll to complete
      setTimeout(resolve, duration);
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
    
    console.log(`🎲 Random scroll to ${percentage}% of page`);
    await smoothScrollTo(randomPos);
    console.log('✅ Reached position');
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
        
        // 4. Random scrolling (3-4 random positions)
        const randomScrolls = Math.floor(Math.random() * 2) + 3; // 3-4 times
        console.log(`🎲 Doing ${randomScrolls} random scrolls...`);
        
        for (let i = 0; i < randomScrolls; i++) {
          await scrollToRandom();
          await sleep(500); // Quick pause
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
