// DOM Elements
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modal-image');

// Mobile menu toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar.style.background = 'rgba(10, 10, 10, 0.95)';
    } else {
        navbar.style.background = 'rgba(10, 10, 10, 0.9)';
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Counter animation for hero stats
function animateCounter(element, target) {
    const increment = target / 100;
    let current = 0;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 20);
}

// Fetch GitHub data
async function fetchGitHubData() {
    try {
        // Repo data
        const response = await fetch('https://api.github.com/repos/xZepyx/HyprZepyx');
        if (!response.ok) throw new Error(`Repo fetch failed: ${response.status}`);
        const data = await response.json();
        console.log("Repo data:", data);

        // Stars
        const starsElement = document.getElementById('stars');
        if (starsElement) {
            animateCounter(starsElement, Number(data.stargazers_count) || 0);
        }

        // Forks
        const forksElement = document.getElementById('forks');
        if (forksElement) {
            animateCounter(forksElement, Number(data.forks_count) || 0);
        }

        // Issues
        const issuesResponse = await fetch('https://api.github.com/repos/xZepyx/HyprZepyx/issues?state=open');
        if (!issuesResponse.ok) throw new Error(`Issues fetch failed: ${issuesResponse.status}`);
        const issuesData = await issuesResponse.json();
        console.log("Issues data:", issuesData);

        const issuesElement = document.getElementById('issues');
        if (issuesElement) {
            animateCounter(issuesElement, Number(issuesData.length) || 0);
        }

    } catch (error) {
        console.error("GitHub API fetch failed:", error);

        // Fallback values
        const starsElement = document.getElementById('stars');
        const forksElement = document.getElementById('forks');
        const issuesElement = document.getElementById('issues');

        if (starsElement) animateCounter(starsElement, 0);
        if (forksElement) animateCounter(forksElement, 0);
        if (issuesElement) animateCounter(issuesElement, 0);
    }
}


// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Animate counters when hero section is visible
            if (entry.target.classList.contains('hero')) {
                fetchGitHubData();
            }
            
            // Add animation classes
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

// Observe sections for animations
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Modal functionality for screenshots
function openModal(imageUrl) {
    modal.style.display = 'block';
    modalImage.src = imageUrl;
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
    }
});

// Copy to clipboard functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Copied to clipboard!');
    });
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--accent-gradient);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideInUp 0.3s ease-out;
        box-shadow: var(--shadow-lg);
        font-weight: 500;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

// Add CSS for toast animations
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes slideInUp {
        from {
            transform: translateY(100px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(toastStyles);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add loading animation
    document.body.classList.add('loaded');
});

// Smooth reveal animations on scroll
window.addEventListener('scroll', () => {
    const reveals = document.querySelectorAll('.feature-card, .screenshot-item, .feature-item');
    
    reveals.forEach(reveal => {
        const windowHeight = window.innerHeight;
        const elementTop = reveal.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            reveal.style.opacity = '1';
            reveal.style.transform = 'translateY(0)';
        }
    });
});

// Add initial styles for reveal animation
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.feature-card, .screenshot-item, .feature-item');
    revealElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
});