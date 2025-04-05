/**
 * Achievements JavaScript
 * Handles the loading and display of achievement icons
 */

document.addEventListener('DOMContentLoaded', function() {
  // Map of default icons for achievements that don't have custom ones
  const defaultAchievementIcons = {
    'first_event': '🌱', // First step
    'hometown_hero': '🏆', // Hometown hero
    'dedication': '⏱️', // Dedication (hours)
    'category_master': '🌈', // Well-rounded
    'streaker': '🔥', // Maintaining a streak
    'night_owl': '🦉', // Night events
    'early_bird': '🐦', // Morning events
    'weekend_warrior': '⚔️', // Weekend events
  };
  
  // Replace missing achievement icons with emojis or SVGs
  const achievementIcons = document.querySelectorAll('.achievement-badge');
  
  achievementIcons.forEach(badge => {
    const iconContainer = badge.querySelector('.icon-container');
    const achievementId = badge.dataset.achievementId;
    
    // If we're using the default SVG (no custom icon), replace with emoji if possible
    if (achievementId && defaultAchievementIcons[achievementId] && !iconContainer.querySelector('img')) {
      const emoji = document.createElement('span');
      emoji.textContent = defaultAchievementIcons[achievementId];
      emoji.style.fontSize = '1.5rem';
      
      // Replace the SVG with our emoji
      iconContainer.innerHTML = '';
      iconContainer.appendChild(emoji);
    }
  });
  
  // Add hover effects to achievement badges
  const achievementBadges = document.querySelectorAll('.badge');
  
  achievementBadges.forEach(badge => {
    badge.addEventListener('mouseenter', function() {
      gsap.to(this, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power1.out',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      });
    });
    
    badge.addEventListener('mouseleave', function() {
      gsap.to(this, {
        scale: 1,
        duration: 0.3,
        ease: 'power1.out',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      });
    });
  });
  
  // Animate achievement unlocks if any are new
  const newAchievements = document.querySelectorAll('.achievement-new');
  
  if (newAchievements.length > 0) {
    newAchievements.forEach((achievement, index) => {
      gsap.from(achievement, {
        scale: 0.5,
        opacity: 0,
        delay: 0.5 + (index * 0.2),
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)',
        onComplete: function() {
          // Add celebration particles
          createConfetti(achievement);
        }
      });
    });
  }
  
  // Animate progress bars for locked achievements
  const progressBars = document.querySelectorAll('.progress-bar-fill');
  
  gsap.from(progressBars, {
    width: 0,
    duration: 1.5,
    stagger: 0.1,
    ease: 'power2.out'
  });
});

// Function to create confetti effect for newly unlocked achievements
function createConfetti(element) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    document.body.appendChild(particle);
    
    // Random properties
    const size = Math.random() * 8 + 4;
    const color = `hsl(${Math.random() * 90 + 180}, 70%, 60%)`;
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 60 + 40;
    const distance = Math.random() * 60 + 60;
    
    // Style the particle
    particle.style.position = 'fixed';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.zIndex = '9999';
    
    // Set initial position
    gsap.set(particle, {
      x: centerX,
      y: centerY
    });
    
    // Animate
    gsap.to(particle, {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      opacity: 0,
      duration: 0.8 + Math.random() * 0.6,
      ease: 'power2.out',
      onComplete: function() {
        document.body.removeChild(particle);
      }
    });
  }
} 