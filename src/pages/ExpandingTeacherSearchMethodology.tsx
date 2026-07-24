import { Button } from "@/components/ui/button";
import { Download, GraduationCap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DocShell, DocCard, docProseClass } from "@/components/DocShell";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — raw markdown import
import METHOD from "@/data/expandingTeacherSearchMethodology.md?raw";

const ExpandingTeacherSearchMethodology = () => {
  const handleDownload = () => {
    const blob = new Blob([METHOD], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expanding-teacher-search-methodology.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DocShell
      eyebrow="Methodology · Plain English"
      eyebrowIcon={GraduationCap}
      title={<>Expanding Teacher Search and Enrichment — Methodology</>}
      subtitle="How the Manus enrichment experiment works, what has been proven in Houston, and what the future Lovable upgrade will look like. Reference doc — nothing new is being built in Lovable yet."
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{METHOD}</ReactMarkdown>
        </article>
      </DocCard>
    </DocShell>
  );
};

export default ExpandingTeacherSearchMethodology;
