export type PlanId = 'free' | 'professional' | 'business';

export type PlanLimits = Record<string, number | null>;

export type PlanFeatures = Record<string, boolean>;

export interface PlanEntitlements {
  planId: PlanId;
  limits: PlanLimits;
  features: PlanFeatures;
}

const VALID_PLAN_IDS: PlanId[] = [
  'free',
  'professional',
  'business'
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function normalizePlanEntitlements(
  planId: string,
  limits: unknown,
  features: unknown
): PlanEntitlements {
  const safePlanId: PlanId = VALID_PLAN_IDS.includes(
    planId as PlanId
  )
    ? (planId as PlanId)
    : 'free';

  const safeLimits: PlanLimits = {};
  const safeFeatures: PlanFeatures = {};

  if (isRecord(limits)) {
    for (const [key, value] of Object.entries(limits)) {
      if (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        value >= 0
      ) {
        safeLimits[key] = value;
      } else if (value === null) {
        safeLimits[key] = null;
      }
    }
  }

  if (isRecord(features)) {
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === 'boolean') {
        safeFeatures[key] = value;
      }
    }
  }

  return {
    planId: safePlanId,
    limits: safeLimits,
    features: safeFeatures
  };
}

export function hasFeature(
  entitlements: PlanEntitlements,
  feature: string
): boolean {
  return entitlements.features[feature] === true;
}

export function getLimit(
  entitlements: PlanEntitlements,
  limit: string
): number | null {
  return entitlements.limits[limit] ?? null;
}
