import { Button } from "@/components/ui/button";
import { Download, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DocShell, DocCard, docProseClass } from "@/components/DocShell";
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
    <DocShell
      eyebrow="Integration reference"
      eyebrowIcon={Send}
      title={<>SmartLead API Spec</>}
      subtitle="Engineering reference for the SmartLead integration — proxy, webhooks, schema, realtime."
      action={
        <Button
          onClick={handleDownload}
          className="gap-2 rounded-full px-5 py-5 text-[13px] font-bold"
          style={{ background: "linear-gradient(135deg, #003c7e 0%, #0757ff 100%)", color: "white", boxShadow: "0 12px 28px rgba(7,87,255,0.25)" }}
        >
          <Download size={15} />
          Download .md
        </Button>
      }
    >
      <DocCard>
        <article className={docProseClass}>
          <ReactMarkdown>{SPEC}</ReactMarkdown>
        </article>
      </DocCard>
    </DocShell>
  );
};

export default SmartLeadSpec;
