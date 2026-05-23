export type MetricStatus = "live" | "proxy" | "missing" | "blocked" | "manual";

export type MetricCategory =
  | "demand"
  | "competitive_landscape"
  | "franchisee_supply";

export type LiveSignal = {
  id?: string;
  signal_key?: string;
  label?: string;
  value?: string | number | null;
  source?: string | null;
  source_url?: string | null;
  confidence?: number | null;
  raw_data?: {
    status?: MetricStatus;
    metric_category?: MetricCategory;
    used_in_score?: boolean;
    notes?: string | null;
    [key: string]: unknown;
  } | null;
};
