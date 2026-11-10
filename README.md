# 🌿 IP-SAKTI Sahayak (SIH 2026 — PS 26045)

> **A multilingual, RAG-based AI assistant for Intellectual Property and regulatory guidance in Ayurveda, across national and international regimes.**

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH-2026-orange.svg)](https://www.sih.gov.in/)
[![Ministry of Ayush](https://img.shields.io/badge/Ministry-AYUSH%20%2F%20AIIA-green.svg)](https://ayush.gov.in/)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph%20v1.2+-blue.svg)](https://langchain-ai.github.io/langgraph/)
[![Vector DB](https://img.shields.io/badge/Vector%20DB-Qdrant%20Cloud-red.svg)](https://qdrant.tech/)
[![Observability](https://img.shields.io/badge/Tracing-LangSmith-black.svg)](https://smith.langchain.com/)

---

## 📌 The Problem & Context

Ayurveda rests on thousands of years of codified traditional knowledge (TK). When Ayurvedic startups, researchers, Vaidyas, and cultivators attempt to protect and commercialize their products, they face a regulatory minefield:

1. **Inseparable IP & Drug Classification:** A classical formulation from the *First Schedule* texts faces the **Section 3(p) patent bar** and is protected by the **Traditional Knowledge Digital Library (TKDL)**. In contrast, an altered extract might qualify as a *phytopharmaceutical* or *proprietary medicine* requiring clinical trials under the Drugs & Cosmetics Act or FSSAI *Ayurveda Aahar* standards.
2. **Biodiversity & Anti-Biopiracy Gateways:** Commercial use of Indian bio-resources mandates Access and Benefit-Sharing (ABS) approval under Section 6 of the Biological Diversity Act from the **National Biodiversity Authority (NBA)** before any IPR application.
3. **Cross-Border Conflation:** Navigating domestic Indian laws versus international treaties (TRIPS, Nagoya Protocol, PCT, Madrid System, WIPO GRATK Treaty 2024) often leads to conflicting legal advice.

**IP-SAKTI Sahayak** solves this with an agentic, cited, and jurisdiction-isolated legal decision-support assistant.

---

## 💡 Core Innovations & Architecture

```
                                ┌────────────────────────────────────────┐
                                │          Incoming User Query           │
                                └───────────────────┬────────────────────┘
                                                    │
                                                    ▼
                                         ┌─────────────────────┐
                                         │   Guardrail Node    │ ──(is_safe=False)──► [ Instant Abstention ]
                                         └──────────┬──────────┘
                                                    │ (is_safe = True)
                                                    ▼
                                         ┌─────────────────────┐
                                         │   Agentic Router    │
                                         └──────┬───────┬──────┘
                       Path A (Direct / Memory) │       │ Path C (New Product)
                       ┌────────────────────────┘       ▼
                       │                    ┌─────────────────────────┐
                       │                    │ Formulation Classifier  │
                       │                    │   (HITL Subgraph)       │
                       │                    └───────────┬─────────────┘
                       │                                │
                       │  Path B (Contextual Follow-up) │
                       │  ┌─────────────────────────────┤
                       │  │                             │
                       │  ▼                             ▼
                       │ ┌───────────────┐   ┌────────────────────────┐
                       │ │Query Rewriter │   │      RAG Subgraph      │
                       │ └───────┬───────┘   │  • Multi-Source Router │
                       │         │           │  • Query Refiner       │
                       │         └──────────►│  • Async DB Search     │
                       │                     │  • Helper Injection    │
                       │                     └──────────┬─────────────┘
                       │                                │
                       ▼                                ▼
               ┌──────────────────────────────────────────────────────┐
               │                    Generator Node                    │
               │      (Statutory Synthesis, Citations & Disclaimer)   │
               └──────────────────────────┬───────────────────────────┘
                                          │
                                          ▼
                                       [ END ]
```

### 1. 🛡️ Perimeter Guardrail with Zero-Token Early Exit
* Evaluates incoming queries across 4 legal pillars (*Heritage & Biodiversity, Regulatory, Core IPR, Cross-Border*).
* Instantly filters out kitchen recipes, medical diagnosis requests, hypothetical court litigation strategy, and jailbreaks directly to `END` without wasting downstream LLM tokens (<300ms latency).

### 2. 🚦 3-Way Agentic Router
* **Path A (Memory-Only):** Direct synthesis bypass for summarization or simplification requests (zero vector database retrieval).
* **Path B (Query Rewriting):** Contextual pronoun resolution (*"How do I register it?"* $\rightarrow$ standalone legal query).
* **Path C (Formulation Classification):** Routes fresh inquiries to the formulation classifier.

### 3. 🔄 Human-In-The-Loop (HITL) Classification Subgraph
* Categorizes botanical products across **6 statutory categories**:
  * `classical`: Classical texts (First Schedule), TKDL defense, Section 3(p) bar.
  * `proprietary`: Patent & Proprietary (P&P) under DCA Section 3(h) / Rule 158B.
  * `new_drug`: Rule 122E, clinical safety & efficacy trials required.
  * `phytopharmaceutical`: Purified fractions with standardized markers.
  * `aahar_food`: FSSAI Ayurveda Aahar Regulations 2022 (no disease-cure claims).
  * `cosmetic`: DCA Rule 158B cosmetic licensing.
* **Native Interrupt Engine:** Uses LangGraph's `interrupt()` to cleanly pause execution and present interactive clarification cards in the UI without busy-wait loops, capped at 3 clarification attempts with dynamic `force_llm_classification` fallback.

### 4. ⚡ Scatter-Gather RAG Subgraph (10 Legal Namespaces)
* **Multi-Source Router:** Deterministic anchors + LLM intent mapping to partition searches across 10 Qdrant namespaces:
  `patents`, `designs`, `trademarks`, `copyright`, `geographical_indications`, `plant_varieties`, `biodiversity_abs`, `ayush_drug_regulations`, `fssai_ayurveda_aahara`, `traditional_knowledge`.
* **Parallel Query Refiner:** Rewrites search queries into the exact statutory vocabulary of each target act using `asyncio.gather()`.
* **Async DB Search:** Concurrently retrieves and deduplicates chunks from Qdrant Cloud.
* **Deterministic Helper Injection:** Zero-LLM hardcoded compliance alerts injected prior to synthesis (e.g., Section 3(p) TKDL bars, Section 6 NBA Form III approval, FSSAI Regulation 5 claim restrictions).

### 5. 🎯 Observable PromptOps & RAG Triad Evaluation
* Prompts dynamically loaded from **LangSmith Prompt Hub** with in-memory LRU caching and local offline fallbacks.
* Single-parent trace nesting capturing multi-turn HITL interruptions and resumes.
* Automated RAG Triad evaluation: **Context Relevance**, **Groundedness / Faithfulness**, and **Answer Relevance**.

---

## 🧱 Repository Structure

```
IP-SAKTI-SAHAYAK/
├── AI and Langgraph/                 # Core AI Orchestration Engine (Python 3.11)
│   ├── core/
│   │   ├── config.py                 # Environment loaders
│   │   ├── state.py                  # GraphState TypedDict definitions
│   │   ├── prompts.py                # LangSmith Prompt Hub dynamic loader + LRU cache
│   │   └── llm.py                    # Resilient fallback factory (Groq -> Google GenAI)
│   ├── nodes/
│   │   ├── guardrail.py              # Guardrail & Intent Assessor
│   │   ├── router.py                 # 3-Way Agentic Router
│   │   ├── query_rewriter.py         # Contextual Pronoun Resolver
│   │   ├── classifier.py             # Brain & HITL Clarification Nodes
│   │   ├── generator.py              # Citation & Confidence Synthesizer
│   │   └── rag/                      # Scatter-Gather Subgraph Nodes
│   ├── subgraphs/
│   │   ├── classifier_subgraph.py    # Decoupled Evaluator + Interrupt loop
│   │   └── rag_subgraph.py           # Multi-namespace retrieval pipeline
│   ├── eval/                         # LangSmith automated RAG Triad metrics
│   ├── graph.py                      # Main StateGraph orchestration
│   ├── main.py                       # CLI test harness with v3 streaming
│   ├── langgraph.json                # LangGraph Studio / CLI deployment spec
│   └── requirements.txt
│
├── backend/                          # Express + TypeScript API Gateway
│   ├── prisma/                       # PostgreSQL schema (Users, RefreshTokens, Chats, Messages)
│   ├── src/                          # Server entry, routing, and controllers
│   ├── services/                     # Sarvam AI translation & speech integration
│   └── package.json
│
├── frontend/                         # Modern React 19 Client
│   ├── src/
│   │   ├── components/
│   │   │   ├── ClarificationCard.tsx # HITL interactive clarification card
│   │   │   └── ThinkingPipeline.tsx  # Dynamic agent execution step visualizer
│   │   ├── ChatPage.tsx              # Progressive token streaming, citations drawer, jurisdiction toggle
│   │   └── Landing.tsx / Login.tsx   # Auth and onboarding screens
│   └── package.json
│
└── SIH-scraped-data/                 # Statutory Knowledge Engineering
    ├── Data Cleaning Scripts/        # 3-Stage ETL pipeline (Extract -> Chunk -> Filter)
    ├── cleaned_data/                 # Standardized JSON statutory chunks
    └── raw_data/                     # Raw Acts, Rules, Gazettes, and Treaties
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Markdown |
| **Frontend Streaming**| `@langchain/react` & `@langchain/core` (LangGraph SSE event streaming) |
| **Backend API** | Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL |
| **Authentication & Email** | JWT (Access + Refresh tokens), Bcrypt, Resend |
| **Indian Languages & Voice**| Sarvam AI (`sarvamai` SDK for speech-to-text and translation) |
| **AI Orchestration** | LangGraph v1.2+, LangChain, Python 3.11, Pydantic v2 |
| **LLM Inference** | Groq LPUs (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`) + Google GenAI (`gemini-3.8-flash`) |
| **Vector Database** | Qdrant Cloud (Cosine similarity, namespace-partitioned payload collections) |
| **Observability & PromptOps**| LangSmith (Unified Tracing, Prompt Hub, RAG Triad evaluation) |

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
* **Python 3.11** installed
* **Node.js 20+** and **npm** installed
* **PostgreSQL** database running (or Supabase/Neon connection string)
* Accounts & API keys for **Groq**, **Google AI Studio**, **Qdrant Cloud**, and **LangSmith**

---

### 2. AI Engine Setup (`AI and Langgraph/`)

```bash
cd "AI and Langgraph"

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Ensure your `.env` contains:
```env
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_key
LANGSMITH_API_KEY=your_langsmith_key
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=ip-sakti-sahayak
```

Run test scenarios via CLI:
```bash
python main.py
```

Or launch LangGraph Studio locally:
```bash
langgraph dev
```

---

### 3. Backend Gateway Setup (`backend/`)

```bash
cd ../backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate

# Start development server
npm run dev
```

---

### 4. Frontend Setup (`frontend/`)

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables (.env)
VITE_API_URL=http://localhost:5000
VITE_LANGGRAPH_API_URL=http://localhost:2024

# Start Vite dev server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## ⚖️ Legal Disclaimer

> **IP-SAKTI Sahayak is an automated decision-support and educational tool designed to assist with regulatory and IP guidance under the Ministry of Ayush framework. It does not provide legal advice, formal patent drafting, or clinical diagnosis. Users must consult a registered Patent Agent, legal counsel, or the relevant regulatory authorities before commercializing products or submitting statutory filings.**

---

## 👥 Team Code Monks
Built with dedication for **Smart India Hackathon 2026** (Problem Statement: **SIH26045**).
