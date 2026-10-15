// The part of the SOS profile that is shown on the watch after an alert. Pure (no path aliases) so it runs under
// plain Node for tests. Deliberately smaller than the public card: no doctor, hospital, insurance, height or weight.

export const WATCH_CARD_LIMITS = { list: 10, meds: 10, contacts: 3, notes: 200 } as const;

type ProfileInput = {
  full_name: string | null;
  blood_type: string | null;
  epilepsy_type: string | null;
  seizure_notes: string | null;
  allergies: string[];
  conditions: string[];
};

export type WatchCardInput = {
  profile: ProfileInput | null;
  meds: { name: string; dosage: string | null }[];
  contacts: { name: string; relation: string | null; phone: string }[];
};

export type WatchCard = {
  name: string | null;
  age: number | null;
  blood_type: string | null;
  epilepsy_type: string | null;
  seizure_notes: string | null;
  allergies: string[];
  conditions: string[];
  meds: { name: string; dosage: string | null }[];
  contacts: { name: string; relation: string | null; phone: string }[];
};

const clip = (s: string | null, max: number) => (s && s.length > max ? s.slice(0, max - 1) + "…" : s);

/** Returns null when the wearer has no profile yet, so the watch can say so instead of showing an empty card. */
export function toWatchCard(data: WatchCardInput, age: number | null): WatchCard | null {
  const p = data.profile;
  if (!p) return null;
  const L = WATCH_CARD_LIMITS;
  return {
    name: p.full_name,
    age,
    blood_type: p.blood_type,
    epilepsy_type: p.epilepsy_type,
    seizure_notes: clip(p.seizure_notes, L.notes),
    allergies: p.allergies.slice(0, L.list),
    conditions: p.conditions.slice(0, L.list),
    meds: data.meds.slice(0, L.meds).map((m) => ({ name: m.name, dosage: m.dosage })),
    contacts: data.contacts.slice(0, L.contacts).map((c) => ({ name: c.name, relation: c.relation, phone: c.phone })),
  };
}
