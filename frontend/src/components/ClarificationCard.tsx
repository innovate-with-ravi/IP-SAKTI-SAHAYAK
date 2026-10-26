import { useState, type ReactNode } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, HelpCircle, Sparkles } from "lucide-react";

export interface ClarificationPayload {
  type: string;
  questions: string[];
  attempt: number;
  reasoning?: string;
}

interface ClarificationCardProps {
  interrupt: {
    value?: unknown;
  };
  onRespond: (response: string) => void;
  isLoading?: boolean;
}

const CATEGORY_QUICK_PRESETS = [
  {
    label: "Classical Formulation",
    subtitle: "First Schedule / AFI text",
    snippet: "This is a classical formulation strictly following authoritative Ayurvedic texts (First Schedule of Drugs & Cosmetics Act, AFI). No modern extraction or synthetic additive.",
  },
  {
    label: "Proprietary Medicine",
    subtitle: "DCA Rule 158B",
    snippet: "This is a Patent or Proprietary (P&P) Ayurvedic medicine under Rule 158B with a unique ingredient ratio / modern excipient.",
  },
  {
    label: "Phytopharmaceutical",
    subtitle: "Standardized Fraction",
    snippet: "This is a purified, standardized botanical fraction with quantified bioactive markers, intended for DCGI clinical evaluation.",
  },
  {
    label: "Ayurveda Aahar",
    subtitle: "FSSAI Regulations 2022",
    snippet: "This is formulated as an Ayurveda Aahar food supplement / dietary product under FSSAI regulations, not for therapeutic disease claims.",
  },
  {
    label: "Ayurvedic Cosmetic",
    subtitle: "Skin / Hair cleansing",
    snippet: "This is an Ayurvedic cosmetic preparation under Rule 158B for beauty, skin rejuvenation, and cleansing without therapeutic medicinal claims.",
  },
  {
    label: "New Ayurvedic Drug",
    subtitle: "Clinical Trial Route",
    snippet: "This is a novel formulation with safety & efficacy clinical trials conducted according to Rule 122E requirements.",
  },
];

export function ClarificationCard({ interrupt, onRespond, isLoading }: ClarificationCardProps): ReactNode {
  const [answer, setAnswer] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Parse interrupt payload safely
  const payload = (interrupt.value as ClarificationPayload) || {
    type: "clarification_needed",
    questions: ["Please clarify your formulation category or intended use."],
    attempt: 1,
    reasoning: "Additional context needed for statutory compliance.",
  };

  const questions = Array.isArray(payload.questions) && payload.questions.length > 0
    ? payload.questions
    : ["Please provide more details on formulation origin, ingredients, and intended use."];
  const attempt = payload.attempt || 1;
  const reasoning = payload.reasoning;

  const handlePresetClick = (snippet: string, label: string) => {
    setSelectedPreset(label);
    if (!answer.trim()) {
      setAnswer(snippet);
    } else {
      setAnswer((prev) => `${prev.trim()}\n\n[Category]: ${snippet}`);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalAnswer = answer.trim() || selectedPreset || "Classical Ayurvedic formulation as described in classical texts.";
    onRespond(finalAnswer);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "16px auto",
        background: "linear-gradient(180deg, #fffcf5 0%, #fffbf0 100%)",
        border: "1.5px solid #f59e0b",
        borderRadius: "16px",
        boxShadow: "0 8px 24px rgba(217, 119, 6, 0.12)",
        overflow: "hidden",
        fontFamily: "var(--display, inherit)",
        animation: "authUp 0.35s ease both",
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)",
          borderBottom: "1px solid #fcd34d",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#b45309",
              color: "#ffffff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AlertCircle size={18} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 700,
                color: "#78350f",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Regulatory Clarification Required
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "#b45309",
                  color: "#ffffff",
                  letterSpacing: "0.04em",
                }}
              >
                ATTEMPT {attempt}/3
              </span>
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#92400e" }}>
              Human-in-the-Loop checkpoint · The agent needs your input to route through statutory legal acts.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#92400e",
            fontWeight: 600,
          }}
        >
          <Sparkles size={14} color="#b45309" />
          <span>Active Pause</span>
        </div>
      </div>

      <div style={{ padding: "20px 22px" }}>
        
        {/* Reasoning explanation */}
        {reasoning && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fffbeb",
              borderLeft: "3px solid #d97706",
              borderRadius: "4px",
              marginBottom: "16px",
              fontSize: "13.5px",
              color: "#92400e",
              lineHeight: 1.5,
            }}
          >
            <strong>Statutory Context:</strong> {reasoning}
          </div>
        )}

        {/* Targeted Clarifying Questions */}
        <div style={{ marginBottom: "18px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 700,
              color: "#451a03",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "10px",
            }}
          >
            Questions from the Regulatory Classifier:
          </label>
          <div style={{ display: "grid", gap: "8px" }}>
            {questions.map((q, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "10px 14px",
                  background: "#ffffff",
                  border: "1px solid #fed7aa",
                  borderRadius: "8px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#fef3c7",
                    color: "#b45309",
                    fontWeight: 700,
                    fontSize: "12px",
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid #fcd34d",
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ fontSize: "14px", color: "#292524", lineHeight: 1.5, fontWeight: 500 }}>
                  {q}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Statutory Category Chips */}
        <div style={{ marginBottom: "18px" }}>

          {/* Quick-Select Regulatory Category & Click to autofill header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#78350f",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <HelpCircle size={14} /> Quick-Select Regulatory Category:
            </span>
            <span style={{ fontSize: "11.5px", color: "#a16207" }}>Click to autofill</span>
          </div>

          {/* 6 chips */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "8px",
            }}
          >
            {CATEGORY_QUICK_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePresetClick(p.snippet, p.label)}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: isSelected ? "1.5px solid #d97706" : "1px solid #e7e5e4",
                    background: isSelected ? "#fef3c7" : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: isSelected ? "#92400e" : "#1c1917",
                      }}
                    >
                      {p.label}
                    </span>
                    {isSelected && <CheckCircle2 size={14} color="#d97706" />}
                  </div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: isSelected ? "#b45309" : "#78716c",
                      marginTop: "2px",
                    }}
                  >
                    {p.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Input Area */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "14px" }}>
            <label
              htmlFor="clarification-input"
              style={{
                display: "block",
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#451a03",
                marginBottom: "6px",
              }}
            >
              Your Clarification Response:
            </label>
            <textarea
              id="clarification-input"
              rows={3}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="E.g., It is based strictly on Sharangdhara Samhita with standard Kwatha decoction, no modern extracts added, but we have a custom glass bottle packaging..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1.5px solid #d4d4d8",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "#18181b",
                background: "#ffffff",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            {/* Best-Guess button */}
            <button
              type="button"
              onClick={() => onRespond("Proceed with single best-guess classification based on available information.")} // Pause a single word string 'guess' from here.
              // instead of prompting the classifier.py node to guess the best classification, jump to `force_llm_classification` of classifier.py 
              // like: [classifier.py#L200-209](textBlock;file:///d%3A/CODING/Hackathons/SIH/IP-SAKTI-SAHAYAK/AI%20and%20Langgraph/nodes/classifier.py#L200-209) 
              disabled={isLoading}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #d4d4d8",
                background: "#ffffff",
                color: "#71717a",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Force Best-Guess
            </button>

            <button
              type="submit"
              disabled={isLoading || (!answer.trim() && !selectedPreset)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 20px",
                borderRadius: "8px",
                border: "none",
                background: !answer.trim() && !selectedPreset ? "#d4d4d8" : "#0b3d91",
                color: "#ffffff",
                fontSize: "13.5px",
                fontWeight: 700,
                cursor: !answer.trim() && !selectedPreset || isLoading ? "not-allowed" : "pointer",
                boxShadow: !answer.trim() && !selectedPreset ? "none" : "0 2px 8px rgba(11, 61, 145, 0.25)",
                transition: "background 0.15s ease",
              }}
            >
              <span>{isLoading ? "Resuming Agent..." : "Confirm & Resume Workflow"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
