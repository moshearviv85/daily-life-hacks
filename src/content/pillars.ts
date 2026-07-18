/**
 * Backwards-compatible pillar helpers.
 *
 * Cluster ownership lives in clusters.ts. Keep this module as a small adapter
 * so older imports cannot create a second registry.
 */
import {
  CONTENT_CLUSTERS,
  CONTENT_CLUSTER_BY_ID,
  inferLegacyCluster,
  type ContentClusterId,
} from "./clusters";

export const PILLARS = CONTENT_CLUSTERS.map((cluster) => ({
  slug: cluster.parentPillar,
  cluster: cluster.id,
  title: cluster.title,
  blurb: cluster.blurb,
}));

export type PillarCluster = ContentClusterId;

export const PILLAR_SLUGS: ReadonlySet<string> = new Set(
  CONTENT_CLUSTERS.map((cluster) => cluster.parentPillar),
);

export function clusterForText(text: string): PillarCluster | null {
  return inferLegacyCluster(text)?.id ?? null;
}

export function pillarSlugForCluster(cluster: PillarCluster): string {
  return CONTENT_CLUSTER_BY_ID.get(cluster)!.parentPillar;
}
