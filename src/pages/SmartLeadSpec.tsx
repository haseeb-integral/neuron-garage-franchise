import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — raw markdown import
import SPEC from "@/data/smartleadSpec.md?raw";

const SmartLeadSpec = () => {
  const handleDownload = () => {
    const blob = new Blob([SPEC], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smartlead-api-technical-spec.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="SmartLead API Spec"
        subtitle="Engineering reference for the SmartLead integration (proxy, webhooks, schema, realtime)."
        icon={<Send size={20} />}
        right={
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download size={14} className="mr-1.5" /> Download .md
          </Button>
        }
      />
      <div className="mx-auto max-w-4xl px-6 py-6">
        <article
          className="prose prose-sm max-w-none
            prose-headings:font-bold prose-headings:text-[#07142f]
            prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-3
            prose-h2:text-xl prose-h2:mt-7 prose-h2:mb-2 prose-h2:text-[#003c7e]
            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-1.5
            prose-p:text-[#343a40] prose-p:leading-relaxed
            prose-a:text-[#0757ff] prose-a:no-underline hover:prose-a:underline
            prose-code:rounded prose-code:bg-[#eef2f7] prose-code:px-1 prose-code:py-0.5 prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-[#0b1220] prose-pre:text-[#e5e7eb] prose-pre:text-[12px] prose-pre:rounded-lg
            prose-table:text-[13px] prose-th:bg-[#f7faff] prose-th:text-[#07142f]
            prose-li:my-0.5
            prose-blockquote:border-[#0757ff] prose-blockquote:text-[#526078]"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{SPEC}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
};

export default SmartLeadSpec;
