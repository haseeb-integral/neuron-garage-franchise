import { Star } from "lucide-react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, readOnly }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={readOnly ? "" : "cursor-pointer"}
        >
          <Star
            size={18}
            fill={n <= value ? "#fd7e14" : "transparent"}
            color={n <= value ? "#fd7e14" : "#adb5bd"}
          />
        </button>
      ))}
    </div>
  );
}
