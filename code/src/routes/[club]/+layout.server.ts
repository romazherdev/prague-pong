import { clubRequest } from '#lib/server/request.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => {
	const { club, signedIn } = clubRequest(event);
	return {
		club,
		signedIn: signedIn && { name: signedIn.name, isAdmin: signedIn.isAdmin, captainOf: signedIn.captainOf }
	};
};
