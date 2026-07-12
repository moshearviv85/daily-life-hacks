/**
 * Explicit authority-cluster ownership.
 *
 * This is intentionally separate from pillars.ts, whose keyword heuristics are
 * used for recommendations. These IDs are controlled frontmatter values and
 * each one has exactly one canonical parent.
 */
export const CONTENT_CLUSTER_IDS = [
  "budget-fiber",
  "budget-protein",
  "weekly-budget-shopping",
  "meal-prep-food-storage",
] as const;

export const CONTENT_CLUSTER_LABELS = [
  "Budget Fiber",
  "Budget Protein",
  "Weekly Budget Shopping",
  "Meal Prep & Food Storage",
] as const;

export const CONTENT_PARENT_PILLARS = [
  "how-to-eat-more-fiber-on-a-budget-complete-guide",
  "high-protein-on-a-budget-complete-guide",
  "eat-healthy-on-a-budget-complete-playbook",
  "meal-prep-for-beginners-complete-system",
] as const;

export type ContentClusterId = (typeof CONTENT_CLUSTER_IDS)[number];
export type ContentParentPillar = (typeof CONTENT_PARENT_PILLARS)[number];

export interface ContentClusterDefinition {
  id: ContentClusterId;
  label: (typeof CONTENT_CLUSTER_LABELS)[number];
  parentPillar: ContentParentPillar;
}

export const CONTENT_CLUSTERS: readonly ContentClusterDefinition[] =
  CONTENT_CLUSTER_IDS.map((id, index) => ({
    id,
    label: CONTENT_CLUSTER_LABELS[index],
    parentPillar: CONTENT_PARENT_PILLARS[index],
  }));

export function parentPillarForCluster(
  cluster: ContentClusterId,
): ContentParentPillar {
  const index = CONTENT_CLUSTER_IDS.indexOf(cluster);
  return CONTENT_PARENT_PILLARS[index];
}
