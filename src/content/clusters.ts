/**
 * The single source of truth for the site's four authority clusters.
 *
 * Frontmatter uses the controlled `id` and `parentPillar` values. Older
 * articles can still be classified by the deterministic keyword fallback,
 * but explicit metadata always wins.
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
  title: string;
  blurb: string;
  keywords: readonly string[];
}

export const CONTENT_CLUSTERS: readonly ContentClusterDefinition[] = [
  {
    id: "budget-fiber",
    label: "Budget Fiber",
    parentPillar: "how-to-eat-more-fiber-on-a-budget-complete-guide",
    title: "How to Eat More Fiber on a Budget",
    blurb:
      "Close the fiber gap with dry goods, freezer produce, and real price math.",
    keywords: [
      "fiber",
      "constipation",
      "prebiotic",
      "whole wheat",
      "oat",
      "oats",
      "oatmeal",
      "bean",
      "beans",
      "lentil",
      "lentils",
      "chia",
    ],
  },
  {
    id: "budget-protein",
    label: "Budget Protein",
    parentPillar: "high-protein-on-a-budget-complete-guide",
    title: "High Protein on a Budget",
    blurb:
      "Beans, eggs, and drumsticks first. Protein per dollar with USDA numbers.",
    keywords: [
      "protein",
      "egg",
      "eggs",
      "tofu",
      "turkey",
      "greek yogurt",
      "cottage cheese",
      "chicken",
      "legume",
    ],
  },
  {
    id: "weekly-budget-shopping",
    label: "Weekly Budget Shopping",
    parentPillar: "eat-healthy-on-a-budget-complete-playbook",
    title: "Eat Healthy on a Budget: Complete Playbook",
    blurb:
      "Build a cart that feeds well without premium prices. Systems, not willpower.",
    keywords: [
      "budget",
      "cheap",
      "affordable",
      "grocery",
      "groceries",
      "frugal",
      "cost",
      "costs",
      "save money",
      "aldi",
    ],
  },
  {
    id: "meal-prep-food-storage",
    label: "Meal Prep & Food Storage",
    parentPillar: "meal-prep-for-beginners-complete-system",
    title: "Meal Prep for Beginners: The Complete System",
    blurb:
      "Two bases, two proteins, and two sauces. Build a week of meals without eating the same sad container five times.",
    keywords: [
      "meal prep",
      "batch cooking",
      "make ahead",
      "freezer meal",
      "food storage",
      "work lunch",
      "weekly prep",
    ],
  },
] as const;

export const CONTENT_CLUSTER_BY_ID = new Map(
  CONTENT_CLUSTERS.map((cluster) => [cluster.id, cluster]),
);

export const CONTENT_CLUSTER_BY_PARENT = new Map(
  CONTENT_CLUSTERS.map((cluster) => [cluster.parentPillar, cluster]),
);

export function parentPillarForCluster(
  cluster: ContentClusterId,
): ContentParentPillar {
  return CONTENT_CLUSTER_BY_ID.get(cluster)!.parentPillar;
}

/**
 * Classify legacy content without frontmatter. Ties follow CONTENT_CLUSTERS
 * order, so the same input always returns the same cluster.
 */
export function inferLegacyCluster(
  text: string,
): ContentClusterDefinition | null {
  const haystack = text.toLowerCase();
  let best: ContentClusterDefinition | null = null;
  let bestHits = 0;

  for (const cluster of CONTENT_CLUSTERS) {
    const hits = cluster.keywords.reduce(
      (count, keyword) => {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`);
        return count + (pattern.test(haystack) ? 1 : 0);
      },
      0,
    );
    if (hits > bestHits) {
      best = cluster;
      bestHits = hits;
    }
  }

  return bestHits > 0 ? best : null;
}
