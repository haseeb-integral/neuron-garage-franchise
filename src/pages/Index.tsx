import { Globe, Users, Filter, Rocket, Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";

const stats = [
  { title: "Total Cities Scored", value: 0, icon: Globe },
  { title: "Total Prospects Found", value: 0, icon: Users },
  { title: "Candidates in Pipeline", value: 0, icon: Filter },
  { title: "Active Onboardings", value: 0, icon: Rocket },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to the Neuron Garage Franchise Acquisition System — your AI-powered platform for finding and onboarding the right franchisees."
      />

      {/* Next Action card */}
      <div
        className="bg-white px-5 py-3.5 mb-6 flex flex-col md:flex-row md:items-center gap-4 shadow-sm"
        style={{
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          borderLeft: '3px solid #fd7e14',
        }}
      >
        <div className="p-2.5 rounded-lg shrink-0" style={{ backgroundColor: '#fff4ec' }}>
          <Zap size={20} style={{ color: '#fd7e14' }} />
        </div>
        <div className="min-w-0 md:basis-[65%] md:flex-grow-0 md:flex-shrink">
          <p className="text-base font-semibold" style={{ color: '#1a1a2e' }}>
            Welcome back, Sam. Here's your next step:
          </p>
          <p className="text-sm mt-0.5" style={{ color: '#6c757d' }}>
            You have 3 A‑tier cities ready for prospecting. Find teachers in Frisco, TX to keep the pipeline moving.
          </p>
        </div>
        <div className="md:flex-1" />
        <button
          onClick={() => navigate('/teacher-prospects?city=Frisco')}
          className="text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity w-full md:w-auto justify-center"
          style={{ backgroundColor: '#fd7e14', minHeight: 44 }}
        >
          Find Teachers in Frisco, TX <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white p-5 flex items-center gap-4 shadow-sm"
            style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}
          >
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fff4ec' }}>
              <stat.icon size={26} style={{ color: '#fd7e14' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#6c757d' }}>{stat.title}</p>
              <p className="text-3xl font-bold" style={{ color: '#1a1a2e' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        {/* Pipeline Snapshot */}
        <div className="bg-white p-6 shadow-sm" style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1a1a2e' }}>Pipeline Snapshot</h2>
            <p className="text-xs" style={{ color: '#6c757d' }}>Candidates by stage</p>
          </div>
          {(() => {
            const pipeline = [
              { stage: 'New Lead', count: 12 },
              { stage: 'Initial Qual', count: 9 },
              { stage: 'Business Overview', count: 7 },
              { stage: 'FDD Review', count: 5 },
              { stage: 'Immersion', count: 4 },
              { stage: 'Confirmation', count: 3 },
              { stage: 'Signing', count: 2 },
              { stage: 'Disqualified', count: 6 },
            ];
            const max = Math.max(...pipeline.map((p) => p.count));
            return (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: '#6c757d' }}>
                  <span>Stage</span>
                  <span>Candidates</span>
                </div>
                {pipeline.map((p) => (
                  <div key={p.stage} className="flex items-center gap-3">
                    <div className="w-32 text-xs shrink-0" style={{ color: '#343a40' }}>{p.stage}</div>
                    <div className="flex-1 h-6 rounded-sm overflow-hidden" style={{ backgroundColor: '#f3f4f6' }}>
                      <div
                        className="h-full rounded-sm transition-all"
                        style={{ width: `${(p.count / max) * 100}%`, backgroundColor: '#fd7e14' }}
                      />
                    </div>
                    <div className="w-6 text-right text-xs font-semibold" style={{ color: '#1a1a2e' }}>{p.count}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 shadow-sm flex flex-col" style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold" style={{ color: '#1a1a2e' }}>Recent Activity</h2>
            <p className="text-xs" style={{ color: '#6c757d' }}>Latest events across the system</p>
          </div>
          <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
            {[
              { text: 'Sarah Mitchell moved to FDD Review', time: '12 min ago' },
              { text: 'New prospect imported for Austin, TX', time: '1 hr ago' },
              { text: 'Marcus Johnson flagged as Overdue', time: '3 hr ago' },
              { text: 'Patricia Williams completed Business Immersion', time: 'Yesterday' },
              { text: 'City score recalculated for Plano, TX (Tier A)', time: 'Yesterday' },
              { text: '4 new teacher prospects added in Frisco, TX', time: '2 days ago' },
            ].map((evt, i, arr) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none' }}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: '#fd7e14' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: '#343a40' }}>{evt.text}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6c757d' }}>{evt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
