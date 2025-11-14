// Utility functions for HighlightAssist extension

export function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function formatDate(date) {
  return new Date(date).toLocaleString();
}

// Add more helpers as needed
