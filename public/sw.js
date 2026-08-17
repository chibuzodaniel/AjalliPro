self.addEventListener("push", (event) => {
  let data = { title: "Cusica ERP", body: "You have a new notification.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const focusedClient = allClients.find((c) => c.focused);

      if (focusedClient) {
        // App is open and in front — show an in-page floating toast instead
        // of a duplicate OS notification.
        focusedClient.postMessage({ type: "push-notification", payload: data });
        return;
      }

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/next.svg",
        badge: "/next.svg",
        data: { url: data.url },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
