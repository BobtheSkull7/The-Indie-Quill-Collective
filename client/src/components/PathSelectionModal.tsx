import { useState } from "react";

interface PathSelectionModalProps {
  onPathSelected: (path: string) => void;
}

const PATHS = [
  {
    key: "novelist",
    title: "The Novelist",
    tagline: "I am building a world through long-form fiction.",
    icon: NovelistIcon,
  },
  {
    key: "authority",
    title: "The Authority",
    tagline: "I am sharing knowledge and truth through non-fiction.",
    icon: AuthorityIcon,
  },
  {
    key: "poet",
    title: "The Poet",
    tagline: "I am exploring emotion through verse and rhythm.",
    icon: PoetIcon,
  },
  {
    key: "storyteller",
    title: "The Storyteller",
    tagline: "I am mastering the art of the short story.",
    icon: StorytellerIcon,
  },
];

function NovelistIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M24 6L26 28L24 42L22 28L24 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 6C24 6 20 12 18 18C16 24 22 28 24 28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M24 6C24 6 28 12 30 18C32 24 26 28 24 28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <ellipse
        cx="24"
        cy="42"
        rx="2"
        ry="1"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function AuthorityIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle
        cx="20"
        cy="20"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="27"
        y1="27"
        x2="38"
        y2="38"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="18"
        x2="26"
        y2="18"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="14"
        y1="22"
        x2="24"
        y2="22"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

function PoetIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <path
        d="M30 4C30 4 34 8 34 14C34 20 30 24 28 28C26 32 26 36 26 40"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M30 4C30 4 26 10 24 16C22 22 24 26 26 28"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M30 4C30 4 22 8 18 14C14 20 16 24 20 26"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M34 14C34 14 36 12 38 14C40 16 38 18 36 18"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M26 40L24 44"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

function StorytellerIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      <circle
        cx="24"
        cy="24"
        r="16"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="24"
        cy="24"
        r="2"
        fill="currentColor"
      />
      <line
        x1="24"
        y1="24"
        x2="24"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="24"
        x2="30"
        y2="28"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="10"
        x2="24"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="24"
        y1="36"
        x2="24"
        y2="38"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="24"
        x2="12"
        y2="24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="24"
        x2="38"
        y2="24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="8"
        r="1.5"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
}

export default function PathSelectionModal({ onPathSelected }: PathSelectionModalProps) {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = async (pathKey: string) => {
    setSelecting(pathKey);
    try {
      const res = await fetch("/api/student/author-path", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathKey }),
      });
      if (res.ok) {
        setConfirmed(true);
        setTimeout(() => {
          onPathSelected(pathKey);
        }, 1200);
      }
    } catch (err) {
      console.error("Error selecting path:", err);
    } finally {
      if (!confirmed) setSelecting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: "pathBackdropIn 400ms ease-out forwards" }}
    >
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-4xl mx-4 rounded-lg overflow-hidden"
        style={{
          background: "#FDFBF7",
          border: "1px solid rgba(60, 56, 49, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          animation: "pathFolioIn 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        <div className="relative px-8 pt-10 pb-8 sm:px-12">
          <div
            className="mx-auto mb-8"
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(60,56,49,0.3), transparent)",
              animation: "ruleExpand 600ms ease-out 200ms both",
            }}
          />

          <h2
            className="text-center mb-2"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1.75rem",
              fontWeight: 500,
              color: "#3C3831",
              letterSpacing: "-0.01em",
              animation: "pathTextIn 500ms ease-out 300ms both",
            }}
          >
            The Induction
          </h2>

          <p
            className="text-center mb-10 max-w-xl mx-auto"
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: "1.125rem",
              color: "#5C5647",
              lineHeight: 1.7,
              animation: "pathTextIn 500ms ease-out 400ms both",
            }}
          >
            The foundation is laid. Now, choose the nature of your legacy.
          </p>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            style={{ animation: "pathTextIn 500ms ease-out 500ms both" }}
          >
            {PATHS.map((path) => {
              const isActive = selecting === path.key;
              const isConfirmedPath = confirmed && selecting === path.key;
              const IconComponent = path.icon;

              return (
                <button
                  key={path.key}
                  onClick={() => !selecting && handleSelect(path.key)}
                  disabled={!!selecting}
                  className="group relative flex flex-col items-center text-center rounded-lg transition-all duration-300"
                  style={{
                    padding: "1.5rem 1rem",
                    background: isConfirmedPath
                      ? "rgba(60, 56, 49, 0.08)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(60, 56, 49, 0.3)"
                      : "1px solid rgba(60, 56, 49, 0.08)",
                    cursor: selecting ? "default" : "pointer",
                    opacity: selecting && !isActive ? 0.4 : 1,
                    transform: isConfirmedPath ? "scale(1.02)" : undefined,
                  }}
                >
                  <div
                    className="mb-4 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: "#3C3831" }}
                  >
                    <IconComponent className="w-12 h-12 sm:w-14 sm:h-14" />
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "#3C3831",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {path.title}
                  </h3>

                  <p
                    style={{
                      fontFamily: "'EB Garamond', Georgia, serif",
                      fontSize: "0.875rem",
                      color: "#5C5647",
                      lineHeight: 1.5,
                    }}
                  >
                    {path.tagline}
                  </p>

                  {isActive && !confirmed && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-stone-50/80">
                      <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {isConfirmedPath && (
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-lg"
                      style={{
                        background: "rgba(253, 251, 247, 0.9)",
                        animation: "pathTextIn 300ms ease-out forwards",
                      }}
                    >
                      <div className="text-center">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto mb-2" fill="none" stroke="#3C3831" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span
                          style={{
                            fontFamily: "'EB Garamond', Georgia, serif",
                            fontSize: "0.875rem",
                            color: "#3C3831",
                          }}
                        >
                          Path chosen
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="mx-auto mt-8"
            style={{
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(60,56,49,0.15), transparent)",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes pathBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pathFolioIn {
          from { opacity: 0; transform: translateY(30px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ruleExpand {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes pathTextIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes pathBackdropIn { from, to { opacity: 1; } }
          @keyframes pathFolioIn { from, to { opacity: 1; transform: none; } }
          @keyframes ruleExpand { from, to { transform: scaleX(1); } }
          @keyframes pathTextIn { from, to { opacity: 1; transform: none; } }
        }
      `}</style>
    </div>
  );
}
