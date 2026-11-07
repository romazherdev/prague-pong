# 09: Clash warnings for matches

**What to build:** The calendar and the captain views flag evenings with problems: a player in two line-ups on the same evening, or home matches needing more tables than the club has.

**Blocked by:** 08

**Status:** claimed

- [ ] Club settings (admin-editable): total tables (default 8), tables per home match (default 3), minimum tables for viable training (stored now, used in 15)
- [ ] The calendar query returns clash flags per evening; the UI only renders them
- [ ] Flag: the same member in two line-ups on the same evening
- [ ] Flag: home matches on one evening × tables per match > total tables
- [ ] Evenings with clashes are highlighted in the calendar, and the captain sees the warning on the affected match
- [ ] Each clash rule is covered by tests through the club core
