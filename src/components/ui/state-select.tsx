import { cn } from "@/lib/utils";

export const US_STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

interface Props {
  id?: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Two-letter US state dropdown. Keeps an old non-standard saved value visible so nothing is lost. */
export function StateSelect({ id, value, onChange, disabled, className, style }: Props) {
  const v = value ?? "";
  const legacy = v && !US_STATE_CODES.includes(v) ? v : null;
  return (
    <select
      id={id}
      aria-label="State"
      value={v}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={style}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
    >
      <option value="">State</option>
      {legacy && <option value={legacy}>{legacy}</option>}
      {US_STATE_CODES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
