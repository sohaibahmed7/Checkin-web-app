// Phone Mockup Outline Removal Script
// Run this in your browser's Developer Tools Console

console.log('🔧 Removing phone mockup outlines...');

// Remove outlines from all phone mockup elements
document.querySelectorAll(".phone-mockup-container img, .primary-mockup, .secondary-mockup, .animate-image, .app-screenshot").forEach(el => {
    el.style.border = "none";
    el.style.outline = "none";
    el.style.boxShadow = "none";
    el.style.filter = "none";
    el.style.webkitBoxShadow = "none";
    el.style.mozBoxShadow = "none";
    el.style.webkitAppearance = "none";
    el.style.mozAppearance = "none";
    el.style.appearance = "none";
    el.style.userSelect = "none";
    el.style.webkitUserSelect = "none";
    el.style.mozUserSelect = "none";
    el.style.msUserSelect = "none";
});

// Also remove from any focus/active/hover states
document.querySelectorAll(".phone-mockup-container img:focus, .phone-mockup-container img:active, .phone-mockup-container img:hover").forEach(el => {
    el.style.outline = "none";
    el.style.border = "none";
});

console.log('✅ Phone mockup outlines removed!');

// Optional: Add a click-to-remove function
function removeOutlineFromClicked() {
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && e.target.closest('.phone-mockup-container')) {
            e.target.style.outline = "none";
            e.target.style.border = "none";
            e.target.style.boxShadow = "none";
            console.log('🎯 Removed outline from clicked image');
        }
    });
}

// Uncomment the line below if you want click-to-remove functionality
// removeOutlineFromClicked();
