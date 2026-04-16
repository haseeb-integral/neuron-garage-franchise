interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#343a40' }}>{title}</h1>
      <div className="bg-white p-6" style={{ borderRadius: 8, border: '1px solid #dee2e6' }}>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold" style={{ color: '#343a40' }}>{title}</h2>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(253,126,20,0.12)', color: '#fd7e14' }}
          >
            Coming Soon
          </span>
        </div>
        <p style={{ color: '#6c757d' }}>{description}</p>
      </div>
    </div>
  );
}
