/**
 * "Open in maps" links for an address, using each provider's documented URL scheme so they open
 * the app on phones that have it installed:
 * - Google Maps: https://developers.google.com/maps/documentation/urls/get-started#search-action
 * - Mapy.com (Mapy.cz): https://developer.mapy.com/further-uses-of-mapycz/mapy-cz-url/
 */
export function mapLinks(address: string): { googleMaps: string; mapyCz: string } {
	const query = encodeURIComponent(address);
	return {
		googleMaps: `https://www.google.com/maps/search/?api=1&query=${query}`,
		mapyCz: `https://mapy.com/fnc/v1/search?query=${query}`
	};
}
