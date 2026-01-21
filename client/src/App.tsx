import { Route, Switch } from "wouter";
import { useState, useEffect, createContext, useContext } from "react";
import Home from "./pages/Home";
import Apply from "./pages/Apply";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import Board from "./pages/Board";
import Contracts from "./pages/Contracts";
import ContractSign from "./pages/ContractSign";
import PublishingStatus from "./pages/PublishingStatus";
import Cohorts from "./pages/Cohorts";
import Grants from "./pages/Grants";
import Vault from "./pages/Vault";
import Ledger from "./pages/Ledger";
import Auditor from "./pages/Auditor";
import { Redirect } from "wouter";
import Donations from "./pages/Donations";
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-collective-teal"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about">{() => <Redirect to="/" />}</Route>
          <Route path="/donations" component={Donations} />
          <Route path="/apply" component={Apply} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/cohorts" component={Cohorts} />
          <Route path="/admin/grants" component={Grants} />
          <Route path="/admin/vault" component={Vault} />
          <Route path="/admin/ledger" component={Ledger} />
          <Route path="/auditor" component={Auditor} />
          <Route path="/board" component={Board} />
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
