import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../App";
import {
  Scroll,
  BookOpen,
  PenTool,
  Shield,
  User,
  Users,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  FileText,
} from "lucide-react";

const stepLabels = ["Account", "Identity", "Covenant", "Pledge"];

const expressionOptions = [
  { id: "novel", label: "Novel" },
  { id: "short_story", label: "Short Story" },
  { id: "poems", label: "Poems" },
  { id: "graphic_novel", label: "Graphic Novel" },
  { id: "other", label: "Other" },
];

export default function Initiation() {
  const [, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(user ? 2 : 1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contractText, setContractText] = useState("");
  const [contractLoading, setContractLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [accountData, setAccountData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [appData, setAppData] = useState({
    pseudonym: "",
    personaType: "" as "" | "writer" | "adult_student" | "family_student",
    identityMode: "safe" as "safe" | "public",
    dateOfBirth: "",
    isMinor: false,
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: "",
    expressionTypes: [] as string[],
    expressionOther: "",
    whyCollective: "",
    goals: "",
    hearAboutUs: "",
  });

  const [signature, setSignature] = useState("");
  const [guardianSignature, setGuardianSignature] = useState("");

  useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateChange = (dob: string) => {
    const isMinor = calculateAge(dob) < 18;
    setAppData({ ...appData, dateOfBirth: dob, isMinor });
  };

  const handleExpressionToggle = (typeId: string) => {
    setAppData((prev) => ({
      ...prev,
      expressionTypes: prev.expressionTypes.includes(typeId)
        ? prev.expressionTypes.filter((t) => t !== typeId)
        : [...prev.expressionTypes, typeId],
    }));
  };

  const getFullName = () => {
    if (user) return `${user.firstName} ${user.lastName}`;
    return `${accountData.firstName} ${accountData.lastName}`;
  };

  const validateStep1 = () => {
    if (user) return true;
    if (!accountData.firstName.trim() || !accountData.lastName.trim() || !accountData.email.trim() || !accountData.password) {
      setError("All fields are required");
      return false;
    }
    if (accountData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (accountData.password !== accountData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!appData.personaType) {
      setError("Please select how you are joining us");
      return false;
    }
    if (!appData.pseudonym.trim()) {
      setError("Please enter your pseudonym");
      return false;
    }
    if (!appData.dateOfBirth) {
      setError("Please enter your date of birth");
      return false;
    }
    if (appData.isMinor) {
      if (!appData.guardianName.trim()) {
        setError("Guardian name is required for minors");
        return false;
      }
      if (!appData.guardianEmail.trim()) {
        setError("Guardian email is required for minors");
        return false;
      }
      if (!appData.guardianPhone.trim()) {
        setError("Guardian phone is required for minors");
        return false;
      }
      if (!appData.guardianRelationship) {
        setError("Guardian relationship is required for minors");
        return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    const fullName = getFullName();
    if (signature.trim().toLowerCase().replace(/\s+/g, " ") !== fullName.trim().toLowerCase().replace(/\s+/g, " ")) {
      setError(`Signature must match your legal name: "${fullName}"`);
      return false;
    }
    if (appData.isMinor && guardianSignature.trim().toLowerCase().replace(/\s+/g, " ") !== appData.guardianName.trim().toLowerCase().replace(/\s+/g, " ")) {
      setError(`Guardian signature must match: "${appData.guardianName}"`);
      return false;
    }
    return true;
  };

  const handleStep1Submit = async () => {
    if (user) {
      setError("");
      setStep(2);
      return;
    }
    if (!validateStep1()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          email: accountData.email,
          password: accountData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");

      setUser(data.user);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Continue = () => {
    setError("");
    if (!validateStep2()) return;
    fetchContractPreview();
    setStep(3);
  };

  const fetchContractPreview = async () => {
    setContractLoading(true);
    try {
      const res = await fetch("/api/initiation/contract-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudonym: appData.pseudonym,
          isMinor: appData.isMinor,
          identityMode: appData.identityMode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setContractText(data.contractText);
      }
    } catch {
      // fallback handled by loading state
    } finally {
      setContractLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!validateStep3()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/initiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...appData,
          expressionTypes: appData.expressionTypes.join(","),
          publicIdentityEnabled: appData.identityMode === "public",
          signature,
          guardianSignature: appData.isMinor ? guardianSignature : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setUser(meData.user);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-lg w-full">
          <div className="card text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold text-slate-800 mb-4">
              Welcome to The Collective
            </h2>
            <p className="text-gray-600 mb-2">
              Your initiation is complete. The covenant has been sealed.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Your application and signed contract have been submitted. Our team will review everything and guide you through the next steps of your publishing journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setLocation("/dashboard")} className="btn-primary">
                Enter Your Dashboard
              </button>
              <Link href="/" className="btn-secondary text-center">
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Scroll className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800">
            Ritual of Initiation
          </h1>
          <p className="text-gray-600 mt-2">
            Begin your journey with The Indie Quill Collective
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const isActive = step === s;
              const isComplete = step > s;
              return (
                <div key={s} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-all ${
                        isComplete
                          ? "bg-teal-500 text-white"
                          : isActive
                          ? "bg-teal-400 text-white ring-4 ring-teal-100"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : s}
                    </div>
                    <span
                      className={`text-xs mt-1 font-medium ${
                        isActive || isComplete ? "text-teal-600" : "text-gray-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-10 h-1 mx-1 rounded ${
                        step > s ? "bg-teal-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center space-x-3 mb-2">
                <User className="w-6 h-6 text-teal-500" />
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  Create Your Account
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                Your account is the foundation of your identity within The Collective.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      required
                      className="input-field pl-10"
                      placeholder="Jane"
                      value={accountData.firstName}
                      onChange={(e) =>
                        setAccountData({ ...accountData, firstName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Doe"
                    value={accountData.lastName}
                    onChange={(e) =>
                      setAccountData({ ...accountData, lastName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    className="input-field pl-10"
                    placeholder="you@example.com"
                    value={accountData.email}
                    onChange={(e) =>
                      setAccountData({ ...accountData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="input-field pl-10 pr-10"
                    placeholder="At least 6 characters"
                    value={accountData.password}
                    onChange={(e) =>
                      setAccountData({ ...accountData, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="input-field pl-10 pr-10"
                    placeholder="Confirm your password"
                    value={accountData.confirmPassword}
                    onChange={(e) =>
                      setAccountData({ ...accountData, confirmPassword: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Link href="/" className="btn-secondary">
                  Back to Home
                </Link>
                <button
                  type="button"
                  onClick={handleStep1Submit}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? "Creating Account..." : "Continue"}
                </button>
              </div>

              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-teal-600 font-medium hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <BookOpen className="w-6 h-6 text-teal-500" />
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  The Scroll of Identity
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                Tell us who you are and how you wish to be known within The Collective.
              </p>

              <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                <label className="label text-slate-800 font-medium">
                  How are you joining us? *
                </label>
                <p className="text-sm text-gray-600 mb-4">
                  This determines your learning path and curriculum.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      appData.personaType === "writer"
                        ? "border-teal-500 bg-white shadow-md"
                        : "border-gray-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="personaType"
                      value="writer"
                      checked={appData.personaType === "writer"}
                      onChange={(e) =>
                        setAppData({ ...appData, personaType: e.target.value as any })
                      }
                      className="sr-only"
                    />
                    <BookOpen className="w-8 h-8 text-teal-500 mb-2" />
                    <span className="font-semibold text-slate-800">Writer</span>
                    <span className="text-xs text-gray-500 text-center mt-1">
                      I'm here to publish my book
                    </span>
                  </label>

                  <label
                    className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      appData.personaType === "adult_student"
                        ? "border-teal-500 bg-white shadow-md"
                        : "border-gray-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="personaType"
                      value="adult_student"
                      checked={appData.personaType === "adult_student"}
                      onChange={(e) =>
                        setAppData({ ...appData, personaType: e.target.value as any })
                      }
                      className="sr-only"
                    />
                    <User className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="font-semibold text-slate-800">Adult Student</span>
                    <span className="text-xs text-gray-500 text-center mt-1">
                      I want literacy training + publishing
                    </span>
                  </label>

                  <label
                    className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      appData.personaType === "family_student"
                        ? "border-teal-500 bg-white shadow-md"
                        : "border-gray-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="personaType"
                      value="family_student"
                      checked={appData.personaType === "family_student"}
                      onChange={(e) =>
                        setAppData({ ...appData, personaType: e.target.value as any })
                      }
                      className="sr-only"
                    />
                    <Users className="w-8 h-8 text-purple-500 mb-2" />
                    <span className="font-semibold text-slate-800">Family Student</span>
                    <span className="text-xs text-gray-500 text-center mt-1">
                      My family is learning together
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Pseudonym (Creative Identity) *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your pseudonym for the bookstore"
                  value={appData.pseudonym}
                  onChange={(e) => setAppData({ ...appData, pseudonym: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is how your name will appear on published works. Your legal name
                  remains private.
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <h3 className="font-medium text-slate-800 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Identity Visibility & Safety (COPPA Compliance)
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  We follow COPPA to ensure that all minors are protected at all times.
                  Choose how your identity will appear publicly:
                </p>

                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-amber-100">
                    <input
                      type="radio"
                      name="identityMode"
                      checked={appData.identityMode === "safe"}
                      onChange={() => setAppData({ ...appData, identityMode: "safe" })}
                      className="w-4 h-4 mt-1 text-teal-500"
                    />
                    <div>
                      <span className="font-medium text-slate-800">
                        Safe Mode (Default)
                      </span>
                      <p className="text-xs text-gray-600">
                        Your identity will be masked using a truncated name and emoji
                        avatar in all public materials. Only your pseudonym will be shared
                        with the Bookstore.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-amber-100">
                    <input
                      type="radio"
                      name="identityMode"
                      checked={appData.identityMode === "public"}
                      onChange={() => setAppData({ ...appData, identityMode: "public" })}
                      className="w-4 h-4 mt-1 text-teal-500"
                    />
                    <div>
                      <span className="font-medium text-slate-800">Public Mode</span>
                      <p className="text-xs text-gray-600">
                        I grant permission to use my full legal name and photograph for
                        marketing and promotional purposes.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Date of Birth *</label>
                <input
                  type="date"
                  className="input-field"
                  value={appData.dateOfBirth}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              {appData.isMinor && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-blue-700 text-sm mb-4">
                    Since you're under 18, we'll need your parent or guardian's
                    information for contract approval.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <Users className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium text-slate-800">
                        Guardian Information
                      </h3>
                    </div>

                    <div>
                      <label className="label">Guardian Full Name *</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Parent or guardian's name"
                        value={appData.guardianName}
                        onChange={(e) =>
                          setAppData({ ...appData, guardianName: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">Guardian Email *</label>
                      <input
                        type="email"
                        className="input-field"
                        placeholder="guardian@email.com"
                        value={appData.guardianEmail}
                        onChange={(e) =>
                          setAppData({ ...appData, guardianEmail: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">Guardian Phone *</label>
                      <input
                        type="tel"
                        className="input-field"
                        placeholder="(555) 123-4567"
                        value={appData.guardianPhone}
                        onChange={(e) =>
                          setAppData({ ...appData, guardianPhone: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="label">Relationship *</label>
                      <select
                        className="input-field"
                        value={appData.guardianRelationship}
                        onChange={(e) =>
                          setAppData({
                            ...appData,
                            guardianRelationship: e.target.value,
                          })
                        }
                      >
                        <option value="">Select relationship</option>
                        <option value="parent">Parent</option>
                        <option value="legal_guardian">Legal Guardian</option>
                        <option value="grandparent">Grandparent</option>
                        <option value="other">Other Legal Guardian</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="label">
                  How do you think you want to express it? (check all that apply)
                </label>
                <div className="mt-3 space-y-3">
                  {expressionOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center space-x-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={appData.expressionTypes.includes(option.id)}
                        onChange={() => handleExpressionToggle(option.id)}
                        className="w-5 h-5 text-teal-500 rounded border-gray-300 focus:ring-teal-400"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {appData.expressionTypes.includes("other") && (
                <div>
                  <label className="label">
                    Please explain your "Other" expression type
                  </label>
                  <textarea
                    rows={2}
                    className="input-field"
                    placeholder="Describe how you'd like to express your story..."
                    value={appData.expressionOther}
                    onChange={(e) =>
                      setAppData({ ...appData, expressionOther: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <label className="label">
                  Why do you want to join The Indie Quill Collective? *
                </label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="Tell us why our non-profit mission resonates with you"
                  value={appData.whyCollective}
                  onChange={(e) =>
                    setAppData({ ...appData, whyCollective: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="label">What are your publishing goals?</label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="What do you hope to achieve with your book?"
                  value={appData.goals}
                  onChange={(e) => setAppData({ ...appData, goals: e.target.value })}
                />
              </div>

              <div>
                <label className="label">How did you hear about us?</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Social media, friend, search, etc."
                  value={appData.hearAboutUs}
                  onChange={(e) =>
                    setAppData({ ...appData, hearAboutUs: e.target.value })
                  }
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    if (user) {
                      setLocation("/");
                    } else {
                      setStep(1);
                    }
                  }}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Continue}
                  className="btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="w-6 h-6 text-teal-500" />
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  The Covenant
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                Review the publishing agreement below. This covenant binds The Collective
                to mentor you through your publishing journey.
              </p>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                {contractLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                    <span className="ml-3 text-gray-500">Loading contract...</span>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-body text-sm text-gray-700 leading-relaxed">
                    {contractText || "Loading contract text..."}
                  </pre>
                )}
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="font-medium text-slate-800 mb-3">Defined Parties</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm text-gray-600">
                      Author (Legal Identity):
                    </span>
                    <span className="font-medium text-slate-800">{getFullName()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm text-gray-600">
                      Pseudonym (Creative Identity):
                    </span>
                    <span className="font-medium text-teal-600">
                      {appData.pseudonym}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm text-gray-600">Identity Mode:</span>
                    <span
                      className={`font-medium ${
                        appData.identityMode === "public"
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    >
                      {appData.identityMode === "public"
                        ? "Public Mode"
                        : "Safe Mode (Protected)"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-medium text-slate-800 mb-2">
                  <PenTool className="w-4 h-4 inline mr-1" />
                  Signature Validation
                </h3>
                <p className="text-sm text-gray-600">
                  Please type your full legal name exactly as: "
                  <strong>{getFullName()}</strong>"
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  This ensures the forensic integrity of the signature record.
                </p>
              </div>

              <div>
                <label className="label">Type Your Full Legal Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your full legal name as signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  By typing your name, you agree to the terms of this contract.
                </p>
              </div>

              {appData.isMinor && (
                <div>
                  <label className="label">Guardian Signature</label>
                  <p className="text-sm text-gray-600 mb-2">
                    Please type the guardian's full legal name exactly as: "
                    <strong>{appData.guardianName}</strong>"
                  </p>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter guardian's full legal name"
                    value={guardianSignature}
                    onChange={(e) => setGuardianSignature(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(2);
                  }}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    if (!validateStep3()) return;
                    setStep(4);
                  }}
                  className="btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <Scroll className="w-6 h-6 text-teal-500" />
                <h2 className="font-display text-xl font-semibold text-slate-800">
                  Submit Your Pledge
                </h2>
              </div>
              <p className="text-gray-500 text-sm">
                Review your information one final time before sealing your covenant with
                The Collective.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2 text-teal-500" />
                    Your Identity
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Legal Name:</span>
                      <p className="font-medium text-slate-800">{getFullName()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Pseudonym:</span>
                      <p className="font-medium text-teal-600">{appData.pseudonym}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Joining As:</span>
                      <p className="font-medium text-slate-800 capitalize">
                        {appData.personaType.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Identity Mode:</span>
                      <p className="font-medium text-slate-800">
                        {appData.identityMode === "public"
                          ? "Public Mode"
                          : "Safe Mode"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-gray-200">
                  <h3 className="font-medium text-slate-800 mb-3 flex items-center">
                    <PenTool className="w-4 h-4 mr-2 text-teal-500" />
                    Signature Confirmation
                  </h3>
                  <div className="text-sm">
                    <p className="text-gray-500">
                      Author Signature:{" "}
                      <span className="font-medium text-slate-800 italic">
                        {signature}
                      </span>
                    </p>
                    {appData.isMinor && (
                      <p className="text-gray-500 mt-1">
                        Guardian Signature:{" "}
                        <span className="font-medium text-slate-800 italic">
                          {guardianSignature}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep(3);
                  }}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Seal the Covenant"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}