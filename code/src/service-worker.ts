/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Makes the app installable and shows push notifications. Pages aren't cached: the app needs the server
// for everything (answers, line-ups), and stale pages would show stale answers.
const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (event) => event.waitUntil(sw.clients.claim()));
// A fetch handler is part of what makes browsers offer "install"; it just goes to the network.
sw.addEventListener('fetch', () => {});

sw.addEventListener('push', (event) => {
	const content = (event.data?.json() ?? {}) as { title?: string; body?: string; url?: string };
	event.waitUntil(
		sw.registration.showNotification(content.title ?? 'Prague Pong', {
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
			const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const open = windows.find((w) => w.url === url) ?? windows[0];
			if (open) {
				await open.focus();
				if (open.url !== url) await open.navigate(url);
			} else {
				await sw.clients.openWindow(url);
			}
		})()
	);
});
