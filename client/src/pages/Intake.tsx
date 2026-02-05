import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import ApplicantsContent from "../components/tabs/ApplicantsContent";
import CohortsContent from "../components/tabs/CohortsContent";
import VaultContent from "../components/tabs/VaultContent";
import CharacterCard from "../components/CharacterCard";
import { Users, FolderOpen, Shield, Gamepad2 } from "lucide-react";

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
    {
      id: "vault",
      label: "Vault",
      icon: <Shield className="w-4 h-4" />,
      component: <VaultContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "game",
      label: "Game Engine",
      icon: <Gamepad2 className="w-4 h-4" />,
      component: (
        <div className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Game Engine Integration Test</h3>
            <p className="text-sm text-gray-500">Live character data from the external Game Engine API</p>
          </div>
          <CharacterCard apiEndpoint="/api/admin/game-character" />
        </div>
      ),
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
