import { Sparkles, Cog, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

const NAVY = "#003c7e";
const BLUE = "#0757ff";
const YELLOW = "#FFD400";
const INK = "#0b1a36";

interface DocShellProps {
  eyebrow: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Shared documentation page shell — matches the User's Guide aesthetic
 * (yellow + navy + blue brand hero, premium typography, soft borders).
 * Use for: User's Guide, Full Specification, SmartLead API Spec, Outreach Guide.
 */
export const DocShell = ({
  eyebrow,
  eyebrowIcon: EyebrowIcon = Sparkles,
  title,
  subtitle,
  action,
  children,
}: DocShellProps) => {
  return (
    <div className="max-w-[1100px]">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-[28px] p-8 md:p-12 mb-10"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, ${YELLOW}33 0%, transparent 55%), radial-gradient(120% 140% at 100% 100%, ${BLUE}1a 0%, transparent 55%), #ffffff`,
          border: "1px solid #eef2f7",
        }}
      >
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-56 w-56 opacity-[0.08]"
          style={{ background: `radial-gradient(closest-side, ${NAVY}, transparent)` }}
        />
        <div className="absolute -bottom-12 -left-10 opacity-[0.06]">
          <Cog size={220} color={NAVY} strokeWidth={1.2} />
        </div>

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[760px]">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{ background: YELLOW, color: INK }}
            >
              <EyebrowIcon size={13} /> {eyebrow}
            </span>
            <h1
              className="mt-5 text-[34px] md:text-[44px] font-black leading-[1.05] tracking-tight"
              style={{ color: INK }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="mt-4 text-[15px] md:text-[16px] leading-relaxed max-w-[640px]"
                style={{ color: "#3a4a66" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </section>

      {children}
    </div>
  );
};

/**
 * Shared prose class for markdown rendering inside DocShell, tuned to match
 * the User's Guide typography (navy headings, blue links, soft code blocks).
 */
export const docProseClass =
  "prose prose-sm max-w-none " +
  "prose-headings:font-black prose-headings:tracking-tight prose-headings:text-[#0b1a36] " +
  "prose-h1:text-[28px] prose-h1:mt-10 prose-h1:mb-4 " +
  "prose-h2:text-[22px] prose-h2:mt-9 prose-h2:mb-3 prose-h2:text-[#003c7e] " +
  "prose-h3:text-[16px] prose-h3:font-bold prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-[#0b1a36] " +
  "prose-h4:text-[13px] prose-h4:font-bold prose-h4:uppercase prose-h4:tracking-[0.16em] prose-h4:text-[#003c7e] prose-h4:mt-5 prose-h4:mb-1.5 " +
  "prose-p:text-[14.5px] prose-p:leading-[1.7] prose-p:text-[#3a4a66] " +
  "prose-strong:text-[#0b1a36] prose-strong:font-bold " +
  "prose-a:text-[#0757ff] prose-a:no-underline prose-a:font-semibold hover:prose-a:underline " +
  "prose-li:text-[14.5px] prose-li:leading-[1.65] prose-li:text-[#3a4a66] prose-li:my-1 " +
  "prose-ul:my-3 prose-ol:my-3 " +
  "prose-code:rounded prose-code:bg-[#eef2f7] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[12.5px] prose-code:text-[#0b1a36] prose-code:font-semibold prose-code:before:content-none prose-code:after:content-none " +
  "prose-pre:bg-[#0b1a36] prose-pre:text-[#e5e7eb] prose-pre:text-[12.5px] prose-pre:rounded-2xl prose-pre:p-5 prose-pre:leading-relaxed " +
  "prose-table:text-[13.5px] prose-th:bg-[#fffaea] prose-th:text-[#0b1a36] prose-th:font-bold prose-th:border-[#eef2f7] prose-td:border-[#eef2f7] prose-td:text-[#3a4a66] " +
  "prose-blockquote:border-l-4 prose-blockquote:border-[#FFD400] prose-blockquote:bg-[#fffaea] prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-[#3a4a66] " +
  "prose-hr:border-[#eef2f7]";

/**
 * Shared content card wrapper — soft white card with brand shadow.
 * Use to wrap prose / TOC bodies under the hero.
 */
export const DocCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-[24px] bg-white p-7 md:p-10 ${className}`}
    style={{ border: "1px solid #eef2f7", boxShadow: "0 10px 30px rgba(11,26,54,0.05)" }}
  >
    {children}
  </div>
);
