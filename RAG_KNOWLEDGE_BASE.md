# CONSIST RAG Knowledge Base Plan

## Goal
Build a science-backed RAG system to power personalized habit coaching with evidence-based recommendations.

---

## Current Knowledge Library (AVAILABLE)

### Books (16 PDFs)
| Book | Author | Key Concepts for RAG |
|------|--------|---------------------|
| Atomic Habits | James Clear | 4 Laws, Habit Stacking, 1% Better |
| The Power of Habit | Charles Duhigg | Habit Loop (Cue→Routine→Reward) |
| Tiny Habits | BJ Fogg | Anchor + Tiny Behavior + Celebration |
| The Compound Effect | Darren Hardy | Small consistent actions compound |
| Thinking, Fast and Slow | Daniel Kahneman | System 1 vs System 2 thinking |
| Nudge | Thaler & Sunstein | Choice architecture, behavioral design |
| The Willpower Instinct | Kelly McGonigal | Self-control, willpower as muscle |
| Grit | Angela Duckworth | Passion + Perseverance |
| Drive | Daniel Pink | Autonomy, Mastery, Purpose |
| Mindset | Carol Dweck | Growth vs Fixed mindset |
| The ONE Thing | Gary Keller | Focus, priority setting |
| Getting Things Done | David Allen | Task management, capture system |
| Make Time | Jake Knapp | Highlight, Laser, Energize, Reflect |
| The Brain That Changes Itself | Norman Doidge | Neuroplasticity |
| Dopamine Nation | Anna Lembke | Dopamine, reward systems, balance |

### Research Papers (5 PDFs)
| Paper | Focus | Key Insights for RAG |
|-------|-------|---------------------|
| Ryan & Deci (2000) - SDT | Self-Determination Theory | 3 psychological needs: Autonomy, Competence, Relatedness |
| Neuroscience of Habit Formation (2024) | Neural mechanisms | Basal ganglia, dopamine, neuroplasticity |
| Carey et al. | Behavior change | Implementation strategies |
| Yurtkoru et al. (2017) | Motivation research | Applied motivation factors |
| Medical paper (1755-7682) | Health behaviors | Clinical habit interventions |

---

## Key Scientific Frameworks (From Your Sources)

### 1. Self-Determination Theory (Ryan & Deci)
**Three Innate Psychological Needs:**
- **Autonomy**: Feeling of choice and self-direction
- **Competence**: Feeling effective and capable
- **Relatedness**: Feeling connected to others

**For CONSIST AI:** Match tasks to user's autonomy level, celebrate competence growth, provide social connection features.

### 2. Neuroscience of Habits (Wyatt 2024)
**Key Brain Regions:**
- **Basal Ganglia**: Habit automation center
- **Prefrontal Cortex**: Conscious control (diminishes as habit forms)
- **Striatum**: Links environmental cues to motor responses
- **Dopamine System**: Reward encoding and reinforcement

**Habit Formation Factors:**
- Meditation increases cortical thickness → better habit control
- Sleep (REM) consolidates habit memory
- Exercise releases BDNF → enhances neuroplasticity
- Morning sunlight syncs circadian rhythm → better habit timing

### 3. The Habit Loop (Duhigg)
```
CUE → ROUTINE → REWARD
```
- Cue triggers the behavior
- Routine is the habit itself
- Reward reinforces repetition

### 4. Four Laws of Behavior Change (Clear)
1. **Make it Obvious** (Cue)
2. **Make it Attractive** (Craving)
3. **Make it Easy** (Response)
4. **Make it Satisfying** (Reward)

### 5. Tiny Habits (Fogg)
```
ANCHOR + TINY BEHAVIOR + CELEBRATION
```
- Attach new habit to existing routine
- Start incredibly small (2 minutes)
- Celebrate immediately after

---

## RAG Implementation Status

### Phase 1: Knowledge Base ✅ READY
- [x] 16 habit/psychology books collected
- [x] 5 research papers collected
- [x] Key frameworks identified
- [ ] Extract key passages into markdown chunks

### Phase 2: Text Extraction (NEXT STEP)
```python
# Tools needed:
pip install pymupdf  # PDF text extraction
pip install langchain
pip install sentence-transformers
```

**Extraction Strategy:**
1. Extract text from each PDF
2. Chunk into 500-token segments with 50-token overlap
3. Tag each chunk with:
   - Source (book/paper name)
   - Category (motivation, neuroscience, habit-loop, etc.)
   - Key concepts mentioned

### Phase 3: Embedding & Vector Store
```python
# Local embedding (free)
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')

# Vector store (local, no server)
import chromadb
client = chromadb.PersistentClient(path="./chroma_db")
```

### Phase 4: RAG Integration with Groq
```typescript
// In ChatOnboarding.tsx - enhance system prompt
const systemPrompt = `
You are a habit coach powered by behavioral science.

USER CONTEXT:
- Goal: ${goal}
- Energy: ${energyPattern}
- Skill: ${skillLevel}

SCIENTIFIC CONTEXT:
${retrievedChunks}

Use the research above to give personalized, evidence-based advice.
Cite sources when referencing specific techniques.
`;
```

---

## Personalization Mapping

| User Attribute | Relevant Science | RAG Query |
|---------------|------------------|-----------|
| Energy: Morning | Circadian rhythm, cortisol peak | "morning habits neuroscience" |
| Energy: Evening | Willpower depletion, relaxation | "evening routine habit formation" |
| Skill: Beginner | Tiny habits, 2-minute rule | "starting small habit beginner" |
| Skill: Advanced | Habit stacking, keystone habits | "advanced habit optimization" |
| Goal: Fitness | Exercise neuroplasticity, BDNF | "exercise habit brain benefits" |
| Goal: Learning | Spaced repetition, memory | "learning habit memory consolidation" |
| Struggling | Self-compassion, restart | "habit failure recovery motivation" |

---

## Sample RAG Prompts by Scenario

### When User Sets a New Goal:
```
Retrieve: "goal setting" + "{category}" + "implementation intentions"
Inject: Locke & Latham goal theory, SMART framework
```

### When User Misses Days:
```
Retrieve: "habit failure" + "self-compassion" + "restart"
Inject: Growth mindset (Dweck), fresh start effect
```

### When User Completes a Week:
```
Retrieve: "habit reward" + "celebration" + "dopamine"
Inject: Tiny Habits celebration, dopamine reward system
```

### When User Feels Unmotivated:
```
Retrieve: "intrinsic motivation" + "self-determination"
Inject: SDT (autonomy, competence, relatedness)
```

---

## Next Actions

### Immediate (To Build RAG):
1. [ ] Create `/src/rag/` folder structure
2. [ ] Write PDF extraction script (`extractPDFs.py`)
3. [ ] Generate embeddings for all books/papers
4. [ ] Set up Chroma vector store
5. [ ] Create retrieval function for Groq prompts

### Book Processing Priority:
1. **Atomic Habits** - Core habit framework
2. **Tiny Habits** - Behavior design
3. **Power of Habit** - Habit loop
4. **Self-Determination Theory paper** - Motivation science
5. **Neuroscience of Habit Formation** - Brain science

### Integration Points:
- `ChatOnboarding.tsx` - Inject science into goal coaching
- `taskGenerator.ts` - Science-backed task recommendations
- `WelcomeAnimation.tsx` - Motivational quotes from research
- New: `WeeklyReview.tsx` - Science-backed insights

---

## RAG Architecture

```
┌─────────────────┐
│  Knowledge Base │
│  (Markdown/PDF) │
└────────┬────────┘
         │ Chunk & Embed
         ▼
┌─────────────────┐
│  Vector Store   │
│  (Pinecone/     │
│   Chroma/Qdrant)│
└────────┬────────┘
         │ Semantic Search
         ▼
┌─────────────────┐
│  Groq LLM       │
│  + Retrieved    │
│    Context      │
└─────────────────┘
```

---

## Tech Stack Options

| Component | Free Tier Option | Production Option |
|-----------|------------------|-------------------|
| Embeddings | `all-MiniLM-L6-v2` (local) | OpenAI `text-embedding-3-small` |
| Vector DB | Chroma (local) | Pinecone / Qdrant Cloud |
| LLM | Groq (current) | Keep Groq |
| Chunking | LangChain | LlamaIndex |

---

## Implementation Steps

### Phase 1: Build Knowledge Base
- [ ] Create `/knowledge` folder in project
- [ ] Document 7 core frameworks as markdown
- [ ] Download 20 open-access papers (PubMed)
- [ ] Extract key insights into structured format

### Phase 2: Embedding Pipeline
- [ ] Install: `langchain`, `chromadb`, `sentence-transformers`
- [ ] Chunk documents (500 tokens, 50 overlap)
- [ ] Generate embeddings locally
- [ ] Store in Chroma (file-based, no server)

### Phase 3: RAG Integration
- [ ] Create retrieval function
- [ ] Inject context into Groq prompts
- [ ] Add source citations to responses

### Phase 4: Personalization Layer
- [ ] Match user profile to relevant research
- [ ] Energy pattern → chronobiology research
- [ ] Goal category → domain-specific studies
- [ ] Struggle patterns → intervention research

---

## Sample RAG Prompt Template

```
You are a habit coach powered by behavioral science research.

USER CONTEXT:
- Goal: {goal}
- Energy Pattern: {energy_pattern}
- Skill Level: {skill_level}
- Current Struggle: {struggle}

RELEVANT RESEARCH:
{retrieved_chunks}

Based on the research above, provide personalized advice for this user.
Cite the source when referencing specific techniques.
```

---

## Priority Papers to Find

1. "How are habits formed" - Phillippa Lally (2010)
2. "Self-Determination Theory" - Deci & Ryan
3. "Implementation Intentions" - Gollwitzer (1999)
4. "Behavior Change Technique Taxonomy v1" - Michie (2013)
5. "The Habit System" - Wendy Wood (2016)
6. "Goal Setting Theory" - Locke & Latham
7. "Willpower as Limited Resource" - Baumeister

---

## Folder Structure

```
/consist
  /src
    /knowledge
      /frameworks
        habit-loop.md
        tiny-habits.md
        four-laws.md
        com-b.md
      /research
        lally-2010-habit-formation.md
        michie-2013-bct-taxonomy.md
      /prompts
        coaching-system-prompt.md
    /rag
      embeddings.ts
      retrieval.ts
      vectorStore.ts
```

---

## Quick Start Commands

```bash
# Install dependencies
npm install langchain @langchain/community chromadb

# Or use Python for embedding pipeline
pip install langchain chromadb sentence-transformers
```

---

## Next Action
1. Create `/src/knowledge/frameworks/` folder
2. Document the 7 core frameworks
3. Set up Chroma vector store
4. Integrate with existing Groq calls
