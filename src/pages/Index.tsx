import { Globe, Users, Filter, Rocket } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const stats = [
  { title: "Total Cities Scored", value: 0, icon: Globe },
  { title: "Total Prospects Found", value: 0, icon: Users },
  { title: "Candidates in Pipeline", value: 0, icon: Filter },
  { title: "Active Onboardings", value: 0, icon: Rocket },
];

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: '#343a40' }}>Dashboard</h1>
      <Separator className="mb-6" style={{ backgroundColor: '#e9ecef' }} />

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

      <div className="bg-white p-6 shadow-sm" style={{ borderRadius: 8, border: '1px solid #f0f0f0' }}>
        <p style={{ color: '#343a40' }}>
          Welcome to the Neuron Garage Franchise Acquisition System — your AI-powered platform for finding and onboarding the right franchisees.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
