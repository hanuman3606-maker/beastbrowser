// ✅ GUARANTEED WORKING TEST SCRIPT
// Copy this ENTIRE file and paste in RPA Script Content

console.log('=================================');
console.log('🎯 TEST SCRIPT LOADED!');
console.log('📍 URL:', window.location.href);
console.log('=================================');

// Wait 2 seconds then scroll
setTimeout(function() {
  console.log('⏰ 2 seconds passed, starting scroll test...');
  
  // Test 1: Scroll down 500px
  console.log('⬇️ Scrolling down 500px...');
  window.scrollBy(0, 500);
  
  setTimeout(function() {
    console.log('✅ Scrolled down!');
    console.log('📊 Current scroll position:', window.scrollY);
    
    // Test 2: Scroll up
    console.log('⬆️ Scrolling back up...');
    window.scrollBy(0, -500);
    
    setTimeout(function() {
      console.log('✅ Scrolled up!');
      console.log('📊 Final scroll position:', window.scrollY);
      console.log('=================================');
      console.log('🎉 TEST COMPLETE! Script is working!');
      console.log('=================================');
    }, 1000);
    
  }, 1000);
  
}, 2000);

console.log('⏳ Waiting 2 seconds before scrolling...');
