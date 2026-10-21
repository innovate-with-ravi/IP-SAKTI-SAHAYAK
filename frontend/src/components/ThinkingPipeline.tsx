import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, Scale, BookOpen, ShieldCheck, Database, FileText, AlertTriangle } from "lucide-react";

export interface PipelineState {
  is_safe?: boolean;
  formulation_category?: string;
  selected_namespaces?: string[];
  retrieved_docs?: Array<{ title?: string; section?: string; score?: number }>;
  helper_warnings?: string[];
  final_answer?: string;
  confidence_score?: number;
}

interface ThinkingPipelineProps {
  isLoading: boolean;
  values?: PipelineState;
}

export function ThinkingPipeline({ isLoading, values }: ThinkingPipelineProps): ReactNode {
  const [expanded, setExpanded] = useState(false);

  // Compute completed / active stages based on state values
  const hasGuardrail = values?.is_safe !== undefined;
  const hasCategory = Boolean(values?.formulation_category);
  const hasNamespaces = Boolean(values?.selected_namespaces && values.selected_namespaces.length > 0);
  const hasDocs = Boolean(values?.retrieved_docs && values.retrieved_docs.length > 0);
  const hasWarnings = Boolean(values?.helper_warnings && values.helper_warnings.length > 0);
  const hasAnswer = Boolean(values?.final_answer);

  const steps = [
    {
      id: "guardrail",
      title: "Statutory Scope Gatekeeper",
      detail: hasGuardrail
        ? values?.is_safe ? "Passed - Legitimate Ayurvedic IPR / regulatory inquiry" : "Blocked - Out of scope"
        : "Checking legal scope...",
      done: hasGuardrail,
      active: isLoading && !hasGuardrail,
      icon: <ShieldCheck size={15} />,
    },
    {
      id: "classifier",
      title: "Regulatory Formulation Classifier",
      detail: hasCategory
        ? `Categorized: ${values?.formulation_category?.toUpperCase()}`
        : "Classifying DCA / FSSAI regulatory category...",
      done: hasCategory,
      active: isLoading && hasGuardrail && !hasCategory,
      icon: <Scale size={15} />,
    },
    {
      id: "router",
      title: "Multi-Source Statutory Router",
      detail: hasNamespaces
        ? `Mapped to ${values?.selected_namespaces?.length} statutory acts`
        : "Routing through Patents, Biodiversity, D&C, and TKDL...",
      done: hasNamespaces,
      active: isLoading && hasCategory && !hasNamespaces,
      icon: <BookOpen size={15} />,
    },
    {
      id: "rag",
      title: "Parallel Statutory Retrieval",
      detail: hasDocs
        ? `Retrieved ${values?.retrieved_docs?.length} legal provisions`
        : "Executing concurrent Qdrant searches...",
      done: hasDocs,
      active: isLoading && hasNamespaces && !hasDocs,
      icon: <Database size={15} />,
    },
    {
      id: "helper",
      title: "Compliance Rule Injection",
      detail: hasWarnings
        ? `Injected ${values?.helper_warnings?.length} mandatory compliance rules`
        : "Injecting statutory TKDL & ABS guidelines...",
      done: hasWarnings || hasAnswer,
      active: isLoading && hasDocs && !hasAnswer,
      icon: <AlertTriangle size={15} />,
    },
    {
      id: "generator",
      title: "Legal Guidance Synthesis",
      detail: hasAnswer
        ? "Completed synthesis with citations"
        : "Drafting structured legal advice...",
      done: hasAnswer,
      active: isLoading && (hasDocs || hasWarnings) && !hasAnswer,
      icon: <FileText size={15} />,
    },
  ];

  return (
    <div
      style={{
        margin: "10px 0 16px",
        background: "#ffffff",
        border: "1px solid rgba(11, 61, 145, 0.15)",
        borderRadius: "12px",
        overflow: "hidden",
        fontSize: "13px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
      }}
    >
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: isLoading ? "#f0f7ff" : "#fbfbfe",
          border: "none",
          borderBottom: expanded ? "1px solid rgba(11, 61, 145, 0.12)" : "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" color="#0b3d91" />
          ) : (
            <CheckCircle2 size={16} color="#138808" />
          )}
          <span style={{ fontWeight: 700, color: "#101c36" }}>
            {isLoading ? "Reasoning through Statutory Knowledge Graph..." : "LangGraph Statutory Pipeline Complete"}
          </span>
          {values?.formulation_category && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background: "#e0f2fe",
                color: "#0369a1",
                textTransform: "uppercase",
              }}
            >
              {values.formulation_category}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4d5b78" }}>
          <span style={{ fontSize: "12px" }}>{expanded ? "Hide Details" : "View Steps"}</span>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </button>

      {/* Expanded Step-by-Step details */}
      {expanded && (
        <div style={{ padding: "12px 16px", background: "#ffffff" }}>
          <div style={{ display: "grid", gap: "8px" }}>
            {steps.map((st) => (
              <div
                key={st.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: st.active ? "#f0fdf4" : "#fbfbfe",
                  border: st.active ? "1px solid #86efac" : "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      color: st.done ? "#138808" : st.active ? "#0b3d91" : "#94a3b8",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {st.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "13px" }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>
                      {st.detail}
                    </div>
                  </div>
                </div>

                <div>
                  {st.done ? (
                    <span style={{ color: "#138808", fontSize: "12px", fontWeight: 700 }}>✓ Done</span>
                  ) : st.active ? (
                    <span style={{ color: "#0b3d91", fontSize: "12px", fontWeight: 600 }}>In progress...</span>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>Waiting</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Namespaces & Warnings Summary if present */}
          {values?.selected_namespaces && values.selected_namespaces.length > 0 && (
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e2e8f0" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                Target Statutory Acts:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {values.selected_namespaces.map((ns) => (
                  <span
                    key={ns}
                    style={{
                      fontSize: "11.5px",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      fontFamily: "monospace",
                    }}
                  >
                    {ns}
                  </span>
                ))}
              </div>
            </div>
          )}

          {values?.helper_warnings && values.helper_warnings.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#b45309", marginBottom: "4px" }}>
                Mandatory Statutory Alerts:
              </div>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12px", color: "#92400e" }}>
                {values.helper_warnings.map((w, idx) => (
                  <li key={idx} style={{ marginBottom: "2px" }}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
