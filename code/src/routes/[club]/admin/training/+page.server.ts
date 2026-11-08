import { clubRequest, guarded, guardedForm } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({
		rules: req.core.listTrainingRules(req.actor, req.club.id),
		venues: req.core.clubVenues(req.actor, req.club.id),
		sessions: req.core.listTrainingSessions(req.club.id)
	}));
};

/** Weekdays, times and venue from a rule form. */
const ruleFrom = (form: FormData) => ({
	weekdays: form.getAll('weekday').map(Number),
	startTime: String(form.get('startTime') ?? ''),
	endTime: String(form.get('endTime') ?? ''),
	venueId: String(form.get('venueId') ?? '')
});

export const actions: Actions = {
	create: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		return guardedForm(req, () => (req.core.createTrainingRule(req.actor, req.club.id, ruleFrom(form)), { saved: 'new' }));
	},
	update: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		const ruleId = String(form.get('ruleId') ?? '');
		return guardedForm(req, () => (req.core.updateTrainingRule(req.actor, req.club.id, ruleId, ruleFrom(form)), { saved: ruleId }));
	},
	end: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		const ruleId = String(form.get('ruleId') ?? '');
		return guardedForm(req, () => (req.core.endTrainingRule(req.actor, req.club.id, ruleId, String(form.get('lastDate') ?? '')), { saved: ruleId }));
	}
};
