import { Button } from "@/components/ui/button";
import { Download, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DocShell, DocCard, docProseClass } from "@/components/DocShell";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — raw markdown import
import DOCS from "@/data/observabilityGuide.md?raw";

const ObservabilityGuide = () => {
  const handleDownload = () => {
    const blob = new Blob([DOCS], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data-observability-guide.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DocShell
      eyebrow="Operator guide"
      eyebrowIcon={Activity}
      title={<>Data Observability Guide</>}
      subtitle="Plain-English walkthrough of how the Data Observability tool watches our data, scores trust, and sends the weekly health email."
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
          <ReactMarkdown>{DOCS}</ReactMarkdown>
        </article>
      </DocCard>
    </DocShell>
  );
};

export default ObservabilityGuide;
