// ✅ ULTRA SIMPLE TEST SCRIPT - Copy this to RPA Builder
// This will DEFINITELY work if extension is loading

console.log('==========================================');
console.log('✅ TEST SCRIPT LOADED!');
console.log('==========================================');

// Test 1: Alert (will popup)
alert('🎉 RPA Extension is WORKING!');

// Test 2: Console logs
console.log('📍 Current URL:', window.location.href);
console.log('📏 Page height:', document.body.scrollHeight);
console.log('🖥️ Window height:', window.innerHeight);

// Test 3: Change page background (visual confirmation)
document.body.style.backgroundColor = 'lightgreen';
console.log('✅ Changed background to GREEN');

// Test 4: Simple scroll after 2 seconds
setTimeout(function() {
    console.log('🚀 Starting SCROLL test...');
    
    // Direct scrollTo
    window.scrollTo(0, 500);
    console.log('📍 Scrolled to 500px');
    
    setTimeout(function() {
        window.scrollTo(0, 0);
        console.log('📍 Scrolled back to top');
    }, 2000);
    
}, 2000);

console.log('==========================================');
console.log('✅ ALL TESTS INITIATED!');
console.log('==========================================');
