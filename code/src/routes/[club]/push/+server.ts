import { error, json, type RequestHandler } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { answeringActor, clubRequest, guardedForm } from '#lib/server/request.js';

/**
 * Turns push notifications on or off for this device, for the device's member (personal link, else the
 * signed-in member). Body: { subscribe: PushSubscriptionJSON } or { unsubscribe: endpoint }.
 */
export const POST: RequestHandler = async (event) => {
	const req = clubRequest(event);
	const t = translator(event.locals.locale);
	const actor = answeringActor(req);
	if (!actor) error(403, t('error.linkInvalid'));
	const body = (await event.request.json().catch(() => null)) as { subscribe?: unknown; unsubscribe?: unknown } | null;
	const result = guardedForm(req, () => {
		if (body?.subscribe) req.core.savePushSubscription(actor, req.club.id, body.subscribe);
		else if (typeof body?.unsubscribe === 'string') req.core.removePushSubscription(actor, req.club.id, body.unsubscribe);
		else error(400, t('error.pushSubscriptionInvalid'));
		return { ok: true };
	});
	if ('status' in result) error(result.status, t('error.pushSubscriptionInvalid'));
	return json(result);
};
