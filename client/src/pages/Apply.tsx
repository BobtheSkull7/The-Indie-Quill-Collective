import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../App";
import { BookOpen, User, Users, Book, MessageSquare, AlertCircle, CheckCircle } from "lucide-react";

export default function Apply() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    pseudonym: "",
    personaType: "" as "" | "writer" | "adult_student" | "family_student",
    identityMode: "safe" as "safe" | "public",
    dateOfBirth: "",
    isMinor: false,
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: "",
    hasStoryToTell: true,
    personalStruggles: "",
    expressionTypes: [] as string[],
    expressionOther: "",
    whyCollective: "",
    goals: "",
    hearAboutUs: "",
  });

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
    setFormData({ ...formData, dateOfBirth: dob, isMinor });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Please create an account or sign in to submit your application");
      return;
    }

    if (!formData.personaType) {
      setError("Please select how you are joining us (Writer, Adult Student, or Family Student)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          expressionTypes: formData.expressionTypes.join(","),
          publicIdentityEnabled: formData.identityMode === "public",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit application");
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
        <div className="max-w-md w-full card text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for applying to The Indie Quill Collective. Our team will review your application 
            and get back to you soon. Check your dashboard for updates.
          </p>
          <button onClick={() => setLocation("/dashboard")} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const expressionOptions = [
    { id: "novel", label: "Novel" },
    { id: "short_story", label: "Short Story" },
    { id: "poems", label: "Poems" },
    { id: "graphic_novel", label: "Graphic Novel" },
    { id: "other", label: "Other" },
  ];

  const handleExpressionToggle = (typeId: string) => {
    setFormData(prev => ({
      ...prev,
      expressionTypes: prev.expressionTypes.includes(typeId)
        ? prev.expressionTypes.filter(t => t !== typeId)
        : [...prev.expressionTypes, typeId]
    }));
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-9 h-9 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-800">Author Application</h1>
          <p className="text-gray-600 mt-2">Join The Indie Quill Collective and share your story with the world</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    step >= s
                      ? "bg-teal-400 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && <div className={`w-12 h-1 ${step > s ? "bg-teal-400" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {!user && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              Please <a href="/register" className="font-medium underline">create an account</a> or{" "}
              <a href="/login" className="font-medium underline">sign in</a> before submitting your application.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <User className="w-6 h-6 text-teal-500" />
                  <h2 className="font-display text-xl font-semibold text-slate-800">Personal Information</h2>
                </div>

                <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                  <label className="label text-slate-800 font-medium">How are you joining us? *</label>
                  <p className="text-sm text-gray-600 mb-4">This determines your learning path and curriculum.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label 
                      className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.personaType === "writer" 
                          ? "border-teal-500 bg-white shadow-md" 
                          : "border-gray-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="personaType"
                        value="writer"
                        checked={formData.personaType === "writer"}
                        onChange={(e) => setFormData({ ...formData, personaType: e.target.value as any })}
                        className="sr-only"
                      />
                      <BookOpen className="w-8 h-8 text-teal-500 mb-2" />
                      <span className="font-semibold text-slate-800">Writer</span>
                      <span className="text-xs text-gray-500 text-center mt-1">I'm here to publish my book</span>
                    </label>
                    
                    <label 
                      className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.personaType === "adult_student" 
                          ? "border-teal-500 bg-white shadow-md" 
                          : "border-gray-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="personaType"
                        value="adult_student"
                        checked={formData.personaType === "adult_student"}
                        onChange={(e) => setFormData({ ...formData, personaType: e.target.value as any })}
                        className="sr-only"
                      />
                      <User className="w-8 h-8 text-blue-500 mb-2" />
                      <span className="font-semibold text-slate-800">Adult Student</span>
                      <span className="text-xs text-gray-500 text-center mt-1">I want literacy training + publishing</span>
                    </label>
                    
                    <label 
                      className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.personaType === "family_student" 
                          ? "border-teal-500 bg-white shadow-md" 
                          : "border-gray-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="personaType"
                        value="family_student"
                        checked={formData.personaType === "family_student"}
                        onChange={(e) => setFormData({ ...formData, personaType: e.target.value as any })}
                        className="sr-only"
                      />
                      <Users className="w-8 h-8 text-purple-500 mb-2" />
                      <span className="font-semibold text-slate-800">Family Student</span>
                      <span className="text-xs text-gray-500 text-center mt-1">My family is learning together</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Pseudonym (Creative Identity) *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Your pseudonym for the bookstore"
                    value={formData.pseudonym}
                    onChange={(e) => setFormData({ ...formData, pseudonym: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">This is how your name will appear on published works. Your legal name remains private.</p>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="font-medium text-slate-800 mb-2">Identity Visibility & Safety (COPPA Compliance)</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    We follow COPPA to ensure that all minors are protected at all times. Choose how your identity will appear publicly:
                  </p>
                  
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-amber-100">
                      <input
                        type="radio"
                        name="identityMode"
                        checked={formData.identityMode === "safe"}
                        onChange={() => setFormData({ ...formData, identityMode: "safe" })}
                        className="w-4 h-4 mt-1 text-teal-500"
                      />
                      <div>
                        <span className="font-medium text-slate-800">Safe Mode (Default)</span>
                        <p className="text-xs text-gray-600">
                          Your identity will be masked using a truncated name and emoji avatar in all public materials. Only your pseudonym will be shared with the Bookstore.
                        </p>
                      </div>
                    </label>
                    
                    <label className="flex items-start space-x-3 cursor-pointer p-2 rounded hover:bg-amber-100">
                      <input
                        type="radio"
                        name="identityMode"
                        checked={formData.identityMode === "public"}
                        onChange={() => setFormData({ ...formData, identityMode: "public" })}
                        className="w-4 h-4 mt-1 text-teal-500"
                      />
                      <div>
                        <span className="font-medium text-slate-800">Public Mode</span>
                        <p className="text-xs text-gray-600">
                          I grant permission to use my full legal name and photograph for marketing and promotional purposes.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>

                {formData.isMinor && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-700 text-sm mb-4">
                      Since you're under 18, we'll need your parent or guardian's information 
                      for contract approval.
                    </p>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-slate-800">Guardian Information</h3>
                      </div>

                      <div>
                        <label className="label">Guardian Full Name *</label>
                        <input
                          type="text"
                          required={formData.isMinor}
                          className="input-field"
                          placeholder="Parent or guardian's name"
                          value={formData.guardianName}
                          onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="label">Guardian Email *</label>
                        <input
                          type="email"
                          required={formData.isMinor}
                          className="input-field"
                          placeholder="guardian@email.com"
                          value={formData.guardianEmail}
                          onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="label">Guardian Phone *</label>
                        <input
                          type="tel"
                          required={formData.isMinor}
                          className="input-field"
                          placeholder="(555) 123-4567"
                          value={formData.guardianPhone}
                          onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="label">Relationship *</label>
                        <select
                          required={formData.isMinor}
                          className="input-field"
                          value={formData.guardianRelationship}
                          onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
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

                <div className="flex justify-between">
                  <button type="button" onClick={() => setLocation("/")} className="btn-secondary">
                    Back to Home
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="btn-primary">
                    Next: Your Story
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Book className="w-6 h-6 text-teal-500" />
                  <h2 className="font-display text-xl font-semibold text-slate-800">Your Story</h2>
                </div>

                <div>
                  <label className="label">Do you have a story to tell? *</label>
                  <div className="flex space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasStory"
                        checked={formData.hasStoryToTell}
                        onChange={() => setFormData({ ...formData, hasStoryToTell: true })}
                        className="w-4 h-4 text-teal-500"
                      />
                      <span>Yes, I do!</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="hasStory"
                        checked={!formData.hasStoryToTell}
                        onChange={() => setFormData({ ...formData, hasStoryToTell: false })}
                        className="w-4 h-4 text-teal-500"
                      />
                      <span>I'm not sure yet</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="label">Tell me about you and the struggles you deal with *</label>
                  <textarea
                    required
                    rows={5}
                    className="input-field"
                    placeholder="Share your experiences, challenges, and the things that have shaped who you are today. This helps us understand your unique perspective and story."
                    value={formData.personalStruggles}
                    onChange={(e) => setFormData({ ...formData, personalStruggles: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">How do you think you want to express it? (check all that apply) *</label>
                  <div className="mt-3 space-y-3">
                    {expressionOptions.map((option) => (
                      <label key={option.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.expressionTypes.includes(option.id)}
                          onChange={() => handleExpressionToggle(option.id)}
                          className="w-5 h-5 text-teal-500 rounded border-gray-300 focus:ring-teal-400"
                        />
                        <span className="text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.expressionTypes.includes("other") && (
                  <div>
                    <label className="label">Please explain your "Other" expression type</label>
                    <textarea
                      rows={2}
                      className="input-field"
                      placeholder="Describe how you'd like to express your story..."
                      value={formData.expressionOther}
                      onChange={(e) => setFormData({ ...formData, expressionOther: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStep(3)} 
                    className="btn-primary"
                    disabled={formData.expressionTypes.length === 0}
                  >
                    Next: Final Details
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <MessageSquare className="w-6 h-6 text-teal-500" />
                  <h2 className="font-display text-xl font-semibold text-slate-800">Final Details</h2>
                </div>

                <div>
                  <label className="label">Why do you want to join The Indie Quill Collective? *</label>
                  <textarea
                    required
                    rows={4}
                    className="input-field"
                    placeholder="Tell us why our non-profit mission resonates with you and what you hope to achieve"
                    value={formData.whyCollective}
                    onChange={(e) => setFormData({ ...formData, whyCollective: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">What are your publishing goals?</label>
                  <textarea
                    rows={3}
                    className="input-field"
                    placeholder="What do you hope to achieve with your book?"
                    value={formData.goals}
                    onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">How did you hear about us?</label>
                  <select
                    className="input-field"
                    value={formData.hearAboutUs}
                    onChange={(e) => setFormData({ ...formData, hearAboutUs: e.target.value })}
                  >
                    <option value="">Select an option</option>
                    <option value="social_media">Social Media</option>
                    <option value="friend">Friend or Family</option>
                    <option value="search">Online Search</option>
                    <option value="school">School/Teacher</option>
                    <option value="writing_group">Writing Group</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                    Back
                  </button>
                  <button type="submit" disabled={loading || !user} className="btn-primary disabled:opacity-50">
                    {loading ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
