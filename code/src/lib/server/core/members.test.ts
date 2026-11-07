import { describe, expect, it } from 'vitest';
import { ForbiddenError } from './access';
import { createTestCore } from './testing';

function setup() {
	const harness = createTestCore({ now: '2026-11-10T14:00:00Z' });
	const club = harness.seed.club({ name: 'Mladí Veteráni', slug: 'mladi-veterani' });
	const admin = harness.seed.member({ clubId: club.id, name: 'Jana', isAdmin: true });
	return { ...harness, club, admin, asAdmin: { via: 'session' as const, memberId: admin.id } };
}

describe('listMembers', () => {
	it("lists the club's active members by name, for admins only", () => {
		const { core, club, seed, admin, asAdmin } = setup();
		const zdenek = seed.member({ clubId: club.id, name: 'Zdeněk' });
		const adam = seed.member({ clubId: club.id, name: 'Adam' });
		seed.member({ clubId: club.id, name: 'Left the club', active: false });

		expect(core.listMembers(asAdmin, club.id).map((m) => m.id)).toEqual([adam.id, admin.id, zdenek.id]);
		expect(() => core.listMembers({ via: 'personal-link', memberId: admin.id }, club.id)).toThrow(ForbiddenError);
	});
});
