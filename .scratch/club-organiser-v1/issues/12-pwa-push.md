# 12: PWA install and push notifications

**What to build:** Members and captains can install the app to their home screen and turn push notifications on or off. The real web-push notifier delivers the club core's notification intents, starting with "spot open" from 11.

**Blocked by:** 11

**Status:** claimed

- [ ] Web app manifest and service worker, so the app can be installed on Android and iOS; opening the installed app keeps the member's identity
- [ ] A member can turn push notifications on and off; subscriptions are stored per member and device
- [ ] A short explanation in-app that on iPhone, push notifications only work after adding the app to the home screen
- [ ] The web-push notifier implements the notifier port and delivers "spot open" to the captain's subscribed devices
- [ ] Expired or invalid subscriptions are removed when sending fails
- [ ] Notification text in the recipient's language
