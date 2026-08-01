// Smooth scrolling for navigation links (skip placeholder # and newsletter triggers)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#' || this.classList.contains('newsletter-trigger')) {
            return;
        }

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements with animation classes
document.querySelectorAll('.animate-text, .animate-button, .animate-image').forEach(el => {
    observer.observe(el);
});

// Scroll-triggered reveal for text content across the site: headings,
// paragraphs, and list items fade/slide in as they enter the viewport.
// Excludes nav/footer (always visible chrome) and anything already handled
// by .animate-text so the hero isn't double-animated.
const scrollFadeSelector = [
    'main h1', 'main h2', 'main h3', 'main h4',
    'main p', 'main li',
    'section h1', 'section h2', 'section h3', 'section h4',
    'section p', 'section li'
].join(', ');

const scrollFadeEls = new Set();
document.querySelectorAll(scrollFadeSelector).forEach(el => {
    if (el.closest('nav, footer, .navbar')) return;
    if (el.classList.contains('animate-text')) return;
    if (!el.textContent.trim()) return;
    scrollFadeEls.add(el);
});

const fadeObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            obs.unobserve(entry.target);
        }
    });
}, { root: null, rootMargin: '0px 0px -40px 0px', threshold: 0.1 });

// Stagger siblings revealed together so groups (e.g. list items) cascade
// in rather than popping simultaneously.
const groupCounters = new WeakMap();
scrollFadeEls.forEach(el => {
    el.classList.add('scroll-fade');
    const parent = el.parentElement;
    const count = groupCounters.get(parent) || 0;
    el.style.setProperty('--scroll-fade-delay', `${Math.min(count, 5) * 0.08}s`);
    groupCounters.set(parent, count + 1);
    fadeObserver.observe(el);
});

// Hand-drawn highlight behind purple emphasis words (see redesign.css
// .highlight-purple / .purple-word): starts hidden and fills in left-to-
// right once scrolled into view, rather than just appearing with the text.
const highlightObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('ci-highlight-in-view');
            obs.unobserve(entry.target);
        }
    });
}, { root: null, rootMargin: '0px 0px -40px 0px', threshold: 0.4 });

document.querySelectorAll('.highlight-purple, .purple-word').forEach(el => {
    highlightObserver.observe(el);
});


// Add hover effect to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Note: contact.html wires up its own #contactForm submit handler (real
// async submission), so script.js intentionally doesn't touch that form.

// Safety Pings Functions
function showPingDetails(pingId) {
    const pingDetails = {
        'ping1': {
            title: 'Suspicious Activity',
            location: 'Oak Street & Main Ave',
            time: '2 minutes ago',
            description: 'Suspicious person walking up and down the street, taking photos of houses. Wearing dark clothing and acting suspiciously.',
            reporter: 'Sarah Johnson',
            status: 'URGENT'
        },
        'ping2': {
            title: 'Fire Alert',
            location: 'Maple Drive',
            time: '15 minutes ago',
            description: 'Smoke visible from house on Maple Drive. Fire department has been called and is responding.',
            reporter: 'Mike Chen',
            status: 'ACTIVE'
        },
        'ping3': {
            title: 'Car Theft',
            location: 'Pine Street',
            time: '1 hour ago',
            description: 'Vehicle reported stolen from driveway. Blue Honda Civic with license plate ABC123.',
            reporter: 'Lisa Park',
            status: 'ACTIVE'
        }
    };
    
    const ping = pingDetails[pingId];
    if (ping) {
        alert(`🔹 ${ping.title}\n📍 Location: ${ping.location}\n⏰ Time: ${ping.time}\n👤 Reporter: ${ping.reporter}\n📝 Description: ${ping.description}\n🚨 Status: ${ping.status}`);
    }
}

function placeNewPing() {
    // Removed alert message
}

function viewAllPings() {
    // Removed alert message
}

// Chat Functions
function joinChat() {
    // Removed alert message
}

function voiceInput() {
    // Removed alert message
}

function textFormat() {
    // Removed alert message
}

function viewChatHistory() {
    // Removed alert message
}

// Rich Reports Functions
function showReportDetails(reportId) {
    const reportDetails = {
        'report1': {
            title: 'Suspicious Person Report',
            location: 'Oak Street',
            time: '1 hour ago',
            description: 'Suspicious person walking up and down the street, taking photos of houses. Wearing dark clothing and acting suspiciously.',
            reporter: 'Sarah Johnson',
            priority: 'HIGH',
            media: '2 photos attached'
        },
        'report2': {
            title: 'Vehicle Break-in Attempt',
            location: 'Maple Drive',
            time: '3 hours ago',
            description: 'Witnessed someone trying to break into a parked car. Called police immediately.',
            reporter: 'Mike Chen',
            priority: 'MEDIUM',
            media: '1 video attached'
        },
        'report3': {
            title: 'Street Light Maintenance',
            location: 'Pine Street',
            time: '5 hours ago',
            description: 'Street light at the corner is flickering and needs maintenance.',
            reporter: 'Lisa Park',
            priority: 'LOW',
            media: 'No media'
        }
    };
    
    const report = reportDetails[reportId];
    if (report) {
        alert(`📋 ${report.title}\n📍 Location: ${report.location}\n⏰ Time: ${report.time}\n👤 Reporter: ${report.reporter}\n📝 Description: ${report.description}\n🚨 Priority: ${report.priority}\n📷 Media: ${report.media}`);
    }
}

function createNewReport() {
    // Removed alert message
}

function viewAllReports() {
    // Removed alert message
}

// Dashboard Functions
function quickPing() {
    // Removed alert message
}

function viewMap() {
    // Removed alert message
}

function openChat() {
    // Removed alert message
}

// Initialize first feature
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, neighborhood chat is the only feature...');
    // No need to call showFeature since the mockup is already visible by default
});

// Add active class to current page in navigation
const currentPage = window.location.pathname.split('/').pop();
document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
    }
});

// Add scrolled class to body and navbar on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        document.body.classList.add('scrolled');
        if (navbar) navbar.classList.add('scrolled');
    } else {
        document.body.classList.remove('scrolled');
        if (navbar) navbar.classList.remove('scrolled');
    }
});

// Mobile Navigation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation overlay
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    
    if (mobileMenuToggle && mobileNavOverlay) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileNavOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (mobileNavClose && mobileNavOverlay) {
        mobileNavClose.addEventListener('click', function() {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
    
    // Close mobile nav when clicking outside
    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', function(e) {
            if (e.target === mobileNavOverlay) {
                mobileNavOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
});

