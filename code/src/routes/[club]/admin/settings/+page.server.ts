import { clubRequest, guarded, guardedForm } from '#lib/server/request.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const req = clubRequest(event);
	return guarded(req, () => ({ settings: req.core.clubSettingsForAdmin(req.actor, req.club.id) }));
};

export const actions: Actions = {
	default: async (event) => {
		const req = clubRequest(event);
		const form = await event.request.formData();
		// A missing or empty field is NaN, which the core refuses (not 0).
		const num = (name: string) => (form.get(name) ? Number(form.get(name)) : NaN);
		return guardedForm(req, () => {
			req.core.updateClubSettings(req.actor, req.club.id, {
				totalTables: num('totalTables'),
				tablesPerHomeMatch: num('tablesPerHomeMatch'),
				minTrainingTables: num('minTrainingTables')
			});
			return { settingsSaved: true };
		});
	}
};
