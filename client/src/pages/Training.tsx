import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import CurriculumContent from "../components/tabs/CurriculumContent";
import StudentsContent from "../components/tabs/StudentsContent";
import MentorsContent from "../components/tabs/MentorsContent";
import FamiliesContent from "../components/tabs/FamiliesContent";
import { BookOpen, Users, UserCheck, Heart } from "lucide-react";

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
