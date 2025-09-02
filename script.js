// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
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

// Mobile menu toggle
const mobileMenuToggle = () => {
    const navLinks = document.querySelector('.nav-links');
    const menuToggle = document.querySelector('.menu-toggle');
    
    if (window.innerWidth <= 768) {
        if (!menuToggle) {
            const toggle = document.createElement('button');
            toggle.className = 'menu-toggle';
            toggle.innerHTML = '<i class="fas fa-bars"></i>';
            document.querySelector('.navbar').appendChild(toggle);
            
            toggle.addEventListener('click', () => {
                navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
            });
        }
        
        navLinks.style.display = 'none';
    } else {
        navLinks.style.display = 'flex';
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.remove();
        }
    }
};

// Handle window resize
window.addEventListener('resize', mobileMenuToggle);





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

// Single Feature Display - Neighborhood Chat Only
function showFeature(featureId) {
    console.log('Showing feature:', featureId);
    
    // Remove active class from all buttons
    document.querySelectorAll('.feature-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to the clicked button
    const clickedButton = event.target.closest('.feature-button');
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // Show live chat mockup by default and when live-chat button is clicked
    const liveChatFeature = document.getElementById('live-chat-feature');
    if (liveChatFeature) {
        if (featureId === 'live-chat') {
            liveChatFeature.style.display = 'block';
        } else {
            liveChatFeature.style.display = 'none';
        }
    }
    
    console.log('Feature display updated');
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
    // Mobile menu functionality
    mobileMenuToggle();
    
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
    
    // Sample Neighborhood Chat Functionality
    console.log('Initializing neighborhood chat functionality...');
    
    // Response messages for different options
    const responseMessages = {
        'no': "No, I didn't see anyone suspicious in the area. Thanks for letting us know though - it's good to stay alert!",
        'yes': "Yes, I noticed them too - very concerning! They were definitely acting suspicious. Should we call the police?",
        'details': "I have some details to share about what I observed. They were wearing a dark hoodie and seemed to be taking photos of houses. I got a partial license plate number too."
    };
    
    // Initialize chat
    function initializeChat() {
        document.getElementById('chat-response').style.display = 'block';
        document.getElementById('chat-result').style.display = 'none';
    }
    
    // Initialize chat on page load
    initializeChat();
    
    // Make functions globally available
    window.sendResponse = function(responseType) {
        console.log('Response sent:', responseType);
        
        const responseMessage = responseMessages[responseType];
        
        // Add clicked class to the selected option
        const clickedButton = event.target;
        clickedButton.classList.add('clicked');
        
        // Hide all other response options but keep the clicked one visible
        const responseOptions = document.querySelectorAll('.response-option');
        responseOptions.forEach(option => {
            if (option !== clickedButton) {
                option.style.display = 'none';
            }
        });
        
        // Keep the clicked button visible but disable it
        clickedButton.style.pointerEvents = 'none';
        clickedButton.textContent = 'Sending...';
        
        // Show typing indicator
        const chatMessages = document.getElementById('chat-messages');
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message user-message typing-indicator';
        typingIndicator.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">
                <div class="message-sender">You</div>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingIndicator);
        
        // Scroll to the typing indicator
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Simulate typing delay
        setTimeout(() => {
            // Remove typing indicator
            typingIndicator.remove();
            
            // Add user's response to the chat with sending animation
            const userMessage = document.createElement('div');
            userMessage.className = 'message user-message sending';
            userMessage.innerHTML = `
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <div class="message-sender">You</div>
                    <div class="message-text">${responseMessage}</div>
                    <div class="message-time">Just now</div>
                </div>
            `;
            chatMessages.appendChild(userMessage);
            
            // Scroll to the new message
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Add sent animation after a short delay
            setTimeout(() => {
                userMessage.classList.remove('sending');
                userMessage.classList.add('sent');
            }, 300);
            
            // Show success message after message appears sent
            setTimeout(() => {
                document.getElementById('result-title').textContent = 'Message Sent!';
                document.getElementById('result-message').textContent = 'Your response has been shared with the neighborhood chat.';
                document.getElementById('chat-result').style.display = 'block';
            }, 800);
            
        }, 1500); // Typing delay
        
        console.log('Chat response shown');
    };
    
    window.restartChat = function() {
        console.log('Restarting chat');
        
        // Reset chat messages to original state
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="message neighbor-message">
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <div class="message-sender">Sarah (Neighbor)</div>
                    <div class="message-text">Hey everyone! Did anyone see that suspicious-looking person roaming around the area earlier? They were walking up and down the street taking photos of houses. Should we be concerned?</div>
                    <div class="message-time">2 minutes ago</div>
                </div>
            </div>
        `;
        
        initializeChat();
    };
    
    console.log('Neighborhood chat functionality set up successfully!');
});

// Initialize page with live chat mockup visible
document.addEventListener('DOMContentLoaded', function() {
    // Show live chat mockup by default
    const liveChatFeature = document.getElementById('live-chat-feature');
    if (liveChatFeature) {
        liveChatFeature.style.display = 'block';
    }
    
    // Set live chat button as active by default
    const liveChatButton = document.querySelector('.feature-button[onclick="showFeature(\'live-chat\')"]');
    if (liveChatButton) {
        liveChatButton.classList.add('active');
    }
    
    console.log('Page initialized with live chat mockup');
});