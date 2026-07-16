/** Hub pillars for /guides/ and RelatedArticles boost (CP5.4). */
export const PILLARS = [
  {
    slug: "how-to-eat-more-fiber-on-a-budget-complete-guide",
    cluster: "fiber",
    title: "How to Eat More Fiber on a Budget",
    blurb:
      "Close the fiber gap with dry goods, freezer produce, and real price math.",
  },
  {
    slug: "eat-healthy-on-a-budget-complete-playbook",
    cluster: "budget",
    title: "Eat Healthy on a Budget: Complete Playbook",
    blurb:
      "Build a cart that feeds well without premium prices. Systems, not willpower.",
  },
  {
    slug: "high-protein-on-a-budget-complete-guide",
    cluster: "protein",
    title: "High Protein on a Budget",
    blurb:
      "Beans, eggs, and drumsticks first. Protein per dollar with USDA numbers.",
  },
  {
    slug: "meal-prep-for-beginners-complete-system",
    cluster: "meal-prep",
    title: "Meal Prep for Beginners: The Complete System",
    blurb:
      "Two bases, two proteins, and two sauces. Build a week of meals without eating the same sad container five times.",
  },
] as const;

export type PillarCluster = (typeof PILLARS)[number]["cluster"];

export const PILLAR_SLUGS: ReadonlySet<string> = new Set(
  PILLARS.map((p) => p.slug),
);

export const CLUSTER_KEYWORDS: Record<PillarCluster, string[]> = {
  fiber: [
    "fiber",
    "gut",
    "bean",
    "lentil",
    "oat",
    "chia",
    "whole wheat",
    "constipation",
    "prebiotic",
  ],
  budget: [
    "budget",
    "cheap",
    "affordable",
    "grocery",
    "frugal",
    "dollar",
    "cost",
    "save money",
    "aldi",
  ],
  protein: [
    "protein",
    "egg",
    "tofu",
    "turkey",
    "greek yogurt",
    "cottage cheese",
    "chicken",
    "legume",
  ],
  "meal-prep": [
    "meal prep",
    "batch cooking",
    "make ahead",
    "freezer meal",
    "food storage",
    "work lunch",
    "weekly prep",
  ],
};

export function clusterForText(text: string): PillarCluster | null {
  const hay = text.toLowerCase();
  let best: PillarCluster | null = null;
  let bestHits = 0;
  for (const [cluster, keywords] of Object.entries(CLUSTER_KEYWORDS) as [
    PillarCluster,
    string[],
  ][]) {
    const hits = keywords.filter((k) => hay.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = cluster;
    }
  }
  return bestHits > 0 ? best : null;
}

export function pillarSlugForCluster(cluster: PillarCluster): string {
  return PILLARS.find((p) => p.cluster === cluster)!.slug;
}
