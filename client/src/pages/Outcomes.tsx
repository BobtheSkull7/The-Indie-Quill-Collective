import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import LedgerContent from "../components/tabs/LedgerContent";
import GrantsContent from "../components/tabs/GrantsContent";
import GrantCohortsContent from "../components/tabs/GrantCohortsContent";
import DonationsContent from "../components/tabs/DonationsContent";
import AuditorContent from "../components/tabs/AuditorContent";
import { DollarSign, Building2, Rocket, Heart, BarChart3 } from "lucide-react";

export default function Outcomes() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "board_member" && user.role !== "auditor") {
      setLocation("/dashboard");
      return;
    }
  }, [user, setLocation]);

  if (!user || (user.role !== "admin" && user.role !== "board_member" && user.role !== "auditor")) {
    return null;
  }

  const tabs = [
    {
      id: "ledger",
      label: "Ledger",
      icon: <DollarSign className="w-4 h-4" />,
      component: <LedgerContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "grants",
      label: "Grants",
      icon: <Building2 className="w-4 h-4" />,
      component: <GrantsContent />,
      allowedRoles: ["admin", "board_member"],
    },
    {
      id: "grant-cohorts",
      label: "Grant Cohorts",
      icon: <Rocket className="w-4 h-4" />,
      component: <GrantCohortsContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "donations",
      label: "Donations",
      icon: <Heart className="w-4 h-4" />,
      component: <DonationsContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "auditor",
      label: "Auditor",
      icon: <BarChart3 className="w-4 h-4" />,
      component: <AuditorContent />,
      allowedRoles: ["admin", "board_member", "auditor"],
    },
  ];

  const defaultTab = user.role === "auditor" ? "auditor" : "ledger";

  return (
    <TabbedPillar
      title="Outcomes"
      subtitle="Impact metrics & financial oversight"
      tabs={tabs}
      userRole={user.role}
      defaultTab={defaultTab}
    />
  );
}
