import { Calendar, Megaphone, Sparkles } from "lucide-react";

const events = [
  { name: "Texas Educator Summit 2025", date: "Jun 18-20 · Austin, TX", desc: "Annual K-12 conference with 4,000+ educators." },
  { name: "Florida STEM Teachers Expo", date: "Jul 9 · Orlando, FL", desc: "Workshop-driven event focused on STEM curriculum innovators." },
  { name: "National AfterSchool Association Conference", date: "Aug 14-16 · Dallas, TX", desc: "Network of after-school program leaders and entrepreneurs." },
];

const channels = [
  { name: "Facebook Teacher Groups", desc: "Local 'Frisco ISD Teachers' and 'Plano Educators' groups have 5K+ active members." },
  { name: "LinkedIn Sponsored InMail", desc: "Target K-8 educators by location, school district, and 5+ years experience." },
  { name: "TeachersPayTeachers Ads", desc: "High-intent audience of entrepreneurial educators creating side income." },
  { name: "District Newsletter Sponsorship", desc: "Direct partnership with PISD/FISD communications offices." },
];

export function OutreachIntelligence() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      <div className="bg-white rounded-lg p-5" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} style={{ color: "#fd7e14" }} />
          <span className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#fd7e14" }}>AI Generated</span>
        </div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: "#003c7e" }}>
          <Calendar size={16} /> Local Teacher Events & Conferences
        </h3>
        <ul className="space-y-3">
          {events.map(e => (
            <li key={e.name} className="border-l-2 pl-3" style={{ borderColor: "#fd7e14" }}>
              <div className="font-medium text-sm" style={{ color: "#343a40" }}>{e.name}</div>
              <div className="text-xs" style={{ color: "#6c757d" }}>{e.date}</div>
              <div className="text-xs mt-1" style={{ color: "#6c757d" }}>{e.desc}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-lg p-5" style={{ border: "1px solid #dee2e6" }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} style={{ color: "#fd7e14" }} />
          <span className="text-xs uppercase font-semibold tracking-wide" style={{ color: "#fd7e14" }}>AI Generated</span>
        </div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: "#003c7e" }}>
          <Megaphone size={16} /> Suggested Marketing Channels
        </h3>
        <ul className="space-y-3">
          {channels.map(c => (
            <li key={c.name}>
              <div className="font-medium text-sm" style={{ color: "#343a40" }}>{c.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "#6c757d" }}>{c.desc}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
