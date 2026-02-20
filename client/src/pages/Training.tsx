import { useEffect, Component, ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import TabbedPillar from "../components/TabbedPillar";
import CurriculumContent from "../components/tabs/CurriculumContent";
import StudentsContent from "../components/tabs/StudentsContent";
import MentorsContent from "../components/tabs/MentorsContent";
import FamiliesContent from "../components/tabs/FamiliesContent";
import QuizContent from "../components/tabs/QuizContent";
import { BookOpen, Users, UserCheck, Heart, Zap, AlertTriangle } from "lucide-react";

class TrainingErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Training page error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || "An unexpected error occurred loading this page."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      id: "quiz",
      label: "Quiz",
      icon: <Zap className="w-4 h-4" />,
      component: <QuizContent />,
      allowedRoles: ["admin"],
    },
  ];

  return (
    <TrainingErrorBoundary>
      <TabbedPillar
        title="Training"
        subtitle="Education delivery & mentor coordination"
        tabs={tabs}
        userRole={user.role}
        defaultTab="curriculum"
      />
    </TrainingErrorBoundary>
  );
}
