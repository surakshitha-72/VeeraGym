/**
 * VeeraGym - Service Worker for Outside-App Background Push Notifications
 * Handles background push alerts even when the browser or application is closed.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push message
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'VeeraGym Notification',
        body: event.data.text(),
        data: { url: '/?view=reminders' },
      };
    }
  }

  const title = data.title || 'VeeraGym: Renewal Reminder';
  const options = {
    body: data.body || 'Upcoming membership renewal requires attention.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.svg',
    tag: data.tag || 'veeragym-renewal-alert',
    renotify: true,
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    data: data.data || { url: '/?view=reminders' },
    actions: data.actions && data.actions.length > 0 ? data.actions : [
      { action: 'open_reminder', title: 'Review & Prepare' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: Deep link directly to customer reminder approval
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/?view=reminders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an existing VeeraGym window is already open
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          // Send message to open view directly without full reload if supported
          try {
            client.postMessage({
              type: 'NAVIGATE_TO_REMINDER',
              url: targetUrl,
              data: event.notification.data,
            });
          } catch (e) {
            // Ignore postMessage error
          }
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      // If no window is open, open a fresh window to the deep-linked URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
