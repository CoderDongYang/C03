import crypto from "crypto";

const HASH_SALT = "ab-test-platform-salt-2024";

export function hashAssignVersion(
  experimentId: string,
  visitorId: string,
  weights: { versionId: string; weight: number }[]
): string {
  const hashInput = `${experimentId}:${visitorId}:${HASH_SALT}`;
  const hash = crypto.createHash("md5").update(hashInput).digest("hex");
  
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const bucket = hashInt % 100;

  let cumulative = 0;
  for (const { versionId, weight } of weights) {
    cumulative += weight;
    if (bucket < cumulative) {
      return versionId;
    }
  }

  return weights[weights.length - 1].versionId;
}
