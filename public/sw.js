self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// UPPDATERAR DIN COOLAWIDGET HELT AUTOMATISKT I BAKGRUNDEN
self.addEventListener('widgetupdate', (event) => {
  event.waitUntil(async function() {
    // 1. Hämta matvarorna ur telefonens dolda minne
    const rawItems = localStorage.getItem('bastfore.items.v1');
    const items = rawItems ? JSON.parse(rawItems) : [];
    
    // 2. Räkna ut hur många varor som håller på att gå ut (inom 3 dagar)
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 3);
    threshold.setHours(0, 0, 0, 0);
    
    const urgentItems = items.filter(i => {
      if (i.status !== 'pantry' && i.status !== 'pantry_dry') return false;
      const exp = new Date(i.expirationDate);
      exp.setHours(0, 0, 0, 0);
      return exp <= threshold;
    });

    const count = urgentItems.length;
    
    // 3. Bestäm färgtema baserat på hur akut det är i kylen
    let themeColor = '#10b981'; // Snygg grön
    let statusText = 'Allt lugnt!';
    if (count > 0) {
      themeColor = count <= 2 ? '#f59e0b' : '#ef4444'; // Orange eller Neonröd
      statusText = count === 1 ? '1 akut vara!' : `${count} akuta varor!`;
    }

    // 4. Rita upp den super-snygga, mörka minimalistiska widgeten (HTML/CSS-mall)
    const htmlTemplate = `
      <div style="
        background: #09090b; 
        color: #ffffff; 
        padding: 16px; 
        height: 100%; 
        font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
        display: flex; 
        flex-direction: column; 
        justify-content: space-between;
        box-sizing: border-box;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 800; tracking-spacing: 1px; color: #a1a1aa; text-transform: uppercase;">BästFöre</span>
          <div style="width: 8px; h-weight: 8px; height: 8px; border-radius: 50%; background: ${themeColor}; box-shadow: 0 0 8px ${themeColor};"></div>
        </div>
        
        <div style="margin-top: auto; margin-bottom: auto;">
          <h1 style="font-size: 32px; font-weight: 900; margin: 0; line-height: 1; font-variant-numeric: tabular-nums;">${count}</h1>
          <p style="font-size: 13px; font-weight: 700; color: ${themeColor}; margin: 2px 0 0 0;">${statusText}</p>
        </div>

        <div style="font-size: 10px; font-weight: 600; color: #71717a; border-t: 1px solid #18181b; padding-top: 6px;">
          ${urgentItems.length > 0 ? `Kolla: ${urgentItems[0].name}` : 'Kylen är säker 🍏'}
        </div>
      </div>
    `;

    // Skicka den färdiga designen till iPhones hemskärm
    await event.widget.update({
      template: 'kylkollen-widget',
      content: htmlTemplate
    });
  }());
});
