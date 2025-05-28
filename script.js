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

// Initialize mobile menu on page load
document.addEventListener('DOMContentLoaded', mobileMenuToggle);

// Parallax effect for hero section
const hero = document.querySelector('.hero');
if (hero) {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        hero.style.backgroundPositionY = -(scrolled * 0.5) + 'px';
    });
}

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

// Add active class to current page in navigation
const currentPage = window.location.pathname.split('/').pop();
document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
    }
}); 