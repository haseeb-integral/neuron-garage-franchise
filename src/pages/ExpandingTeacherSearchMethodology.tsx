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
    a.download = "teacher-record-enrichment-methodology.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DocShell
      eyebrow="Methodology · Plain English"
      eyebrowIcon={GraduationCap}
      title={<>Teacher Record Enrichment — Methodology</>}
      subtitle="How the Manus enrichment system works, what Houston and Austin proved, the confidence rules, the per-city retooling checklist, and how every signal now appears on a teacher record in this app."
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
