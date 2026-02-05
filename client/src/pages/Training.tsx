import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import CurriculumContent from "../components/tabs/CurriculumContent";
import StudentsContent from "../components/tabs/StudentsContent";
import MentorsContent from "../components/tabs/MentorsContent";
import FamiliesContent from "../components/tabs/FamiliesContent";
import WikiContent from "../components/tabs/WikiContent";
import GrantCohortsContent from "../components/tabs/GrantCohortsContent";
import { BookOpen, Users, UserCheck, Heart, FileText, Rocket, Gamepad2 } from "lucide-react";
import { Link } from "wouter";

export default function Training() {
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
      id: "curriculum",
      label: "Curriculum",
      icon: <BookOpen className="w-4 h-4" />,
      component: <CurriculumContent />,
      allowedRoles: ["admin", "board_member"],
    },
    {
      id: "students",
      label: "Students",
      icon: <Users className="w-4 h-4" />,
      component: <StudentsContent />,
      allowedRoles: ["admin", "board_member"],
    },
    {
      id: "mentors",
      label: "Mentors",
      icon: <UserCheck className="w-4 h-4" />,
      component: <MentorsContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "families",
      label: "Families",
      icon: <Heart className="w-4 h-4" />,
      component: <FamiliesContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "wiki",
      label: "BoD Wiki",
      icon: <FileText className="w-4 h-4" />,
      component: <WikiContent />,
      allowedRoles: ["admin", "board_member"],
    },
    {
      id: "cohorts",
      label: "Grant Cohorts",
      icon: <Rocket className="w-4 h-4" />,
      component: <GrantCohortsContent />,
      allowedRoles: ["admin"],
    },
    {
      id: "game",
      label: "Game Test",
      icon: <Gamepad2 className="w-4 h-4" />,
      component: (
        <div className="p-6 text-center">
          <Gamepad2 className="w-16 h-16 mx-auto text-purple-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Game Engine Testing</h3>
          <p className="text-gray-600 mb-6">Preview character data from the RPG system</p>
          <Link
            href="/admin/game-test"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            <Gamepad2 className="w-5 h-5" />
            Open Game Test Dashboard
          </Link>
        </div>
      ),
      allowedRoles: ["admin"],
    },
  ];

  return (
    <TabbedPillar
      title="Training"
      subtitle="Education delivery & mentor coordination"
      tabs={tabs}
      userRole={user.role}
      defaultTab="curriculum"
    />
  );
}
