import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Pin,
  Calendar,
  User,
  X,
  Save,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface WikiEntry {
  id: number;
  title: string;
  content: string;
  category: string;
  authorId: string | null;
  authorName?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "policies", label: "Policies & Procedures" },
  { value: "meetings", label: "Meeting Notes" },
  { value: "resources", label: "Resources" },
  { value: "training", label: "Training Materials" },
  { value: "contacts", label: "Key Contacts" },
];

export default function WikiContent() {
  const [entries, setEntries] = useState<WikiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WikiEntry | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<number>>(new Set());

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    try {
      const res = await fetch("/api/wiki");
      if (!res.ok) throw new Error("Failed to fetch wiki entries");
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wiki");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setFormIsPinned(false);
    setEditingEntry(null);
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
          isPinned: formIsPinned,
        }),
      });

      if (!res.ok) throw new Error("Failed to create entry");

      await fetchEntries();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create entry");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry || !formTitle.trim() || !formContent.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/wiki/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          category: formCategory,
          isPinned: formIsPinned,
        }),
      });

      if (!res.ok) throw new Error("Failed to update entry");

      await fetchEntries();
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this wiki entry?")) return;

    try {
      const res = await fetch(`/api/wiki/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entry");
      await fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete entry");
    }
  };

  const handleTogglePin = async (entry: WikiEntry) => {
    try {
      const res = await fetch(`/api/wiki/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !entry.isPinned }),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      await fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle pin");
    }
  };

  const openEditModal = (entry: WikiEntry) => {
    setEditingEntry(entry);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormCategory(entry.category);
    setFormIsPinned(entry.isPinned);
    setShowCreateModal(true);
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const filteredEntries = entries
    .filter((entry) => {
      const matchesSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || entry.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-collective-teal"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search wiki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-collective-teal/20 focus:border-collective-teal"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-collective-teal/20 focus:border-collective-teal"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-collective-teal/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No wiki entries found</p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-3 text-collective-teal hover:underline"
          >
            Create the first entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white border rounded-lg overflow-hidden ${
                entry.isPinned ? "border-yellow-300 bg-yellow-50/30" : "border-gray-200"
              }`}
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(entry.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedEntries.has(entry.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  {entry.isPinned && (
                    <Pin className="w-4 h-4 text-yellow-500" />
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">{entry.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded">
                        {getCategoryLabel(entry.category)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </span>
                      {entry.authorName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {entry.authorName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleTogglePin(entry)}
                    className={`p-2 rounded-lg transition-colors ${
                      entry.isPinned
                        ? "text-yellow-600 hover:bg-yellow-100"
                        : "text-gray-400 hover:text-yellow-600 hover:bg-yellow-50"
                    }`}
                    title={entry.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(entry)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedEntries.has(entry.id) && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <div className="pl-8 prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 mt-3">
                      {entry.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingEntry ? "Edit Wiki Entry" : "New Wiki Entry"}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-collective-teal/20 focus:border-collective-teal"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-collective-teal/20 focus:border-collective-teal"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formIsPinned}
                      onChange={(e) => setFormIsPinned(e.target.checked)}
                      className="rounded border-gray-300 text-collective-teal focus:ring-collective-teal"
                    />
                    <Pin className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">Pin to top</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your wiki content here..."
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-collective-teal/20 focus:border-collective-teal font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingEntry ? handleUpdate : handleCreate}
                disabled={saving || !formTitle.trim() || !formContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-collective-teal text-white rounded-lg hover:bg-collective-teal/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : editingEntry ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
