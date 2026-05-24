import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Page not found · Neuron Garage";
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#eef2f7] bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4ff]">
          <span className="text-[22px] font-black text-[#0757ff]">404</span>
        </div>
        <h1 className="text-[18px] font-black text-[#0b1a36]">We couldn&rsquo;t find that page</h1>
        <p className="mt-2 text-[13px] text-[#526078]">
          The page <code className="rounded bg-[#f7faff] px-1.5 py-0.5 text-[12px] text-[#0b1a36]">{location.pathname}</code>{" "}
          doesn&rsquo;t exist or has moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#eef2f7] bg-white px-3 py-2 text-[12px] font-bold text-[#0b1a36] hover:bg-[#f7faff]"
          >
            <ArrowLeft size={14} /> Go back
          </button>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0757ff] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#003c7e]"
          >
            <Home size={14} /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
