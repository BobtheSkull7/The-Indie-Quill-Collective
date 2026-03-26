import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Heart, ArrowLeft, Mail, Users, User, Pencil, Plus, Trash2, X, Save, Upload, Linkedin } from "lucide-react";
import ContactModal from "../components/ContactModal";
import { useAuth } from "../App";

interface BoardMemberData {
  id: number;
  name: string;
  title: string;
  bio: string | null;
  photoFilename: string | null;
  email: string | null;
  linkedin: string | null;
  displayOrder: number;
  isActive: boolean;
}

const lineage = [
  { name: "Joseph Campbell", work: "The Hero with a Thousand Faces", concept: "The Hero's Journey" },
  { name: "Jerry Jenkins", work: "The Left Behind Series", concept: "The 21-Point Check" },
  { name: "James Michener", work: "Hawaii & The Source", concept: "The Sense of Place" },
  { name: "Jenna Rainey", work: "The Creative Entrepreneur", concept: "Visual Storytelling" },
  { name: "The Novelry", work: "The Golden Hour", concept: "Structural Physics" },
];

const partners = [
  { name: "The Indie Quill Collective", role: "Founding Visionary" },
  { name: "The Founding 25", role: "Members who joined during our inaugural season." },
  { name: "The Open Ledger", role: "Transparency in our mission and funding." },
];

const council = [
  { name: "Fiction Lead", status: "Vacant - Applications Open", badge: "Recruiting" },
  { name: "Non-Fiction Lead", status: "Vacant - Applications Open", badge: "Recruiting" },
  { name: "Poetry Consultant", status: "Vacant - Applications Open", badge: "Recruiting" },
];

const paperGrainBg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`;

const ALLOWED_ROLES = ["student", "writer", "admin", "board_member", "auditor", "mentor"];

export default function Community() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showContactModal, setShowContactModal] = useState(false);

  const [boardMembers, setBoardMembers] = useState<BoardMemberData[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", title: "", bio: "", email: "", linkedin: "", displayOrder: "0" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user && (user.role === "admin" || user.role === "board_member" || (user as any).secondaryRole === "board_member");

  useEffect(() => {
    if (user !== null && !ALLOWED_ROLES.includes(user.role)) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  useEffect(() => {
    loadBoardMembers();
  }, []);

  const loadBoardMembers = () => {
    fetch("/api/public/board-members")
      .then(res => res.ok ? res.json() : [])
      .then(data => setBoardMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const handleEdit = (member: BoardMemberData) => {
    setEditingId(member.id);
    setShowAddForm(false);
    setFormData({
      name: member.name,
      title: member.title,
      bio: member.bio || "",
      email: member.email || "",
      linkedin: member.linkedin || "",
      displayOrder: String(member.displayOrder),
    });
    setPhotoFile(null);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingId(null);
    setFormData({ name: "", title: "", bio: "", email: "", linkedin: "", displayOrder: "0" });
    setPhotoFile(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({ name: "", title: "", bio: "", email: "", linkedin: "", displayOrder: "0" });
    setPhotoFile(null);
  };

  const handleSave = async () => {
    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("title", formData.title);
    fd.append("bio", formData.bio);
    fd.append("email", formData.email);
    fd.append("linkedin", formData.linkedin);
    fd.append("displayOrder", formData.displayOrder);
    if (photoFile) fd.append("photo", photoFile);

    const url = editingId ? `/api/admin/board-members/${editingId}` : "/api/admin/board-members";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, { method, body: fd });
    if (res.ok) {
      loadBoardMembers();
      handleCancel();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this board member?")) return;
    const res = await fetch(`/api/admin/board-members/${id}`, { method: "DELETE" });
    if (res.ok) loadBoardMembers();
  };

  const renderForm = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-teal-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-slate-800">
          {editingId ? "Edit Board Member" : "Add Board Member"}
        </h3>
        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={formData.bio}
            onChange={e => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input
            type="url"
            value={formData.linkedin}
            onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
          <input
            type="number"
            value={formData.displayOrder}
            onChange={e => setFormData({ ...formData, displayOrder: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => setPhotoFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" />
            <span>{photoFile ? photoFile.name : "Choose photo..."}</span>
          </button>
        </div>
      </div>
      <div className="flex justify-end mt-4 space-x-3">
        <button onClick={handleCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!formData.name || !formData.title}
          className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{editingId ? "Update" : "Add"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #faf6f0 0%, #f5efe6 40%, #ede4d6 100%)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2c1810" }}
          >
            The Quill Collective
          </h1>
          <div className="w-24 h-0.5 bg-amber-700 mx-auto mb-6 opacity-60" />
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#5c4a3a" }}
          >
            Where community supports the voices of tomorrow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              backgroundColor: "#FDFBF7",
              backgroundImage: paperGrainBg,
              backgroundSize: "200px 200px",
              borderColor: "#d4c4a8",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#e8d5b7" }}
              >
                <BookOpen className="w-5 h-5" style={{ color: "#6b4c2a" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#3a2a1a" }}
              >
                The Lineage
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a5a", lineHeight: "1.6" }}
            >
              The voices that guide our curriculum and inspire our standards.
            </p>
            <ul className="space-y-5">
              {lineage.map((master, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#e8d5b7" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#2c1810" }}
                  >
                    {master.name}
                  </p>
                  <p
                    className="text-sm italic"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#8a7a6a" }}
                  >
                    {master.work}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#998877", letterSpacing: "0.05em" }}>
                    {master.concept}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              backgroundColor: "#FDFBF7",
              backgroundImage: paperGrainBg,
              backgroundSize: "200px 200px",
              borderColor: "#c8b8d8",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#e0d0f0" }}
              >
                <Heart className="w-5 h-5" style={{ color: "#6b4c8a" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#3a2a4a" }}
              >
                Our Partners
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a8a", lineHeight: "1.6" }}
            >
              The donors and foundations whose generosity makes our mission possible.
            </p>
            <ul className="space-y-5">
              {partners.map((partner, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#dcd0e8" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#2c1830" }}
                  >
                    {partner.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#8a7a9a" }}
                  >
                    {partner.role}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "#dcd0e8" }}>
              <Link
                href="/donations"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #7c5caa 0%, #5a3d8a 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(90, 61, 138, 0.3)",
                }}
              >
                <Heart className="w-4 h-4" />
                Become a Patron
              </Link>
            </div>
          </section>

          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              backgroundColor: "#FDFBF7",
              backgroundImage: paperGrainBg,
              backgroundSize: "200px 200px",
              borderColor: "#a8b8d4",
              boxShadow: "0 4px 24px rgba(44, 24, 16, 0.08)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#c0d0e8" }}
              >
                <Users className="w-5 h-5" style={{ color: "#2a4c6b" }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ fontFamily: "'Playfair Display', serif", color: "#1a2a3a" }}
              >
                The Writer's Council
              </h2>
            </div>
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#5a6a7a", lineHeight: "1.6" }}
            >
              Active leadership roles shaping the future of our literary community.
            </p>
            <ul className="space-y-5">
              {council.map((member, i) => (
                <li key={i} className="border-b pb-4" style={{ borderColor: "#c0d0e0" }}>
                  <p
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "#1a2030" }}
                  >
                    {member.name}
                  </p>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#6a7a8a" }}
                  >
                    {member.status}
                  </p>
                  <span
                    className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full"
                    style={{ background: "#d0e0f0", color: "#2a4c6b", fontWeight: 600 }}
                  >
                    {member.badge}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: "#c0d0e0" }}>
              <button
                onClick={() => setShowContactModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #3a5a8a 0%, #2a4c6b 100%)",
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(42, 76, 107, 0.3)",
                }}
              >
                <Mail className="w-4 h-4" />
                Apply for the Council
              </button>
            </div>
          </section>
        </div>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2
                className="text-3xl font-bold mb-1"
                style={{ fontFamily: "'Playfair Display', serif", color: "#2c1810" }}
              >
                Our Leadership Team
              </h2>
              <p className="text-sm" style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a5a" }}>
                The dedicated individuals guiding The Indie Quill Collective's mission.
              </p>
            </div>
            {isAdmin && !showAddForm && editingId === null && (
              <button
                onClick={handleAdd}
                className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {isAdmin && (showAddForm || editingId !== null) && renderForm()}

          {boardMembers.length === 0 && !showAddForm ? (
            <div
              className="text-center py-12 rounded-2xl border"
              style={{
                backgroundColor: "#FDFBF7",
                backgroundImage: paperGrainBg,
                backgroundSize: "200px 200px",
                borderColor: "#d4c4a8",
              }}
            >
              <User className="w-12 h-12 mx-auto mb-3" style={{ color: "#c8b8a8" }} />
              <p style={{ fontFamily: "'EB Garamond', 'Georgia', serif", color: "#7a6a5a" }}>
                Leadership profiles will appear here.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {boardMembers.map((member, index) => (
                <div
                  key={member.id}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group ${
                    index === 0 ? "md:col-span-2" : ""
                  }`}
                >
                  {isAdmin && editingId !== member.id && (
                    <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => handleEdit(member)}
                        className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-teal-600 transition-colors border border-gray-200"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-2 bg-white rounded-full shadow-md text-gray-500 hover:text-red-600 transition-colors border border-gray-200"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className={`p-8 ${index === 0 ? "md:flex md:gap-8" : ""}`}>
                    <div className={`${index === 0 ? "md:w-1/3" : ""} mb-6 md:mb-0`}>
                      <div
                        className={`${
                          index === 0 ? "w-48 h-48 mx-auto md:mx-0" : "w-32 h-32 mx-auto"
                        } bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg`}
                        style={{ overflow: "hidden" }}
                      >
                        {member.photoFilename ? (
                          <img
                            src={`/uploads/board/${member.photoFilename}`}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            style={{ display: "block", minWidth: "100%", minHeight: "100%" }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <User className={`${index === 0 ? "w-20 h-20" : "w-12 h-12"} text-teal-400`} />
                        )}
                      </div>
                    </div>

                    <div className={`${index === 0 ? "md:w-2/3" : ""} text-center ${index === 0 ? "md:text-left" : ""}`}>
                      <h3 className="font-display text-xl font-bold text-slate-800 mb-1">
                        {member.name}
                      </h3>
                      <p className="text-teal-600 font-medium text-sm mb-4">
                        {member.title}
                      </p>
                      {member.bio && (
                        <p className="text-gray-600 leading-relaxed mb-4">
                          {member.bio}
                        </p>
                      )}
                      {(member.email || member.linkedin) && (
                        <div className="flex items-center justify-center md:justify-start space-x-4">
                          {member.email && (
                            <a href={`mailto:${member.email}`} className="flex items-center space-x-1 text-gray-500 hover:text-teal-600 transition-colors text-sm">
                              <Mail className="w-4 h-4" />
                              <span>Email</span>
                            </a>
                          )}
                          {member.linkedin && (
                            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors text-sm">
                              <Linkedin className="w-4 h-4" />
                              <span>LinkedIn</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="text-center">
          <Link
            href="/student"
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: "#7a6a5a" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Scribe Space
          </Link>
        </div>
      </div>

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        pageSource="Community Page — Writer's Council Application"
      />
    </div>
  );
}
