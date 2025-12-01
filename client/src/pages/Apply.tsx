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
    penName: "",
    dateOfBirth: "",
    isMinor: false,
    guardianName: "",
    guardianEmail: "",
    guardianPhone: "",
    guardianRelationship: "",
    bookTitle: "",
    genre: "",
    wordCount: "",
    bookSummary: "",
    manuscriptStatus: "",
    previouslyPublished: false,
    publishingDetails: "",
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

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          wordCount: parseInt(formData.wordCount) || null,
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

  const genres = [
    "Fiction - Literary",
    "Fiction - Fantasy",
    "Fiction - Science Fiction",
    "Fiction - Romance",
    "Fiction - Mystery/Thriller",
    "Fiction - Horror",
    "Fiction - Young Adult",
    "Fiction - Children's",
    "Non-Fiction - Memoir",
    "Non-Fiction - Self-Help",
    "Non-Fiction - Biography",
    "Non-Fiction - Educational",
    "Poetry",
    "Other",
  ];

  const manuscriptStatuses = [
    "Complete - Ready for editing",
    "Complete - First draft",
    "In Progress - 75% done",
    "In Progress - 50% done",
    "In Progress - Just started",
    "Planning stage",
  ];

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
            {[1, 2, 3, 4].map((s) => (
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
                {s < 4 && <div className={`w-12 h-1 ${step > s ? "bg-teal-400" : "bg-gray-200"}`} />}
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

                <div>
                  <label className="label">Pen Name (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Your author pen name"
                    value={formData.penName}
                    onChange={(e) => setFormData({ ...formData, penName: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank to use your real name</p>
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

                <div className="flex justify-end">
                  <button type="button" onClick={() => setStep(2)} className="btn-primary">
                    Next: Book Details
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Book className="w-6 h-6 text-teal-500" />
                  <h2 className="font-display text-xl font-semibold text-slate-800">Book Information</h2>
                </div>

                <div>
                  <label className="label">Book Title *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="The title of your book"
                    value={formData.bookTitle}
                    onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Genre *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.genre}
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  >
                    <option value="">Select a genre</option>
                    {genres.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Estimated Word Count</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="e.g., 50000"
                    value={formData.wordCount}
                    onChange={(e) => setFormData({ ...formData, wordCount: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Manuscript Status *</label>
                  <select
                    required
                    className="input-field"
                    value={formData.manuscriptStatus}
                    onChange={(e) => setFormData({ ...formData, manuscriptStatus: e.target.value })}
                  >
                    <option value="">Select status</option>
                    {manuscriptStatuses.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Book Summary *</label>
                  <textarea
                    required
                    rows={4}
                    className="input-field"
                    placeholder="Tell us about your book - the plot, themes, and what makes it special"
                    value={formData.bookSummary}
                    onChange={(e) => setFormData({ ...formData, bookSummary: e.target.value })}
                  />
                </div>

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary">
                    Next: Experience
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <Book className="w-6 h-6 text-teal-500" />
                  <h2 className="font-display text-xl font-semibold text-slate-800">Publishing Background</h2>
                </div>

                <div>
                  <label className="label">Have you been published before?</label>
                  <div className="flex space-x-4 mt-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="published"
                        checked={!formData.previouslyPublished}
                        onChange={() => setFormData({ ...formData, previouslyPublished: false })}
                        className="w-4 h-4 text-teal-500"
                      />
                      <span>No, this is my first</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="published"
                        checked={formData.previouslyPublished}
                        onChange={() => setFormData({ ...formData, previouslyPublished: true })}
                        className="w-4 h-4 text-teal-500"
                      />
                      <span>Yes, I have</span>
                    </label>
                  </div>
                </div>

                {formData.previouslyPublished && (
                  <div>
                    <label className="label">Publishing Details</label>
                    <textarea
                      rows={3}
                      className="input-field"
                      placeholder="Tell us about your previous publications"
                      value={formData.publishingDetails}
                      onChange={(e) => setFormData({ ...formData, publishingDetails: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary">
                    Back
                  </button>
                  <button type="button" onClick={() => setStep(4)} className="btn-primary">
                    Next: Final Details
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
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
                  <button type="button" onClick={() => setStep(3)} className="btn-secondary">
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
