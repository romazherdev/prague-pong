# 12: PWA install and push notifications

**What to build:** Members and captains can install the app to their home screen and turn push notifications on or off. The real web-push notifier delivers the club core's notification intents, starting with "spot open" from 11.

**Blocked by:** 11

**Status:** resolved

- [x] Web app manifest and service worker, so the app can be installed on Android and iOS; opening the installed app keeps the member's identity
- [x] A member can turn push notifications on and off; subscriptions are stored per member and device
- [x] A short explanation in-app that on iPhone, push notifications only work after adding the app to the home screen
- [x] The web-push notifier implements the notifier port and delivers "spot open" to the captain's subscribed devices
- [x] Expired or invalid subscriptions are removed when sending fails
- [x] Notification text in the recipient's language

## Comments

- 2026-11-08: Implemented. A per-club manifest (`/<club>/manifest.webmanifest`, fetched with credentials, never cached) whose `start_url` is the device member's own personal link, so the installed app knows who it belongs to, also on iPhone and also for captains who signed in by email (ADR 0004 addendum, with the trade-offs). Icons are in `static/icons/` (generated). The service worker (`src/service-worker.ts`) shows push notifications and opens the right page on tap; it doesn't cache pages. `PushToggle` on "Moje akce" and "Moje zápasy" turns push on and off per device, explains the iPhone home-screen requirement, and keeps the browser and the server in step. Core (`core/push.ts`): subscriptions per member and device (a shared phone moves to the member who subscribes last); only real push-service hosts are accepted (FCM, Mozilla, Apple, Windows), so the server can't be pointed at internal addresses; at most 10 devices per member; `notificationContent` writes the text in the recipient's saved language (Czech if none: the server has no device or browser language at send time). `src/lib/server/web-push-notifier.ts` implements the Notifier port with the `web-push` library (VAPID). It sends to each device of the recipient and removes devices the push service reports gone (404/410).
- Not tried end to end: the agent sandbox can't reach browser push services, so real delivery is untested. Set the VAPID keys (DEPLOY.md, "Push notifications"), turn it on from a phone, and have someone in a line-up answer "no" to see it arrive.
- `NotificationIntent` (`core/ports.ts`) is now a union of known kinds, starting with `spotOpen`; add new kinds there and in `notificationContent`.

