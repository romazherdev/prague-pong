import { error } from '@sveltejs/kit';
import { translator } from '#lib/i18n/messages.js';
import { publicOrigin } from '#lib/server/app.js';
import { answeringActor, clubRequest, guarded, guardedForm, trainingAnswerAction, trainingMessages } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	const who = answeringActor(req);
	const isAdmin = !!req.signedIn?.isAdmin;
	const exists = req.core.getTrainingSession(req.club.id, event.params.session);
	if (!exists) error(404, translator(event.locals.locale)('training.notFound'));
	return guarded(req, () => {
		const session = who
			? req.core.trainingSession(who, req.club.id, event.params.session)
			: { ...exists, comingNames: null, myAnswer: null };
		return {
			session,
			canAnswer: !!who,
			isAdmin,
			whatsapp: isAdmin ? trainingMessages(req, event.params.session, publicOrigin(event.url)) : null
		};
	});
};

export const actions: Actions = {
	training: trainingAnswerAction,
	cancel: (event) => {
		const req = clubRequest(event);
		return guardedForm(req, () => (req.core.cancelTrainingSession(req.actor, req.club.id, event.params.session), { cancelled: true }));
	},
	restore: (event) => {
		const req = clubRequest(event);
		return guardedForm(req, () => (req.core.restoreTrainingSession(req.actor, req.club.id, event.params.session), { restored: true }));
	}
};
