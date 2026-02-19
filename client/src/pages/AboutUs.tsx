import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Heart, Mail, Linkedin, User, Pencil, Plus, Trash2, X, Save, Upload } from "lucide-react";
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

export default function AboutUs() {
  const { user } = useAuth();
  const [boardMembers, setBoardMembers] = useState<BoardMemberData[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", title: "", bio: "", email: "", linkedin: "", displayOrder: "0" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user && (user.role === "admin" || user.role === "board_member" || (user as any).secondaryRole === "board_member");

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center text-slate-600 hover:text-teal-600 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-red-50 rounded-full px-4 py-2 mb-4">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700">501(c)(3) Non-Profit</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-800 mb-4">
            About The Indie Quill Collective
          </h1>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
            Our Vision
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            A future where authorship is a fundamental right, not a guarded privilege—where the barriers of systemic bias are permanently neutralized, and the global narrative is a true reflection of all human experience.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
            Breaking the Silence. Building the Author.
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed">
            To dismantle the systemic architectures of forced silence. We provide a radical, frictionless path to authorship for disadvantaged youth and adults whose voices have been muted by systemic bias. By providing the specific education, tools, and human assistance required to bypass traditional gatekeepers, we ensure that those historically ignored are finally empowered as published authorities of their own narratives.
          </p>
        </section>

        <section className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="font-display text-2xl font-bold mb-6 text-center">
            Celebrating Every Voice
          </h2>
          <p className="text-slate-200 text-center mb-8 max-w-2xl mx-auto">
            We stand with and uplift marginalized communities whose stories have been silenced for too long.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Intersex-Inclusive Progress Pride Flag">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#FF0018" width="60" height="6.67" y="0"/>
                <rect fill="#FFA52C" width="60" height="6.67" y="6.67"/>
                <rect fill="#FFFF41" width="60" height="6.67" y="13.33"/>
                <rect fill="#008018" width="60" height="6.67" y="20"/>
                <rect fill="#0000F9" width="60" height="6.67" y="26.67"/>
                <rect fill="#86007D" width="60" height="6.67" y="33.33"/>
                <polygon fill="#FFFFFF" points="0,0 20,20 0,40"/>
                <polygon fill="#FFAFC8" points="0,0 15,20 0,40"/>
                <polygon fill="#74D7EE" points="0,0 10,20 0,40"/>
                <polygon fill="#613915" points="0,0 5,20 0,40"/>
                <polygon fill="#000000" points="0,0 0,40 0,20"/>
                <circle cx="8" cy="20" r="4" fill="#FFDA00"/>
                <circle cx="8" cy="20" r="2.5" fill="#7902AA"/>
              </svg>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg relative" title="Pan-African Flag with Raised Fist">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#E31B23" width="60" height="13.33" y="0"/>
                <rect fill="#000000" width="60" height="13.34" y="13.33"/>
                <rect fill="#00853F" width="60" height="13.33" y="26.67"/>
                <g transform="translate(22, 5) scale(0.7)" fill="#FFD700">
                  <path d="M12 2C11 2 10 2.5 9.5 3.5L9 4C8.5 3.5 8 3 7 3C5.5 3 4.5 4 4.5 5.5C4.5 6 4.7 6.5 5 7L4 8C3.5 8.5 3 9.5 3 10.5V12C3 12 3 14 4 15L5 16V22C5 23 5.5 24 6.5 24H17.5C18.5 24 19 23 19 22V16L20 15C21 14 21 12 21 12V10.5C21 9.5 20.5 8.5 20 8L19 7C19.3 6.5 19.5 6 19.5 5.5C19.5 4 18.5 3 17 3C16 3 15.5 3.5 15 4L14.5 3.5C14 2.5 13 2 12 2ZM8 7H9V11H8V7ZM11 7H13V11H11V7ZM15 7H16V11H15V7Z"/>
                </g>
              </svg>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Hispanic Heritage">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#1E3A5F" width="60" height="12" y="0"/>
                <polygon fill="#FFFFFF" points="30,2 32,8 38,8 33,12 35,18 30,14 25,18 27,12 22,8 28,8"/>
                <rect fill="#D4A574" width="60" height="8" y="12"/>
                <polygon fill="#8B4513" points="0,12 5,16 10,12 15,16 20,12 25,16 30,12 35,16 40,12 45,16 50,12 55,16 60,12 60,20 0,20"/>
                <rect fill="#2563EB" width="60" height="7" y="20"/>
                <rect fill="#16A34A" width="60" height="7" y="27"/>
                <rect fill="#78350F" width="60" height="6" y="34"/>
              </svg>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Asian American & Pacific Islander">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#E63946" width="60" height="40"/>
                <rect fill="#F77F00" width="60" height="6" y="4"/>
                <path d="M0,7 Q5,4 10,7 Q15,10 20,7 Q25,4 30,7 Q35,10 40,7 Q45,4 50,7 Q55,10 60,7" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
                <circle cx="5" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="15" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="25" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="35" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="45" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="55" cy="7" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <rect fill="#F77F00" width="60" height="6" y="30"/>
                <path d="M0,33 Q5,30 10,33 Q15,36 20,33 Q25,30 30,33 Q35,36 40,33 Q45,30 50,33 Q55,36 60,33" stroke="#FFFFFF" strokeWidth="1.5" fill="none"/>
                <circle cx="5" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="15" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="25" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="35" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="45" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
                <circle cx="55" cy="33" r="2" fill="#FFFFFF" fillOpacity="0.8"/>
              </svg>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Indigenous Peoples Flag">
              <svg viewBox="0 0 60 40" className="w-full h-full">
                <rect fill="#D32F2F" width="30" height="20" x="0" y="0"/>
                <rect fill="#000000" width="30" height="20" x="30" y="0"/>
                <rect fill="#FFD54F" width="30" height="20" x="0" y="20"/>
                <rect fill="#FFFFFF" width="30" height="20" x="30" y="20"/>
                <g transform="translate(30, 20)">
                  <polygon fill="#00BCD4" stroke="#FFFFFF" strokeWidth="0.5" points="0,-12 4,-8 12,-8 8,-4 8,4 12,8 4,8 0,12 -4,8 -12,8 -8,4 -8,-4 -12,-8 -4,-8"/>
                  <polygon fill="#FFFFFF" points="0,-6 6,0 0,6 -6,0"/>
                  <polygon fill="#FFD54F" points="0,-5 0,0 5,0"/>
                  <polygon fill="#D32F2F" points="0,0 0,5 -5,0"/>
                  <polygon fill="#000000" points="0,0 -5,0 0,-5"/>
                  <polygon fill="#FFFFFF" points="0,0 5,0 0,5"/>
                </g>
              </svg>
            </div>
            
            <div className="w-16 h-12 rounded-lg overflow-hidden shadow-lg" title="Disability Pride">
              <div className="w-full h-full bg-slate-900 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-full bg-red-500 transform -rotate-12 translate-x-[-6px]"></div>
                  <div className="w-1 h-full bg-yellow-400 transform -rotate-12 translate-x-[-3px]"></div>
                  <div className="w-1 h-full bg-white transform -rotate-12"></div>
                  <div className="w-1 h-full bg-blue-400 transform -rotate-12 translate-x-[3px]"></div>
                  <div className="w-1 h-full bg-green-500 transform -rotate-12 translate-x-[6px]"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="bg-white/10 px-3 py-1 rounded-full">LGBTQIA+</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Black</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Hispanic/Latino</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Asian</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Indigenous</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Disabled</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Neurodivergent</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Youth</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Women</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Refugees</span>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-4">
            The Condition of Forced Silence
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-4">
            The literary landscape is not a meritocracy; it is a fortress. For many, silence is not a choice—it is a condition forced upon them by systemic barriers. Traditional gatekeepers have built a framework of exclusion that effectively mutes marginalized voices, ensuring their stories never leave their minds and their vital histories are erased before they are even told.
          </p>
          <p className="text-gray-700 text-lg leading-relaxed">
            When the tools of storytelling are guarded by those who do not value these perspectives, the result is a systemic erasure of entire communities, cultures, and generations. We exist to end this silence.
          </p>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-center mb-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-slate-800 mb-2">
                Our Leadership Team
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Meet the dedicated individuals guiding The Indie Quill Collective's mission 
                to empower emerging authors and advance literacy.
              </p>
            </div>
          </div>

          {isAdmin && !showAddForm && editingId === null && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleAdd}
                className="flex items-center space-x-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          )}

          {isAdmin && (showAddForm || editingId !== null) && renderForm()}

          {boardMembers.length === 0 && !showAddForm ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Board member information coming soon.</p>
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
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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

        <div className="text-center py-8">
          <Link href="/apply">
            <button className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg">
              Apply to Join the Collective
            </button>
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            Ready to share your story? We're here to help you publish it.
          </p>
        </div>
      </div>
    </div>
  );
}
