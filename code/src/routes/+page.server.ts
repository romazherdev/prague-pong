import { redirect } from '@sveltejs/kit';
import { defaultClubSlug } from '#lib/server/app.js';

export const load = () => redirect(307, `/${defaultClubSlug()}`);
