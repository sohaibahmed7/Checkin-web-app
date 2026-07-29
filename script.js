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




// Add hover effect to feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Handle contact form submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData);
        
        // Here you would typically send the data to a server
        console.log('Form submitted:', data);
        
        // Show success message
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });
}

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

