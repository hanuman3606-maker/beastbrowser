// 🎯 SIMPLE SMOOTH SCROLLING - Copy to RPA Script
// Top → Bottom → Top → Middle → Random positions

console.log('🚀 Starting smooth scroll...');

setTimeout(async () => {
  // Helper function for smooth scrolling
  function smoothScroll(target) {
    return new Promise(resolve => {
      const start = window.pageYOffset;
      const distance = target - start;
      const duration = Math.abs(distance) / 2; // Speed
      const startTime = performance.now();
      
      function animation(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out
        const ease = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        
        window.scrollTo(0, start + distance * ease);
        
        if (progress < 1) {
          requestAnimationFrame(animation);
        } else {
          resolve();
        }
      }
      
      requestAnimationFrame(animation);
    });
  }
  
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const pause = (ms) => new Promise(r => setTimeout(r, ms));
  
  // Main sequence
  console.log('⬇️ Scrolling to bottom...');
  await smoothScroll(maxScroll);
  await pause(2000);
  
  console.log('⬆️ Scrolling to top...');
  await smoothScroll(0);
  await pause(2000);
  
  console.log('🎯 Scrolling to middle...');
  await smoothScroll(maxScroll / 2);
  await pause(2000);
  
  // Random scrolls
  for (let i = 0; i < 5; i++) {
    const randomPos = Math.random() * maxScroll;
    console.log(`🎲 Random scroll ${i + 1}: ${Math.round(randomPos)}px`);
    await smoothScroll(randomPos);
    await pause(1000);
  }
  
  console.log('⬆️ Back to top...');
  await smoothScroll(0);
  console.log('✅ Complete!');
  
}, 3000);

console.log('⏰ Starting in 3 seconds...');
