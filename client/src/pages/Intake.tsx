import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import ApplicantsContent from "../components/tabs/ApplicantsContent";
import CohortsContent from "../components/tabs/CohortsContent";
import { Users, FolderOpen } from "lucide-react";

export default function Intake() {
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
      id: "applicants",
      label: "Applicants",
      icon: <Users className="w-4 h-4" />,
      component: <ApplicantsContent />,
      allowedRoles: ["admin", "board_member"],
    },
    {
      id: "cohorts",
      label: "Cohorts",
      icon: <FolderOpen className="w-4 h-4" />,
      component: <CohortsContent />,
      allowedRoles: ["admin"],
    },
  ];

  return (
    <TabbedPillar
      title="Intake"
      subtitle="Application processing & author identity management"
      tabs={tabs}
      userRole={user.role}
      defaultTab="applicants"
    />
  );
}
