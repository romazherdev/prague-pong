import { clubRequest } from '#lib/server/request.js';
import { vapidConfig } from '#lib/server/web-push-notifier.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	const { club, signedIn, member } = clubRequest(event);
	return {
		club,
		signedIn: signedIn && { name: signedIn.name, isAdmin: signedIn.isAdmin, captainOf: signedIn.captainOf },
		member: member && { name: member.name },
		vapidPublicKey: vapidConfig()?.publicKey ?? null
	};
};
