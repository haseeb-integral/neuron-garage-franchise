import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, type NotificationRow } from "@/hooks/useNotifications";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  children: React.ReactNode;
}

export function NotificationsPopover({ children }: Props) {
  const navigate = useNavigate();
  const { items, unreadCount, isLoading, markRead, markAllRead } = useNotifications();

  const handleClick = (n: NotificationRow) => {
    if (!n.read_at) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 overflow-hidden"
        style={{
          width: 360,
          border: "1px solid #eef2f7",
          borderRadius: 12,
          backgroundColor: "#ffffff",
          boxShadow: "0 12px 32px -12px rgba(7,20,47,0.18)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #eef2f7" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: "#07142f" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="rounded-full px-1.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: "#e11d48", lineHeight: "16px" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
            className="text-[11px] font-semibold transition-colors disabled:opacity-40"
            style={{ color: "#174be8" }}
          >
            Mark all read
          </button>
        </div>

        <div className="max-h-[440px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "#526078" }}>
              Loading…
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell
                size={22}
                strokeWidth={1.5}
                className="mx-auto mb-2"
                style={{ color: "#94a3b8" }}
              />
              <div className="text-[12px]" style={{ color: "#526078" }}>
                You're all caught up.
              </div>
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f7faff]"
                      style={{ borderBottom: "1px solid #f1f4f9" }}
                    >
                      <span
                        className="mt-1.5 inline-block rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          minWidth: 8,
                          backgroundColor: unread ? "#174be8" : "transparent",
                          border: unread ? "none" : "1.5px solid #cbd5e1",
                        }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="text-[12.5px] leading-tight"
                          style={{
                            color: "#07142f",
                            fontWeight: unread ? 700 : 500,
                          }}
                        >
                          {n.title}
                        </div>
                        {n.message && (
                          <div
                            className="mt-0.5 text-[11.5px] leading-snug truncate"
                            style={{ color: "#526078" }}
                          >
                            {n.message}
                          </div>
                        )}
                        <div
                          className="mt-1 text-[10.5px]"
                          style={{ color: "#94a3b8" }}
                        >
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: "1px solid #eef2f7", backgroundColor: "#fafbfd" }}
        >
          <span className="text-[10px]" style={{ color: "#94a3b8" }}>
            Real-time live delivery
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: "#eef2f7", color: "#526078" }}
          >
            v1.1
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
