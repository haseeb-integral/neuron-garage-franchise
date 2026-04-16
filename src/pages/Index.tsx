import { Globe, Users, Filter, Rocket } from "lucide-react";

const stats = [
  { title: "Total Cities Scored", value: 0, icon: Globe },
  { title: "Total Prospects Found", value: 0, icon: Users },
  { title: "Candidates in Pipeline", value: 0, icon: Filter },
  { title: "Active Onboardings", value: 0, icon: Rocket },
];

const Dashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#343a40' }}>Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white p-5 flex items-center gap-4"
            style={{ borderRadius: 8, border: '1px solid #dee2e6' }}
          >
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(253,126,20,0.1)' }}>
              <stat.icon size={22} style={{ color: '#fd7e14' }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: '#6c757d' }}>{stat.title}</p>
              <p className="text-2xl font-bold" style={{ color: '#343a40' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6" style={{ borderRadius: 8, border: '1px solid #dee2e6' }}>
        <p style={{ color: '#343a40' }}>
          Welcome to the Neuron Garage Franchise Acquisition System — your AI-powered platform for finding and onboarding the right franchisees.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
