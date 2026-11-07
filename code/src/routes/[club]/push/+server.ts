import { error, json, type RequestHandler } from '@sveltejs/kit';
import { answeringActor, clubRequest, guarded } from '#lib/server/request.js';
import { InvalidInputError } from '#lib/server/core/access.js';

/**
 * Turns push notifications on or off for this device, for the device's member (personal link, else the
 * signed-in member). Body: { subscribe: PushSubscriptionJSON } or { unsubscribe: endpoint }.
 */
export const POST: RequestHandler = async (event) => {
	const req = clubRequest(event);
	const actor = answeringActor(req);
	if (!actor) error(403);
	const body = (await event.request.json().catch(() => null)) as { subscribe?: unknown; unsubscribe?: unknown } | null;
	return guarded(req, () => {
		try {
			if (body?.subscribe) req.core.savePushSubscription(actor, req.club.id, body.subscribe as never);
			else if (typeof body?.unsubscribe === 'string') req.core.removePushSubscription(actor, req.club.id, body.unsubscribe);
			else error(400);
		} catch (e) {
			if (e instanceof InvalidInputError) error(400, e.code);
			throw e;
		}
		return json({ ok: true });
	});
};
