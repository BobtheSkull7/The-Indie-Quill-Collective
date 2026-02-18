import { useState, useEffect, useCallback } from "react";

interface CalendarEventType {
  id: number;
  title: string;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  allDay: boolean;
  eventType: string;
  location?: string | null;
  googleCalendarEventId?: string | null;
  isFromGoogle: boolean;
}

export interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  eventType: string;
  location: string;
}

interface EventModalProps {
  event?: CalendarEventType | null;
  initialDate?: Date;
  initialAllDay?: boolean;
  onSave: (data: EventFormData) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

function formatDateTimeLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateForInput(isoString: string, allDay: boolean): string {
  const date = new Date(isoString);
  return allDay ? formatDateOnly(date) : formatDateTimeLocal(date);
}

const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "board_meeting", label: "Board Meeting" },
  { value: "deadline", label: "Deadline" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export default function EventModal({
  event,
  initialDate,
  initialAllDay,
  onSave,
  onDelete,
  onClose,
  saving,
}: EventModalProps) {
  const isEdit = !!event;

  const getInitialStartDate = () => {
    if (event) {
      return parseDateForInput(event.startDate, event.allDay);
    }
    if (initialDate) {
      return initialAllDay ? formatDateOnly(initialDate) : formatDateTimeLocal(initialDate);
    }
    return "";
  };

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [allDay, setAllDay] = useState(event?.allDay ?? initialAllDay ?? false);
  const [startDate, setStartDate] = useState(getInitialStartDate);
  const [endDate, setEndDate] = useState(
    event?.endDate ? parseDateForInput(event.endDate, event.allDay) : ""
  );
  const [eventType, setEventType] = useState(event?.eventType || "meeting");
  const [location, setLocation] = useState(event?.location || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleAllDayChange = (checked: boolean) => {
    setAllDay(checked);
    if (startDate) {
      const d = new Date(startDate);
      setStartDate(checked ? formatDateOnly(d) : formatDateTimeLocal(d));
    }
    if (endDate) {
      const d = new Date(endDate);
      setEndDate(checked ? formatDateOnly(d) : formatDateTimeLocal(d));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;
    await onSave({
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      allDay,
      eventType,
      location: location.trim(),
    });
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(event.id);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors text-sm";

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 max-w-lg mx-auto w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-slate-800">
            {isEdit ? "Edit Event" : "New Event"}
          </h2>
          {event?.googleCalendarEventId && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              📅 Synced with Google
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Event title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => handleAllDayChange(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="allDay" className="text-sm font-medium text-gray-700">
              All Day
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className={inputClass}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
                placeholder="Optional location"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    confirmDelete
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {confirmDelete ? "Confirm Delete" : "Delete"}
                </button>
              )}
              {confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || !startDate}
                className="px-5 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : isEdit ? (
                  "Update Event"
                ) : (
                  "Create Event"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
