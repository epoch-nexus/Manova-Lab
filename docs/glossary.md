# Manova Labs — Project Glossary

This document establishes the official canonical vocabulary and definitions for the Manova Labs platform. All backend data contracts, frontend components, researcher tools, and participant runtime interfaces must adhere strictly to these terms without deviation.

---

### Core Entities & Concepts

#### 1. Experiment
The top-level research protocol configured and owned by a Researcher. An Experiment defines the full behavioral paradigm, including metadata (title, description), global configuration settings, instructional phases, and the ordered sequence of Trials that participants will undergo.

#### 2. Trial
The atomic, discrete unit of execution within an Experiment. A single trial encompasses a structured temporal episode: an optional pre-stimulus delay (e.g., fixation period), the presentation of one or more Stimuli according to configured timing parameters, a designated response window, and the capture of a participant's behavioral reaction.

#### 3. Stimulus
The perceptual item or sensory event presented to the participant during a Trial. Stimuli are typed entities (e.g., text, image, audio, video) with specific visual/auditory parameters and display properties (such as duration, positioning, styling, or content payload).

#### 4. Expected Response
The pre-configured criteria defined by the researcher for a given Trial specifying what participant inputs are admissible (e.g., specific keyboard keypresses, button clicks) and, where applicable, which specific input constitutes a "correct" response vs. an "incorrect" response.

#### 5. Participant Response
The empirical result and behavioral record captured from an actual human Participant during a specific Trial within a Session. It records the literal input submitted, timestamped onset and response markers, computed reaction time (RT) in milliseconds, evaluation of correctness against the Expected Response (if applicable), and client-side execution metadata.

#### 6. Session
An ephemeral, stateful execution instance of a Published Experiment conducted by a single anonymous Participant. A Session tracks participant progress through the experiment sequence, binds to an immutable snapshot of the experiment definition, stores participant responses, and progresses from initiation to completion or abandonment.

---

### Actors & Roles

#### 7. Researcher
An authenticated user who creates, edits, manages, publishes, and analyzes Experiments. Researchers own the study configurations, review collected trial results, and export analytical datasets.

#### 8. Participant
An anonymous individual who partakes in a Published Experiment via a shared deployment link. Participants interact through a lightweight browser interface without creating an account or authenticating, in compliance with IRB ethical guidelines and privacy-by-design standards.

---

### Engines & System Subsystems

#### 9. Execution Engine
The client-side state machine and coordination subsystem (scheduled for Phase 3) responsible for stepping through an experiment's protocol. It consumes the experiment snapshot, transitions between execution states (`instruction` → `trial` → `stimulus` → `awaiting-response` → `response-recorded` → `next-trial` → `complete`), and coordinates with the Timing Engine and network synchronization layers.

#### 10. Timing Engine
The high-precision client-side measurement subsystem (scheduled for Phase 4) that leverages browser APIs (such as `performance.now()`, `requestAnimationFrame`, and high-resolution input event timestamps) to present stimuli and record response latencies with sub-frame/millisecond-level accuracy while isolating client timing jitter.

---

### Logic & Progression Paradigms

#### 11. Randomization
The algorithmic reordering or dynamic selection of trials, stimulus presentations, or condition blocks to eliminate systematic order bias, learning effects, and confounding variables. (The configuration contract accommodates block definitions; runtime randomization logic is deferred to Phase 6).

#### 12. Conditional Branching
Dynamic routing logic where the subsequent trial or experimental block is determined at runtime based on participant performance (e.g., accuracy, reaction time thresholds, or survey choices) rather than static sequential progression. (The architectural seam is preserved via explicit trial transition pointers; evaluation logic is deferred to Phase 7).

---

### Lifecycle & State Transitions

#### 13. Draft
The mutable lifecycle state of an Experiment during creation and editing by a Researcher. In Draft state, all structural components (trials, stimuli, timings, instructions) may be modified freely. Participants cannot access or execute experiments in the Draft state.

#### 14. Published
The frozen, active lifecycle state of an Experiment. Publishing validates the full experiment schema, locks the configuration into an immutable version snapshot, generates a public participant access URL, and enables anonymous participants to initialize Sessions.

#### 15. Publishing
The formal transition process by which a Draft Experiment passes automated structural validation, is assigned a public access token/slug, and produces an immutable snapshot ready for participant ingestion. Attempts to publish an invalid or incomplete experiment are rejected with deterministic validation errors.
