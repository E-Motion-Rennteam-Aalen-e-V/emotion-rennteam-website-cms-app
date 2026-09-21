/**
 * Official list of the team's specialist groups, in display order. Single
 * source of truth so the Team page, the homepage stat, the Mitmachen
 * application form, and the CMS "Abteilung" field can't drift apart again.
 *
 * Kept in its own module (no fs/path imports) so it can be imported both
 * from server-only code (src/lib/content.ts) and from client components
 * (src/lib/cms/collections.ts is bundled into the admin UI).
 */
export const TEAM_DEPARTMENTS = [
  "Project Management",
  "Workshop",
  "Chassis and Ergonomics",
  "Electrics",
  "Powertrain",
  "Aerodynamics",
  "Suspension and Steering Systems",
  "Driverless",
  "Vehicle Dynamics",
  "Testing and Data Acquisition",
  "Media and Marketing",
  "Business Plan",
  "Sponsoring",
  "Eventmanagement",
  "Finance",
] as const;

/**
 * Fallback "Jahrgang" (generation) assigned to team members whose content
 * file predates the `generation` field, so they still show up under the
 * current generation on the Team page instead of disappearing.
 */
export const DEFAULT_GENERATION = "ERT-14/26";

/**
 * Official sponsoring tiers, single source of truth for the CMS sponsor
 * collection's "Sponsoring-Stufe" field and the sponsoring inquiry form's
 * tier selection.
 */
export const SPONSOR_TIERS = ["Platin", "Gold", "Silber", "Partner"] as const;
