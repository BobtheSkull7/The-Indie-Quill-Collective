import { useEffect, useState } from "react";

interface FlywheelMetrics {
  efficiencyRatio: number;
  quarterlyPublished: number;
  activeAuthors: number;
  totalDonations: number;
}

export default function FlywheelVisualization() {
  const [metrics, setMetrics] = useState<FlywheelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/public/flywheel');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch flywheel metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto py-8">
      <div className="text-center mb-16">
        <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">
          The Collective Flywheel
        </h3>
        <p className="text-gray-600">
          How we create sustainable impact for emerging authors
        </p>
      </div>

      <div className="relative w-full" style={{ paddingBottom: '85%' }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 500 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="250"
            cy="230"
            r="120"
            stroke="#1f2937"
            strokeWidth="2"
            fill="none"
          />
          
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#1f2937" />
            </marker>
            <marker
              id="arrowhead-dashed"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#14b8a6" />
            </marker>
          </defs>

          <path
            d="M 250 110 Q 370 110 370 230"
            stroke="#1f2937"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <path
            d="M 370 230 Q 370 350 250 350"
            stroke="#1f2937"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <path
            d="M 250 350 Q 130 350 130 230"
            stroke="#1f2937"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />
          <path
            d="M 130 230 Q 130 110 250 110"
            stroke="#1f2937"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead)"
          />

          <path
            d="M 100 45 L 400 45"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeDasharray="8 4"
            fill="none"
            markerEnd="url(#arrowhead-dashed)"
          />
          
          <path
            d="M 60 75 L 60 180"
            stroke="#14b8a6"
            strokeWidth="2"
            strokeDasharray="8 4"
            fill="none"
            markerEnd="url(#arrowhead-dashed)"
          />

          <circle
            cx="250"
            cy="230"
            r="55"
            fill="#e0f2fe"
            stroke="#0ea5e9"
            strokeWidth="2"
          />
          <text x="250" y="225" textAnchor="middle" className="text-xs" fill="#0369a1" fontWeight="600">
            SUSTAINABLE
          </text>
          <text x="250" y="242" textAnchor="middle" className="text-sm" fill="#0369a1" fontWeight="700">
            IMPACT
          </text>

          <rect x="40" y="10" width="120" height="50" rx="4" fill="#ccfbf1" stroke="#14b8a6" strokeWidth="2" />
          <text x="100" y="32" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="600">OPERATIONAL</text>
          <text x="100" y="48" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="600">EFFICIENCY</text>

          <rect x="340" y="10" width="120" height="50" rx="4" fill="#ccfbf1" stroke="#14b8a6" strokeWidth="2" />
          <text x="400" y="32" textAnchor="middle" fill="#0f766e" fontSize="8" fontWeight="600">ENHANCED PROGRAM</text>
          <text x="400" y="48" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="600">SERVICES</text>

          <rect x="190" y="85" width="120" height="50" rx="4" fill="#fda4af" stroke="#e11d48" strokeWidth="2" />
          <text x="250" y="107" textAnchor="middle" fill="#9f1239" fontSize="11" fontWeight="600">SELECTION</text>
          <text x="250" y="123" textAnchor="middle" fill="#9f1239" fontSize="10">{metrics?.quarterlyPublished || 0} published</text>

          <rect x="360" y="205" width="120" height="50" rx="4" fill="#fda4af" stroke="#e11d48" strokeWidth="2" />
          <text x="420" y="222" textAnchor="middle" fill="#9f1239" fontSize="10" fontWeight="600">AUTHOR</text>
          <text x="420" y="237" textAnchor="middle" fill="#9f1239" fontSize="10" fontWeight="600">EXPERIENCE</text>
          <text x="420" y="252" textAnchor="middle" fill="#9f1239" fontSize="9">{metrics?.activeAuthors || 0} active</text>

          <rect x="190" y="355" width="120" height="50" rx="4" fill="#fda4af" stroke="#e11d48" strokeWidth="2" />
          <text x="250" y="377" textAnchor="middle" fill="#9f1239" fontSize="11" fontWeight="600">VISIBILITY</text>
          <text x="250" y="393" textAnchor="middle" fill="#9f1239" fontSize="10">& Reach</text>

          <rect x="20" y="205" width="100" height="50" rx="4" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
          <text x="70" y="222" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">GROWTH</text>
          <text x="70" y="237" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="600">& DONATIONS</text>
          <text x="70" y="252" textAnchor="middle" fill="#92400e" fontSize="9">${((metrics?.totalDonations || 0) / 100).toLocaleString()}</text>

          <text x="250" y="75" textAnchor="middle" fill="#14b8a6" fontSize="9" fontStyle="italic">
            ${metrics?.efficiencyRatio ? `$${metrics.efficiencyRatio.toFixed(0)}/author` : '-'}
          </text>
        </svg>
      </div>

      <div className="mt-8 text-center max-w-md mx-auto">
        <p className="text-sm text-gray-600 leading-relaxed">
          Operational efficiency enables enhanced program services, which attracts more submissions, 
          leading to growth and donations that further improve efficiency. 
          <span className="font-semibold text-teal-600"> The flywheel accelerates with each cycle.</span>
        </p>
      </div>
    </div>
  );
}
