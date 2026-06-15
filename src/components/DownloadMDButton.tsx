import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadMDButtonProps {
  content: string;
  filename: string;
  label?: string;
}

export function DownloadMDButton({
  content,
  filename,
  label = "Download as Markdown",
}: DownloadMDButtonProps) {
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".md") ? filename : `${filename}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="gap-2 border-[#eef2f7] bg-white/80 text-[#07142f] hover:bg-white hover:text-[#174be8] shadow-sm"
    >
      <Download size={16} />
      {label}
    </Button>
  );
}
