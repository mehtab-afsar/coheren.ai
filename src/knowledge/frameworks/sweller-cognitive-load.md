# Cognitive Load Theory — Sweller (1988) and Subsequent Research

## The Core Framework
John Sweller's Cognitive Load Theory (CLT) explains why instructional design profoundly affects learning outcomes independent of the learner's motivation or intelligence. The theory is grounded in working memory architecture: humans can process only 4 ± 1 elements simultaneously in working memory, and learning fails when this limit is exceeded — regardless of how well-structured the curriculum is at the content level.

Source: Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. Cognitive Science, 12(2), 257-285.

Review: Sweller, J., van Merriënboer, J.J.G., & Paas, F. (2019). Cognitive Architecture and Instructional Design: 20 Years Later. Educational Psychology Review, 31, 261-292.

## Working Memory: The Constraint That Governs All Learning
The fundamental constraint on learning is not intelligence or motivation — it is working memory capacity. Working memory holds approximately 4 elements simultaneously, processes them for roughly 20-30 seconds before decay, and cannot be enlarged through effort or training.

Long-term memory has effectively unlimited capacity and no decay constraint, but information only enters long-term memory via working memory consolidation. The bottleneck is always working memory.

Implication: every learning task produces cognitive load, and the educator's (or AI's) job is to ensure that load is invested in productive learning rather than wasted on irrelevant processing.

## The Three Types of Cognitive Load

**1. Intrinsic load**: The inherent complexity of the material itself, determined by element interactivity — how many concepts must be understood simultaneously to understand the content. Simple facts have low intrinsic load. Complex systems (code architecture, financial instruments, movement patterns) have high intrinsic load because understanding any element requires understanding its relationships to other elements.

Intrinsic load cannot be reduced without simplifying the content itself. It can be managed by sequencing: introduce isolated elements before their interactions.

**2. Extraneous load**: Load imposed by poor instructional design — not by the content itself. Examples: confusing explanations, split-attention format (diagram in one place, explanation in another), redundant information the learner already knows, irrelevant details.

Extraneous load competes with productive processing for the same working memory resources. High extraneous load is the most fixable cause of learning failure.

**3. Germane load**: Load devoted to schema formation and automation — the productive work of encoding patterns into long-term memory. Unlike extraneous load (wasted) and intrinsic load (unavoidable), germane load is the goal of instruction.

The equation: Intrinsic + Extraneous + Germane ≤ Working Memory Capacity. The design goal is to minimize extraneous load so maximum capacity is available for germane load given fixed intrinsic load.

## Key CLT Effects on Instructional Design

**Worked Example Effect**: Novices learn significantly better from studying worked examples (watching a solution) than from solving problems independently. When the problem space is unknown, independent problem solving consumes all working memory on search strategies, leaving nothing for schema formation. Worked examples provide the schema directly, allowing comparison and abstraction.

As expertise grows, the worked example effect reverses — experts learn better from solving problems independently (the expertise reversal effect). Novices need examples; experts need problems.

**Split Attention Effect**: Presenting related information in separate locations (diagram + caption, code + explanation on different screens) forces learners to mentally integrate information, consuming working memory on integration rather than learning. Physical or temporal integration of related information reduces extraneous load significantly.

**Redundancy Effect**: Providing information that is already understood creates extraneous load, not zero load. An expert receiving beginner-level explanations of concepts they already know learns worse than if the explanations were absent. Personalized scaffolding level matters; more is not better.

**Element Interactivity and Sequencing**: High element interactivity (complex system) should be introduced with artificially reduced interactivity first — isolate components, teach them in simpler contexts, only combine when individual elements are automated. This is the principle behind scaffolding and worked examples in complex domains.

## Cognitive Load and Time Pressure
TimeConstraint learners face a compound problem: short sessions reduce total working memory processing time, and if intrinsic load is high, less total processing occurs per session. The solution is not simply shorter tasks but lower intrinsic load per session:

- Break high-interactivity concepts into isolated components across multiple days
- Use worked examples + single-problem practice rather than independent problem sets
- Cap germane load per session (new schemas per day) — consolidation requires sleep, not more processing

Research finding: For high-complexity content, 4 worked examples over 4 days produces better transfer than 16 practice problems in a single day (Sweller & Cooper, 1985). Distributed worked examples > massed problem solving.

## The Expertise Reversal Effect
Instructions optimized for novices harm experts. As the learner progresses through a curriculum:
- Worked examples should gradually fade in favor of problem solving (example-problem pairs, then full problems)
- Scaffolding that was helpful early becomes extraneous load as the learner automates the scaffolded knowledge
- Task duration can increase as element automation reduces intrinsic load for equivalent content

This is the scientific basis for why curricula should dynamically adjust as the user progresses. Static task design ignores expertise accumulation.

## Application to AI Curriculum and Task Design

### Session Design Principles
1. **One new concept per session for high-complexity domains**: Coding, language, complex skills have high element interactivity. More than one new concept per session risks exceeding working memory capacity.

2. **Lead with worked example, follow with single practice problem**: The worked-example-problem pair is more effective than problem solving alone for any new concept type (Kalyuga et al., 2001).

3. **Estimate session cognitive load before assigning**: Duration alone is insufficient. A 20-minute task with 3 new interacting concepts is heavier than a 30-minute task revisiting a single known concept.

### Stone Calibration via CLT

**TimeConstraint stone**: Short sessions require low-to-moderate intrinsic load per session. Reduce element interactivity: isolate concepts into smaller atoms. Use micro-tasks that target single elements rather than integrated applications. Reserve integration challenges for longer sessions.

**Inconsistency stone**: Irregular sessions mean working memory schemas decay between sessions more than with daily practice. Increase use of worked examples relative to problem solving. Add brief retrieval cues at session start to reactivate relevant schemas before introducing new material.

**FearOfFailure stone**: Problem-solving failure when intrinsic load exceeds capacity is misattributed as personal inadequacy rather than design failure. Reduce intrinsic load until success rate is 70-80%, then gradually increase. Success at appropriate challenge level is corrective; repeated failure at excessive load reinforces avoidance.

### Difficulty Rating as CLT Calibration Signal
CLT predicts that difficulty ratings are primarily working memory load reports:
- Rating 5 (very hard): likely intrinsic load exceeding capacity → reduce element interactivity
- Rating 4: high load, on edge of capacity → maintain or reduce slightly
- Rating 3: load well-matched to capacity → optimal
- Rating 1-2: underload → increase intrinsic load by combining known elements into higher-interactivity tasks

### Multi-Session Schema Building
The unit of curriculum design is not the individual session but the schema-building sequence. A well-designed sequence:
1. Introduces element A in isolation (low intrinsic load)
2. Introduces element B in isolation
3. Presents worked example combining A+B (extraneous load minimized by integration)
4. Requires problem solving with A+B (germane load maximized, intrinsic load manageable)
5. Later sessions introduce element C, combine with now-automated A+B

Each phase completes before the next begins. Rushing this sequence — moving to combined elements before isolated elements are automated — is the primary cause of curriculum failure in self-directed learning.

## Evidence Summary for Coaching
- "Working memory holds ~4 elements; exceeding this halts learning regardless of motivation or effort" (Sweller, 1988)
- "Worked examples are more effective than problem solving for novices — up to 2x better retention" (Sweller & Cooper, 1985)
- "Splitting related information across locations costs ~20% of working memory capacity on integration" (Chandler & Sweller, 1991)
- "Scaffolding that helped beginners hurts experts — curriculum must adapt to expertise level" (Kalyuga et al., 2003)
- "For complex content, 4 sessions across 4 days outperforms 1 session of equivalent total duration" (cognitive load + sleep consolidation combined effect)
