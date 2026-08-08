self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Lyssnar på larmet från appen och skapar den perfekta notisen på din låsta skärm
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'PUSH_ALARM') {
    self.registration.showNotification('BästFöre', {
      body: event.data.message,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [100, 50, 100]
    });
  }
});
