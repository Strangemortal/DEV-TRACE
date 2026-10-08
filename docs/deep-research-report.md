# Enhanced Telemetry Data & Metrics for DevTrace AI

## Current Telemetry Inventory  
DevTrace already logs rich session events: *focus lost/gained* (tab switches), *idle detected* (30+ sec breaks), *test results* (pass/fail on save), *hint received/clicked*, and *paste events*.  It also computes summary metrics like **Code Stability** (added vs deleted chars), **Independence Score** (penalizing hints), **Pasting Density**, **Trial‑Error Ratio** (failed attempts vs successes), and **External Focus Count** (tab-switches).  For example, a session might yield: total time, active coding time, hints used, and flags like “suspiciousPasting” or “highTrialAndError.” These lay the groundwork for analysis but can be greatly enriched.

## Industry & Research Insights  
**Industry practice** confirms the power of fine-grained telemetry. Coding platforms (CodeSignal, HackerRank, Coderbyte, etc.) capture dozens of signals – typing speed, copy/paste, tab switches, run attempts, code similarity – to flag integrity issues【4†L389-L397】【15†L191-L199】. For instance, CodeSignal’s *“Suspicion Score”* uses telemetry (typing bursts, paste events, unusual patterns) to detect AI-assisted cheating【4†L389-L397】. Coderbyte explicitly flags long tab-leave events or paste actions as cheating indicators【21†L48-L56】. Hackerrank likewise “tracks dozens of signals across coding behavior, submission, and question features” to identify anomalies【24†L176-L184】.  

**Academic research** similarly shows value in low-level coding behavior.  Casey (2017) found that adding *keystroke analytics* dramatically improved early pass/fail prediction in a programming course: e.g. timing between keystroke pairs (digraph latencies) and overall typing patterns offered stable, skill-related signals beyond mere effort【14†L1478-L1487】【14†L1496-L1504】. These studies also note that simple program complexity metrics (e.g. compressed code length) are strong predictors of success【14†L1478-L1487】.  Tools like CodeWatcher and CodeDive capture every insert/delete/copy/paste and focus shift to reconstruct the coding process【19†L149-L157】【28†L434-L442】. These insights suggest that adding similarly granular events will help the AI model see *how* users solve problems, not just if they succeed.

## Additional Telemetry Signals & Features  
To enrich our dataset, we should record finer-grained events and derive new features:

- **Keystroke Events:** Log every character insertion and deletion (as CodeWatcher does)【19†L149-L157】.  From these we can compute **typing speed** (chars/min), **digraph latencies** (time between key presses)【14†L1496-L1504】, and **edit bursts** (keystrokes in short intervals).  Fast bursts of typing versus slow measured typing may indicate copy-paste or uncertainty.

- **Clipboard & Paste Details:**  Besides flagging *that* a paste happened, record *what* was pasted (e.g. length of pasted text) and *when*. Calculate **pasting density** as pasted‐chars/total new‐chars.  Multiple large pastes (especially late in the session) are suspicious【28†L434-L442】【15†L191-L199】.

- **Idle/Burst Patterns:**  Log timestamps of all edits to measure **idle gaps** and **burstiness**.  For example, track sequences of continuous typing vs. prolonged pauses.  An unusually long pause (>30s) or many pause‐restart cycles may signal confusion or outside help.

- **Focus & Tab Events:**  Besides count of focus lost, measure *duration* of each focus loss event (how long away).  Track **focus ratio** = time on DevTrace / total session time.  Long or frequent task switches are risk factors【21†L48-L56】.

- **Hint Interaction:**  Record exactly which hints were shown, time until the user clicked or solved, and how much of each hint was consumed.  Derive a **hint latency** (time from hint received to click) and **hint abandonment rate** (shown but never clicked).  More granular hint behavior can refine the Independence Score.

- **Code Changes per Test:**  For each test run or “save,” log net code change from last run.  This yields a **trial-change metric**: whether the user made large rewrites after failures (suggesting guess-and-check) or small incremental edits.  The **Trial-and-Error Ratio** can be refined by weighting by edit size and time.

- **Code Complexity & Stability:**  Compute simple static metrics per milestone (e.g. lines of code, AST depth, or *compressed code length* as a proxy for complexity【14†L1478-L1487】).  Compare stability across solves: steady refactoring vs. wholesale rewriting.  A high **Stability Score** (few deletes, small incremental changes) often indicates confidence and skill.

- **Validation Signals:**  Log errors (compile/runtime messages), logs from the mock terminal, and number of times tests passed/failed.  For example, many failed test runs in a row may indicate struggling vs. a quick fix.

These additional signals build a multi-dimensional “behavioral fingerprint” of each session.  As CodeDive notes, features like “large code pastes” and “very short development times” are red flags for plagiarism【28†L434-L442】, so capturing them quantitatively is key.

## Scoring Algorithms & Label Derivation  
Using these features, we can define composite scores and labels for AI training:

- **Suspicion/Integrity Score:**  Inspired by cheating detectors, build a weighted score combining high-risk signals. For example, assign points for each large paste, each long focus loss, and each hint used.  Normalize to a 0–100 range (higher = more suspicious).  This “trust score” functions like CodeSignal’s Suspicion Score【4†L389-L397】.  Thresholds (e.g. >70) can flag sessions for review.  

- **Independence/Effort Score:**  Extend the current Independence Score by penalizing not just hints, but also number of external references (tab-switch events), and code stability (large code churn lowers score).  For instance, start at 100 and subtract weights for each hint (−5), each paste beyond an initial allowance (−X), each focus loss event (−Y), etc.  Calibrate weights so that a truly independent solve (no hints, no paste, one clear attempt) scores near 100, while heavy reliance on outside help yields a low score.

- **Trial-and-Error Ratio:**  Refine this as `failed_tests / total_tests`.  A high ratio (e.g. >50%) can indicate floundering or brute-force guesswork.  Such cases might get a higher “struggle flag.”  Conversely, few failures and steady progress suggest a **linear workflow** (as in the example “logicalWorkflow”: “Linear”).

- **Code Stability:**  Keep as `net_additions / (additions+deletions)`.  A low stability (<0.5) means many deletes – often true trial-and-error; a high stability (>0.9) means the solver mostly built on prior code with few rewrites.

- **Derived Labels:**  For supervised learning, we’ll need ground truth.  Label past sessions via instructor review or known outcomes (e.g. “cheating” vs “honest” or “high skill” vs “low skill”).  Then train models (e.g. classification or regression) on the rich telemetry features to predict those labels.  The scoring functions above can serve as *features* or even as initial label proxies.

- **Thresholds & Rubrics:**  Use research and industry benchmarks to set initial thresholds.  For example, flag a session if `pastingDensity > 0.5`【28†L434-L442】 or `focusLossCount > 3` (tuned on data).  Similarly, Coderbyte flags a “lengthy” tab leave; we might define that as >60 seconds away【21†L48-L56】.  These rules become part of the training labels or alerts.

## Validation & Calibration Plan  
To ensure these metrics meaningfully predict outcomes, we must validate them with data:

- **Data Collection:**  Instrument DevTrace to log the new events (character-level, focus durations, error logs, etc.) in a timestamped stream.  Gather a substantial dataset of sessions from real users.  Optionally, run controlled studies where some participants are allowed to use AI tools or given answers to simulate cheating, creating labeled examples.

- **Ground Truth Labeling:**  Assign “ground truth” outcomes for each session: correctness of final solution, quality of code, and integrity (was outside help used?).  This might involve expert review or known benchmarks.  Also record any manual flags or post-assessment quizzes that verify understanding.

- **Correlation Analysis:**  Compute how each new feature correlates with outcomes (e.g. does high paste-rate correlate with incorrect code? does low independence correlate with instructor doubts?).  Use statistical tests or feature importance in simple models to prune irrelevant signals.

- **Machine Learning Calibration:**  Split data into train/test sets.  Train classification/regression models (e.g. random forest) using the telemetry features to predict labels like “skill score” or “cheat risk.”  Evaluate accuracy (precision/recall on cheating detection, R² on score prediction).  Adjust feature weights and thresholds based on performance.  For example, Casey et al. found keystroke digraphs consistently improve accuracy【14†L1478-L1487】; similarly, keep or remove features based on validation gains.

- **Iterative Tuning:**  Perform A/B tests: vary one metric’s threshold and see if it changes reviewer judgments.  Collect feedback from hiring teams or instructors on flagged sessions to refine the scoring rubric.  Continuously update the model as new data comes in (to adapt to evolving tactics like new AI tools).

- **Ethical Checks:**  Monitor false positives (e.g. candidates who pasted a small allowed snippet or switched tabs to check official docs).  Ensure the model doesn’t unfairly penalize valid behaviors.  Adjust rules (for example, allow one short paste for boilerplate if it’s common, or detect benign tab switches) based on error analysis.

By expanding the telemetry to include **everything from raw keystrokes to edit diffs to focus intervals**, and by engineering composite scores grounded in research and industry practice【4†L389-L397】【14†L1478-L1487】, the AI model will have a far richer dataset.  This multi-dimensional view of user behavior—paired with careful labeling and validation—will greatly improve the model’s accuracy at assessing both *skill* and *integrity* in DevTrace sessions.  

**Sources:** We draw on industry reports and research for best practices. For instance, CodeSignal and HackerRank discuss telemetry-driven suspicion scoring【4†L389-L397】【24†L176-L184】; educational studies show keystroke patterns and code complexity predict performance【14†L1478-L1487】; and IDE-monitoring tools (CodeWatcher, CodeDive) exemplify capturing detailed events【19†L149-L157】【28†L434-L442】. These guided our design of richer telemetry and scoring methods.