/* PWA registration (web build only) */
document.body.classList.add('web-mode');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('SalahNest service worker registration failed; offline support is unavailable for this visit:', error);
    });
  });
}
