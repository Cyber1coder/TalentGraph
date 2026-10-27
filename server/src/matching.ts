export type MatchProfile = { skills?: { name: string }[]; experienceYears?: number; location?: { city?: string; country?: string }; preferredRoles?: string[]; preferredLocations?: string[] };
export type MatchJob = { requiredSkills?: { name: string }[]; preferredSkills?: { name: string }[]; minExperience?: number; maxExperience?: number; location?: { city?: string; country?: string }; workMode?: string; title?: string };
export const MATCH_WEIGHTS = { required: 0.45, preferred: 0.15, experience: 0.2, location: 0.1, title: 0.1 } as const;
if (Object.values(MATCH_WEIGHTS).reduce((sum, weight) => sum + weight, 0) !== 1) throw new Error('Match weights must sum to 1');
const aliases: Record<string, string> = { nodejs: 'node.js', 'node js': 'node.js', reactjs: 'react', 'amazon web services': 'aws', js: 'javascript' };
export const normalizeSkill = (s: string) => { const key = s.toLowerCase().trim().replace(/\s+/g, ' '); return aliases[key] ?? key; };
export function scoreMatch(p: MatchProfile, j: MatchJob) {
  const have = new Set((p.skills ?? []).map(x => normalizeSkill(x.name)));
  const req = [...new Set((j.requiredSkills ?? []).map(x => normalizeSkill(x.name)))], pref = [...new Set((j.preferredSkills ?? []).map(x => normalizeSkill(x.name)))];
  const requiredMatched = req.filter(x => have.has(x)), preferredMatched = pref.filter(x => have.has(x));
  const reqScore = req.length ? requiredMatched.length / req.length * 100 : 100, prefScore = pref.length ? preferredMatched.length / pref.length * 100 : 100;
  const years = p.experienceYears ?? 0, min = j.minExperience ?? 0, max = j.maxExperience;
  const exp = max === undefined || max <= min ? (years >= min ? 100 : min === 0 ? 100 : Math.max(0, years / min * 100)) : Math.max(0, 100 - Math.max(min - years, years - max) * 20);
  const hasLocationRequirement = !!(j.location?.city || j.location?.country);
  const sameCountry = !!p.location?.country && p.location.country.toLowerCase() === j.location?.country?.toLowerCase();
  const sameCity = !!p.location?.city && p.location.city.toLowerCase() === j.location?.city?.toLowerCase();
  const location = j.workMode === 'remote' || !hasLocationRequirement || sameCity || sameCountry ? 100 : 0;
  const roles = p.preferredRoles ?? [];
  const title = !roles.length || roles.some(r => j.title?.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes((j.title ?? '').toLowerCase())) ? 100 : 50;
  const score = Math.round(reqScore * MATCH_WEIGHTS.required + prefScore * MATCH_WEIGHTS.preferred + exp * MATCH_WEIGHTS.experience + location * MATCH_WEIGHTS.location + title * MATCH_WEIGHTS.title);
  return { score, requiredMatched, requiredMissing: req.filter(x => !have.has(x)), preferredMatched, components: { requiredSkills: Math.round(reqScore), preferredSkills: Math.round(prefScore), experience: Math.round(exp), location, title }, explanation: `${requiredMatched.length}/${req.length} required skills, ${years} years experience; ${location === 100 ? 'location or remote compatible' : 'location mismatch'}.` };
}
