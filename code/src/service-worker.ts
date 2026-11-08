/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Makes the app installable and shows push notifications. Pages aren't cached: the app needs the server
// for everything (answers, line-ups), and stale pages would show stale answers.
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));

sw.addEventListener('push', (event) => {
	// The server writes the whole notification (title and text in the member's language).
	const content = (event.data?.json() ?? {}) as { title?: string; body?: string; url?: string };
	if (!content.title) return;
	event.waitUntil(
		sw.registration.showNotification(content.title, {
			body: content.body,
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			data: { url: content.url ?? '/' }
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = new URL((event.notification.data as { url: string }).url, sw.location.origin).href;
	event.waitUntil(
		(async () => {
			// Only windows this worker controls can be navigated; otherwise open a new one.
			const windows = await sw.clients.matchAll({ type: 'window' });
			const same = windows.find((w) => w.url === url);
			if (same) return void (await same.focus());
			const open = windows[0];
			if (open) {
				await open.focus();
				await open.navigate(url);
			} else {
				await sw.clients.openWindow(url);
			}
		})()
	);
});
