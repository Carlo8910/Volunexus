/**
 * Server-side Handlebars helpers
 */

module.exports = {
  // Helper for formatting dates
  formatDate: function(dateString, format) {
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
  },
  
  // Helper for equality comparison
  eq: function(a, b) {
    return a === b;
  },
  
  // Helper for incrementing index
  addOne: function(value) {
    return parseInt(value) + 1;
  },
  
  // Helper for multiplying values
  multiply: function(a, b) {
    return a * b;
  },
  
  // Helper for JSON stringify
  json: function(context) {
    return JSON.stringify(context);
  }
}; 