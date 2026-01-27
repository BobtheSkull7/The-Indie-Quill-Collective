import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import PipelineContent from "../components/tabs/PipelineContent";
import ContractsContent from "../components/tabs/ContractsContent";
import ManuscriptsContent from "../components/tabs/ManuscriptsContent";
import { BookOpen, FileText, Edit3 } from "lucide-react";

export default function Publishing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.role !== "admin" && user.role !== "board_member") {
      setLocation("/dashboard");
      return;
    }
  }, [user, setLocation]);

  if (!user || (user.role !== "admin" && user.role !== "board_member")) {
    return null;
  }

  const tabs = [
    {
      id: "pipeline",
      label: "Pipeline",
      icon: <BookOpen className="w-4 h-4" />,
      component: <PipelineContent />,
      allowedRoles: ["admin", "board_member"],
    },
    {
      id: "contracts",
      label: "Contracts",
      icon: <FileText className="w-4 h-4" />,
      component: <ContractsContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "manuscripts",
      label: "Manuscripts",
      icon: <Edit3 className="w-4 h-4" />,
      component: <ManuscriptsContent />,
      allowedRoles: ["admin"],
    },
  ];

  return (
    <TabbedPillar
      title="Publishing"
      subtitle="Manuscript & contract lifecycle"
      tabs={tabs}
      userRole={user.role}
      defaultTab="pipeline"
    />
  );
}
