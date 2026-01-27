import { useState, ReactNode } from "react";

export interface TabConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  component: ReactNode;
  allowedRoles?: string[];
}

interface TabbedPillarProps {
  title: string;
  subtitle?: string;
  tabs: TabConfig[];
  userRole: string;
  defaultTab?: string;
}

export default function TabbedPillar({ 
  title, 
  subtitle, 
  tabs, 
  userRole, 
  defaultTab 
}: TabbedPillarProps) {
  const visibleTabs = tabs.filter(tab => 
    !tab.allowedRoles || tab.allowedRoles.includes(userRole)
  );

  const getInitialTab = (): string => {
    if (defaultTab && visibleTabs.some(tab => tab.id === defaultTab)) {
      return defaultTab;
    }
    return visibleTabs.length > 0 ? visibleTabs[0].id : "";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab());

  const activeTabConfig = visibleTabs.find(tab => tab.id === activeTab);

  if (visibleTabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">No accessible tabs for your role.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 font-display">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
          
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? "border-collective-teal text-collective-teal"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }
                  `}
                >
                  {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTabConfig?.component}
      </div>
    </div>
  );
}
