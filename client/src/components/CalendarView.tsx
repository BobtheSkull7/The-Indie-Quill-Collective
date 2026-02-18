import { useState, useMemo } from "react";

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

interface CalendarViewProps {
  events: CalendarEventType[];
  onCreateEvent: (date: Date, allDay: boolean) => void;
  onEventClick: (event: CalendarEventType) => void;
  loading?: boolean;
}

type ViewMode = "month" | "week" | "day";

const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  meeting: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" },
  board_meeting: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
  deadline: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" },
  event: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300" },
  other: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const FULL_DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function getEventColors(eventType: string) {
  return EVENT_COLORS[eventType] || EVENT_COLORS.other;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const start = new Date(year, month, 1 - startDow);
  const weeks: Date[][] = [];
  let current = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (current.getMonth() !== month && current.getDay() === 0) break;
  }
  return weeks;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(date: Date): Date[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getEventsForDay(events: CalendarEventType[], day: Date): CalendarEventType[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return events.filter((ev) => {
    const start = new Date(ev.startDate);
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    if (isSameDay(start, day)) return true;
    if (ev.endDate) {
      const end = new Date(ev.endDate);
      if (ev.allDay) {
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        return dayStart >= startDay && dayStart < endDay;
      }
      return dayStart <= end && dayEnd >= start;
    }
    return false;
  });
}

export default function CalendarView({ events, onCreateEvent, onEventClick, loading }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = useMemo(() => new Date(), []);

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const headerText = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === "week") {
      const days = getWeekDays(currentDate);
      const first = days[0];
      const last = days[6];
      if (first.getMonth() === last.getMonth()) {
        return `${SHORT_MONTH_NAMES[first.getMonth()]} ${first.getDate()}\u2013${last.getDate()}, ${first.getFullYear()}`;
      }
      if (first.getFullYear() === last.getFullYear()) {
        return `${SHORT_MONTH_NAMES[first.getMonth()]} ${first.getDate()} \u2013 ${SHORT_MONTH_NAMES[last.getMonth()]} ${last.getDate()}, ${first.getFullYear()}`;
      }
      return `${SHORT_MONTH_NAMES[first.getMonth()]} ${first.getDate()}, ${first.getFullYear()} \u2013 ${SHORT_MONTH_NAMES[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
    }
    return `${FULL_DAY_NAMES[currentDate.getDay()]}, ${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }, [view, currentDate]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={navigatePrev}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-lg"
          >
            ←
          </button>
          <button
            onClick={navigateNext}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-lg"
          >
            →
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <h2 className="font-display text-xl font-semibold text-slate-800 ml-2">{headerText}</h2>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
                view === v
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 sm:p-4">
        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            today={today}
            events={events}
            onCreateEvent={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            today={today}
            events={events}
            onCreateEvent={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            today={today}
            events={events}
            onCreateEvent={onCreateEvent}
            onEventClick={onEventClick}
          />
        )}
      </div>
    </div>
  );
}

interface SubViewProps {
  currentDate: Date;
  today: Date;
  events: CalendarEventType[];
  onCreateEvent: (date: Date, allDay: boolean) => void;
  onEventClick: (event: CalendarEventType) => void;
}

function EventChip({ event, onEventClick, compact }: { event: CalendarEventType; onEventClick: (e: CalendarEventType) => void; compact?: boolean }) {
  const colors = getEventColors(event.eventType);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEventClick(event);
      }}
      className={`w-full text-left truncate rounded px-1.5 border-l-2 ${colors.bg} ${colors.text} ${colors.border} ${
        compact ? "text-[10px] py-0 leading-4" : "text-xs py-0.5"
      } hover:opacity-80 transition-opacity`}
      title={event.title}
    >
      {event.title}
    </button>
  );
}

function MonthView({ currentDate, today, events, onCreateEvent, onEventClick }: SubViewProps) {
  const weeks = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );
  const currentMonth = currentDate.getMonth();

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200">
        {DAY_NAMES.map((name) => (
          <div key={name} className="text-center text-xs font-medium text-gray-500 py-2">
            {name}
          </div>
        ))}
      </div>
      <div className="border-l border-gray-200">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const isCurrentMonth = day.getMonth() === currentMonth;
              const isToday = isSameDay(day, today);
              const dayEvents = getEventsForDay(events, day);
              return (
                <div
                  key={di}
                  className={`border-r border-b border-gray-200 min-h-[100px] sm:min-h-[100px] min-h-[60px] p-1 cursor-pointer hover:bg-blue-50 transition-colors ${
                    !isCurrentMonth ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    const clickDate = new Date(day);
                    clickDate.setHours(9, 0, 0, 0);
                    onCreateEvent(clickDate, true);
                  }}
                >
                  <div className="flex justify-end">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full ${
                        isToday
                          ? "bg-teal-600 text-white font-bold"
                          : isCurrentMonth
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="mt-0.5 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <EventChip key={ev.id} event={ev} onEventClick={onEventClick} compact />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-gray-500 pl-1">+{dayEvents.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView({ currentDate, today, events, onCreateEvent, onEventClick }: SubViewProps) {
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay: Record<number, CalendarEventType[]> = {};
    const timed: Record<number, CalendarEventType[]> = {};
    weekDays.forEach((_, i) => {
      allDay[i] = [];
      timed[i] = [];
    });
    weekDays.forEach((day, i) => {
      const dayEvts = getEventsForDay(events, day);
      dayEvts.forEach((ev) => {
        if (ev.allDay) {
          allDay[i].push(ev);
        } else {
          timed[i].push(ev);
        }
      });
    });
    return { allDayEvents: allDay, timedEvents: timed };
  }, [weekDays, events]);

  const hasAllDay = Object.values(allDayEvents).some((arr) => arr.length > 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
          <div className="text-xs text-gray-400 p-1"></div>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={i} className="text-center py-2 border-l border-gray-200">
                <div className="text-xs text-gray-500">{DAY_NAMES[day.getDay()]}</div>
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 text-sm rounded-full ${
                    isToday ? "bg-teal-600 text-white font-bold" : "text-gray-900"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {hasAllDay && (
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
            <div className="text-[10px] text-gray-400 p-1 flex items-center justify-center">ALL DAY</div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="border-l border-gray-200 p-1 min-h-[32px] cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={() => {
                  const clickDate = new Date(day);
                  clickDate.setHours(0, 0, 0, 0);
                  onCreateEvent(clickDate, true);
                }}
              >
                {allDayEvents[i].map((ev) => (
                  <EventChip key={ev.id} event={ev} onEventClick={onEventClick} compact />
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)]">
              <div className="text-[10px] text-gray-400 pr-2 text-right h-[60px] -mt-2">
                {formatHour(hour)}
              </div>
              {weekDays.map((day, di) => {
                const hourEvents = timedEvents[di].filter((ev) => {
                  const start = new Date(ev.startDate);
                  return start.getHours() === hour;
                });
                return (
                  <div
                    key={di}
                    className="border-l border-t border-gray-200 h-[60px] relative cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(hour, 0, 0, 0);
                      onCreateEvent(clickDate, false);
                    }}
                  >
                    {hourEvents.map((ev) => {
                      const start = new Date(ev.startDate);
                      const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 3600000);
                      const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                      const heightPx = Math.min((durationMinutes / 60) * 60, 180);
                      const topPx = (start.getMinutes() / 60) * 60;
                      const colors = getEventColors(ev.eventType);
                      return (
                        <button
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(ev);
                          }}
                          className={`absolute left-0.5 right-0.5 rounded px-1 border-l-2 text-[10px] leading-tight overflow-hidden z-10 ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 transition-opacity`}
                          style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                          title={ev.title}
                        >
                          <div className="font-medium truncate">{ev.title}</div>
                          {heightPx > 30 && (
                            <div className="truncate opacity-75">
                              {formatHour(start.getHours())}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayView({ currentDate, today, events, onCreateEvent, onEventClick }: SubViewProps) {
  const dayEvents = useMemo(() => getEventsForDay(events, currentDate), [events, currentDate]);
  const allDayEvts = dayEvents.filter((ev) => ev.allDay);
  const timedEvts = dayEvents.filter((ev) => !ev.allDay);
  const isToday = isSameDay(currentDate, today);

  return (
    <div>
      <div className="text-center py-2 border-b border-gray-200">
        <div className="text-xs text-gray-500">{DAY_NAMES[currentDate.getDay()]}</div>
        <span
          className={`inline-flex items-center justify-center w-10 h-10 text-lg rounded-full ${
            isToday ? "bg-teal-600 text-white font-bold" : "text-gray-900"
          }`}
        >
          {currentDate.getDate()}
        </span>
      </div>

      {allDayEvts.length > 0 && (
        <div className="border-b border-gray-200 p-2">
          <div className="text-[10px] text-gray-400 mb-1">ALL DAY</div>
          <div className="space-y-1">
            {allDayEvts.map((ev) => (
              <EventChip key={ev.id} event={ev} onEventClick={onEventClick} />
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        {HOURS.map((hour) => {
          const hourEvents = timedEvts.filter((ev) => {
            const start = new Date(ev.startDate);
            return start.getHours() === hour;
          });
          return (
            <div key={hour} className="grid grid-cols-[60px_1fr]">
              <div className="text-xs text-gray-400 pr-2 text-right h-[60px] -mt-2">
                {formatHour(hour)}
              </div>
              <div
                className="border-l border-t border-gray-200 h-[60px] relative cursor-pointer hover:bg-blue-50 transition-colors"
                onClick={() => {
                  const clickDate = new Date(currentDate);
                  clickDate.setHours(hour, 0, 0, 0);
                  onCreateEvent(clickDate, false);
                }}
              >
                {hourEvents.map((ev) => {
                  const start = new Date(ev.startDate);
                  const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 3600000);
                  const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                  const heightPx = Math.min((durationMinutes / 60) * 60, 240);
                  const topPx = (start.getMinutes() / 60) * 60;
                  const colors = getEventColors(ev.eventType);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      className={`absolute left-1 right-1 rounded px-2 py-0.5 border-l-2 text-xs overflow-hidden z-10 ${colors.bg} ${colors.text} ${colors.border} hover:opacity-80 transition-opacity`}
                      style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                      title={ev.title}
                    >
                      <div className="font-medium truncate">{ev.title}</div>
                      {heightPx > 30 && (
                        <div className="truncate opacity-75">
                          {formatHour(start.getHours())}
                          {ev.location && ` · ${ev.location}`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
