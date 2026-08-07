// Aktivera bakgrundsmotorn omedelbart
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Lyssna efter larmet från appen och skjut ut en riktig telefonnotis
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'PUSH_ALARM') {
    self.registration.showNotification('BästFöre 🍏', {
      body: event.data.message,
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [200, 100, 200]
    });
  }
});
