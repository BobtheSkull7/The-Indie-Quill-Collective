import { Route, Switch, Redirect, useLocation } from "wouter";
import { useState, useEffect, createContext, useContext } from "react";
import Home from "./pages/Home";
import Apply from "./pages/Apply";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import Contracts from "./pages/Contracts";
import ContractSign from "./pages/ContractSign";
import PublishingStatus from "./pages/PublishingStatus";
import StudentDashboard from "./pages/StudentDashboard";
import CurriculumPlayer from "./pages/CurriculumPlayer";
import DraftingSuite from "./pages/DraftingSuite";
import MentorDashboard from "./pages/MentorDashboard";
import FamilyDashboard from "./pages/FamilyDashboard";
import Donations from "./pages/Donations";
import DonationSuccess from "./pages/DonationSuccess";
import AboutUs from "./pages/AboutUs";
import Intake from "./pages/Intake";
import Training from "./pages/Training";
import Publishing from "./pages/Publishing";
import Outcomes from "./pages/Outcomes";
import VibeScribe from "./pages/VibeScribe";
import GameTest from "./pages/GameTest";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Initiation from "./pages/Initiation";
import Navbar from "./components/Navbar";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [location] = useLocation();
  const isVibeRoute = location.startsWith("/vibe");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <div className={`min-h-screen ${isVibeRoute ? '' : 'bg-gray-50'}`}>
        {!isVibeRoute && <Navbar />}
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={AboutUs} />
          <Route path="/donations" component={Donations} />
          <Route path="/donations/success" component={DonationSuccess} />
          <Route path="/apply" component={Apply} />
          <Route path="/initiation" component={Initiation} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/dashboard" component={Dashboard} />
          
          <Route path="/student" component={StudentDashboard} />
          <Route path="/student/module/:id" component={CurriculumPlayer} />
          <Route path="/student/drafts" component={DraftingSuite} />
          <Route path="/mentor" component={MentorDashboard} />
          <Route path="/family" component={FamilyDashboard} />
          <Route path="/vibe" component={VibeScribe} />
          
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/intake" component={Intake} />
          <Route path="/admin/training" component={Training} />
          <Route path="/admin/publishing" component={Publishing} />
          <Route path="/admin/outcomes" component={Outcomes} />
          <Route path="/admin/game-test" component={GameTest} />
          
          <Route path="/admin/cohorts">
            <Redirect to="/admin/intake" />
          </Route>
          <Route path="/admin/vault">
            <Redirect to="/admin/intake" />
          </Route>
          <Route path="/admin/grants">
            <Redirect to="/admin/outcomes" />
          </Route>
          <Route path="/admin/ledger">
            <Redirect to="/admin/outcomes" />
          </Route>
          
          <Route path="/auditor">
            <Redirect to="/admin/outcomes" />
          </Route>
          
          <Route path="/contracts" component={Contracts} />
          <Route path="/contracts/:id" component={ContractSign} />
          <Route path="/publishing-status" component={PublishingStatus} />
          
          <Route>
            <div className="min-h-screen flex items-center justify-center">
              <h1 className="text-2xl font-display text-gray-600">Page Not Found</h1>
            </div>
          </Route>
        </Switch>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
