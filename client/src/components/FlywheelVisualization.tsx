import { useEffect, useState } from "react";
import { TrendingDown, Users, BookOpen, TrendingUp, Zap } from "lucide-react";

interface FlywheelMetrics {
  efficiencyRatio: number;
  quarterlyPublished: number;
  activeAuthors: number;
  totalDonations: number;
}

export default function FlywheelVisualization() {
  const [metrics, setMetrics] = useState<FlywheelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
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

  const quadrants = [
    {
      id: 'cost',
      label: 'Low Cost',
      sublabel: 'Structure',
      icon: TrendingDown,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      position: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
      metric: metrics?.efficiencyRatio ? `$${metrics.efficiencyRatio.toFixed(0)}/author` : '-',
    },
    {
      id: 'experience',
      label: 'Author',
      sublabel: 'Experience',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      position: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
      metric: `${metrics?.activeAuthors || 0} active`,
    },
    {
      id: 'selection',
      label: 'Selection',
      sublabel: '& Publishing',
      icon: BookOpen,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      position: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
      metric: `${metrics?.quarterlyPublished || 0} this quarter`,
    },
    {
      id: 'growth',
      label: 'Growth',
      sublabel: '& Donations',
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      position: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
      metric: `$${((metrics?.totalDonations || 0) / 100).toLocaleString()}`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg mx-auto py-8">
      <div className="text-center mb-20">
        <h3 className="font-display text-2xl font-bold text-slate-800 mb-2">
          The Collective Flywheel
        </h3>
        <p className="text-gray-600">
          How we create sustainable impact for emerging authors
        </p>
      </div>

      <div className="relative w-80 h-80 mx-auto mt-8">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 200"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <defs>
            <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="url(#arrowGradient)"
            strokeWidth="3"
            strokeDasharray="12 6"
            opacity="0.6"
          />
          <path
            d="M 100 15 L 108 25 L 92 25 Z"
            fill="url(#arrowGradient)"
            transform="rotate(45 100 100)"
          />
          <path
            d="M 100 15 L 108 25 L 92 25 Z"
            fill="url(#arrowGradient)"
            transform="rotate(135 100 100)"
          />
          <path
            d="M 100 15 L 108 25 L 92 25 Z"
            fill="url(#arrowGradient)"
            transform="rotate(225 100 100)"
          />
          <path
            d="M 100 15 L 108 25 L 92 25 Z"
            fill="url(#arrowGradient)"
            transform="rotate(315 100 100)"
          />
        </svg>

        <div className="absolute inset-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
          <div className="text-center text-white">
            <Zap className="w-8 h-8 mx-auto mb-1" />
            <p className="text-xs font-medium opacity-90">Sustainable</p>
            <p className="text-lg font-bold">Impact</p>
          </div>
        </div>

        {quadrants.map((quadrant) => (
          <div
            key={quadrant.id}
            className={`absolute ${quadrant.position} z-10`}
          >
            <div className={`${quadrant.bgColor} rounded-xl p-4 shadow-lg border border-white/50 backdrop-blur-sm min-w-[120px] text-center transform hover:scale-105 transition-transform`}>
              <div className={`w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br ${quadrant.color} flex items-center justify-center`}>
                <quadrant.icon className="w-5 h-5 text-white" />
              </div>
              <p className={`font-semibold ${quadrant.textColor} text-sm`}>
                {quadrant.label}
              </p>
              <p className="text-xs text-gray-500">{quadrant.sublabel}</p>
              <p className={`mt-1 text-xs font-medium ${quadrant.textColor}`}>
                {quadrant.metric}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center max-w-md mx-auto">
        <p className="text-sm text-gray-600 leading-relaxed">
          Lower costs enable better author experiences, which attracts more submissions, 
          leading to growth and donations that further reduce per-author costs. 
          <span className="font-semibold text-teal-600"> The flywheel accelerates with each cycle.</span>
        </p>
      </div>
    </div>
  );
}
