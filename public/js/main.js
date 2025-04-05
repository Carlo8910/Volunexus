// Main JavaScript file for common functionality

// Helper function for date formatting
function formatDate(dateString, format) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = {};
  
  if (format.includes('yyyy') || format.includes('YYYY')) {
    options.year = 'numeric';
  }
  
  if (format.includes('MM')) {
    options.month = '2-digit';
  } else if (format.includes('MMM')) {
    options.month = 'short';
  } else if (format.includes('MMMM')) {
    options.month = 'long';
  }
  
  if (format.includes('dd') || format.includes('DD')) {
    options.day = '2-digit';
  } else if (format.includes('d') || format.includes('D')) {
    options.day = 'numeric';
  }
  
  if (format.includes('HH') || format.includes('hh')) {
    options.hour = '2-digit';
  } else if (format.includes('H') || format.includes('h')) {
    options.hour = 'numeric';
  }
  
  if (format.includes('mm')) {
    options.minute = '2-digit';
  }
  
  if (format.includes('ss')) {
    options.second = '2-digit';
  }
  
  if (format.includes('a') || format.includes('A')) {
    options.hour12 = true;
  }
  
  if (format.includes('dddd')) {
    options.weekday = 'long';
  }
  
  return date.toLocaleString('en-US', options);
}

// Register Handlebars helpers if Handlebars is available
if (typeof Handlebars !== 'undefined') {
  // Helper for formatting dates
  Handlebars.registerHelper('formatDate', function(dateString, format) {
    return formatDate(dateString, format);
  });
  
  // Helper for equality comparison
  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  // Helper for incrementing index
  Handlebars.registerHelper('addOne', function(value) {
    return parseInt(value) + 1;
  });
  
  // Helper for multiplying values
  Handlebars.registerHelper('multiply', function(a, b) {
    return a * b;
  });
  
  // Helper for JSON stringify
  Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
  });
}

// DOM Ready event handler
document.addEventListener('DOMContentLoaded', function() {
  // Initialize any components that need to be set up on all pages
  
  // Add fade-out effect to flash messages
  const flashMessages = document.querySelectorAll('.flash-message');
  if (flashMessages.length) {
    flashMessages.forEach(message => {
      setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
          message.style.display = 'none';
        }, 500);
      }, 4000);
    });
  }
  
  // Handle animations for progressive reveal
  const animatedItems = document.querySelectorAll('.animated-item');
  
  if (animatedItems.length) {
    // Use IntersectionObserver if supported
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      
      // Set initial state and observe
      animatedItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        observer.observe(item);
      });
    } else {
      // Fallback for browsers without IntersectionObserver
      animatedItems.forEach(item => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      });
    }
  }
  
  // Initialize progress bars with animation
  const progressBars = document.querySelectorAll('.progress-bar .progress');
  
  if (progressBars.length) {
    progressBars.forEach(bar => {
      const width = bar.style.width;
      bar.style.width = '0';
      
      setTimeout(() => {
        bar.style.width = width;
      }, 300);
    });
  }
}); 