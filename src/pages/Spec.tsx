import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SPEC_MARKDOWN } from "@/data/specMarkdown";
import { DocShell } from "@/components/DocShell";

const NAVY = "#003c7e";
const INK = "#0b1a36";

const handleDownloadSpec = () => {
  const blob = new Blob([SPEC_MARKDOWN], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "neuron-garage-franchise-spec.md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Stable slug used for in-page anchors (mirrors the TOC links in the markdown).
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const Spec = () => (
  <DocShell
    title="Full Specification"
    subtitle="The complete product spec for the Neuron Garage Franchise Acquisition System. The same markdown drives this page and the downloadable file — they can never drift."
    actions={
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadSpec}
          className="gap-2"
          style={{ borderColor: NAVY, color: NAVY }}
        >
          <Download className="h-4 w-4" /> Download Markdown
        </Button>
        <Button
          size="sm"
          onClick={() => window.print()}
          className="gap-2 text-white"
          style={{ backgroundColor: NAVY }}
        >
          <FileText className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>
    }
  >
    <article
      className="max-w-none text-[14.5px] leading-[1.7]"
      style={{ color: "#3a4a66" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              className="text-[28px] font-black tracking-tight mb-4 mt-2"
              style={{ color: NAVY }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => {
            const text = String(children);
            return (
              <h2
                id={slugify(text)}
                className="scroll-mt-20 text-[22px] font-black tracking-tight mt-10 mb-3 pt-4 border-t border-[#eef2f7]"
                style={{ color: NAVY }}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children }) => (
            <h3
              className="text-[16px] font-bold mt-6 mb-2"
              style={{ color: INK }}
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              className="text-[14px] font-bold uppercase tracking-wide mt-5 mb-2"
              style={{ color: INK }}
            >
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-3">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium hover:underline"
              style={{ color: "#174be8" }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-3 ml-5 list-disc space-y-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-5 list-decimal space-y-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-bold" style={{ color: INK }}>
              {children}
            </strong>
          ),
          code: ({ children, className }) => {
            // Block code (has language-* class) vs inline code.
            const isBlock = (className ?? "").startsWith("language-");
            if (isBlock) {
              return (
                <code className="block whitespace-pre overflow-x-auto rounded-md bg-[#0b1a36] text-[#d6e2f5] text-[12.5px] p-3 my-3 font-mono leading-relaxed">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-[#f2f4f6] px-1.5 py-0.5 font-mono text-[12.5px]" style={{ color: INK }}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-3">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote
              className="my-4 border-l-4 pl-4 py-2 text-[13.5px] rounded-r"
              style={{
                borderColor: "#fd7e14",
                backgroundColor: "#fff8ec",
                color: "#5a3a00",
              }}
            >
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-[#eef2f7]">
              <table className="w-full text-[13px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#f7faff]" style={{ color: INK }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="text-left font-bold px-3 py-2 border-b border-[#eef2f7]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-[#f2f4f6] align-top">
              {children}
            </td>
          ),
          hr: () => <hr className="my-8 border-[#eef2f7]" />,
        }}
      >
        {SPEC_MARKDOWN}
      </ReactMarkdown>

      <p className="text-[11px] text-[#8893a7] mt-10 mb-2 italic">
        This page renders the same markdown that the Download Markdown button produces.
        Edit <code className="font-mono">src/data/specMarkdown.ts</code> to update both.
      </p>
    </article>
  </DocShell>
);

export default Spec;
