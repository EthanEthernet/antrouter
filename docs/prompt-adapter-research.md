# Build AntRouter's adapter as a cautious rewriter

**Bottom line:** the research supports a prompt adapter for AntRouter, with limits. Prompts really do behave differently across models: wording or format changes that keep the meaning can swing accuracy by tens of points, and prompts tuned for one model family lose ground on another. But the big published "prompt optimization" gains come from developer-time search loops that need labeled datasets and hundreds of LLM calls. That isn't what an in-browser, per-prompt tool can do. The approach that fits AntRouter is the one prompt-master and the vendor "improvers" use: a single LLM rewrite pass steered by a hand-maintained rulebook for each target model. It should make prompts sharper rather than longer, show the user a diff they can edit or undo, and skip prompts that are already clear. The main risk isn't weak gains. It's **intent drift**: the rewriter quietly adds constraints the user never asked for. Nobody has published a head-to-head study of moving prompts between commercial Claude, GPT and Gemini models, so AntRouter would need to measure its own adapter. That's a real contribution a class project could make.

## prompt-master is a rulebook, not an optimizer

The project people mean is **nidhinjs/prompt-master**, an MIT-licensed **Claude Skill** with about **13.9k stars and 1.6k forks**. It started in March 2026 and the latest commit was in August 2026 ([GitHub](https://github.com/nidhinjs/prompt-master)). It contains **no executable code**: just `SKILL.md` (about 500 lines) plus reference templates. Claude itself does the rewriting. The README lays out an 8-step flow:

1. Detect the target tool.
2. Extract 9 intent dimensions (task, input, output, constraints, context, audience, memory, success criteria, examples).
3. Ask at most 3 clarifying questions.
4. Pick a framework silently.
5. Apply only "safe" techniques (role, few-shot examples, XML, grounding).
6. Check model names against current docs.
7. Run a token-efficiency audit.
8. Output one copyable block plus a one-line note.

Its motto is "Most 'prompt generators' make prompts longer. This skill makes them sharper." ([README](https://github.com/nidhinjs/prompt-master)).

Per-model targeting is static text. For Claude it uses XML tags with documents before the query. For GPT it uses Goal/Context/Constraints/Done sections. For o3/o4-mini it keeps prompts short and drops "think step by step." It also refuses exotic techniques such as Tree of Thought because of "fabrication risk" ([SKILL.md](https://github.com/nidhinjs/prompt-master)). Two weaknesses matter for AntRouter:

- **The rules go stale.** The repo needs frequent "refresh routing" commits and a "recency gate," and some of its model lists lag current vendor docs.
- **Nobody has independently checked whether its rewrites actually perform better.**

Other user-facing tools work the same way: PromptPerfect, PromptJolt (one-click Enhance on ChatGPT, Claude and Gemini, with undo and history), and a fully local extension built on Chrome's Gemini Nano ([Chrome Web Store](https://chromewebstore.google.com/detail/egfkoabnngmnlkpofjihcpbilfbnldnb); [DEV](https://dev.to/harvesh_kumar/i-built-a-fully-local-prompt-enhancer-chrome-extension-with-gemini-nano-1m5m)). They compete on convenience. Most claim "model-specific" optimization without documenting what actually changes.

## Big optimization gains come from dataset loops AntRouter can't run

Academic automatic prompt optimization (APO) splits into two families. Only the second fits a live adapter.

| Family | Examples | Reported gains (as reported by the authors) | Needs | Fit for AntRouter |
|---|---|---|---|---|
| Developer-time search loops | APE, OPRO, ProTeGi, EvoPrompt, MIPRO, PromptWizard | OPRO: up to +8% GSM8K, up to +50% on BBH tasks ([arXiv](https://arxiv.org/pdf/2309.03409)); ProTeGi: up to +31% ([arXiv](https://arxiv.org/abs/2305.03495)); EvoPrompt: up to +25% BBH ([arXiv](https://arxiv.org/abs/2309.08532)); MIPRO: up to +13% ([arXiv](https://arxiv.org/abs/2406.11695)) | Task, metric, labeled dev set, many calls | Offline only, to tune AntRouter's own rewrite templates |
| Inference-time rewriters | BPO, PAS, FIPO, PRewrite | BPO: about +22% win rate on ChatGPT and +10% on GPT-4 ([ACL 2024](https://aclanthology.org/2024.acl-long.176)) | One extra generation per prompt | Yes, this is the adapter architecture |

**Caveat:** the APO numbers were not re-read from full text during the research and should be spot-checked before you quote them. They are also best-case results against weak human baselines on older models (PaLM 2, GPT-3.5). Expect much smaller margins on 2026 frontier models.

BPO is the closest academic match to AntRouter's idea. It trains a small rewriter, distilled from human preference data, that rewrites any user prompt for any black-box model. Its rewrites also tend to **make prompts longer** ([arXiv](https://arxiv.org/abs/2311.04155)).

The vendor tools follow the same split:

- **Anthropic's Prompt improver** reports a 30% accuracy gain on one classification test ([Claude](https://claude.com/resources/articles/prompt-improver)). That is a vendor-run example, not an independent benchmark.
- **OpenAI's Prompt optimizer** is dataset-driven and warns that an optimized prompt can do worse on some inputs. It is being deprecated along with Evals, which shut down Nov 30, 2026 ([OpenAI](https://developers.openai.com/api/docs/guides/prompt-optimizer)).
- **Google's Vertex optimizer** has a one-call zero-shot mode marketed partly for moving prompts to newer model versions ([Google forums](https://discuss.google.dev/t/vertex-ai-prompt-optimizer-new-algorithm-sdk-for-the-general-availability/253359)).

## Same meaning, different scores: why per-model rewriting is justified

Models are surprisingly sensitive to wording and format.

- **Mizrahi et al. (TACL 2024):** across 20 LLMs and about 5K paraphrases, changing one word ("excludes" to "lacks") shifted accuracy by **more than 60 points**, and model rankings changed significantly between paraphrases on **21 of 25 tasks** ([arXiv](https://arxiv.org/html/2401.00595v3)).
- **He et al. (2024):** GPT-4-32k scored **76.2 on HumanEval with plain text but 21.95 with JSON**. The best format for one model series barely overlapped with another's (IoU often below 0.2), though versions within the same sub-series agreed ([arXiv](https://arxiv.org/html/2411.10541v1)).
- **Sclar et al.:** reports swings of up to 76 points from formatting alone ([arXiv](https://arxiv.org/abs/2310.11324)). This figure was not verified during the research.

Prompts also transfer poorly across model families. In PromptBridge (a Dec 2025 preprint), a prompt optimized for GPT-5 scored **99.39% on GPT-5 but 68.70% on Llama-3.1-70B**, below Llama's own optimized prompt at 79.47%. A learned source-to-target mapping recovered part of that gap ([arXiv](https://arxiv.org/html/2512.01420v1)). MAPO found 20–30% gains from adapting prompts per model rather than only per task ([arXiv](https://arxiv.org/html/2407.04118v1)).

There is good news too. Frontier models are more robust: GPT-4-1106 showed no significant format effect on HumanEval. And **a single few-shot example cuts sensitivity sharply**, with diminishing returns after that ([POSIX](https://arxiv.org/abs/2410.02185); [ProSA](https://arxiv.org/abs/2410.12405)).

The takeaway for AntRouter: the adapter adds the most value **across families** (for example, a prompt written in ChatGPT habits going to Claude or Gemini) and little within a family. **No study measures transfer between today's Claude, GPT and Gemini models directly.**

## Vendors agree on basics but split on placement, examples and reasoning

All three vendors say the same core things: write clear and specific goals, separate the parts of a prompt with delimiters, remove contradictions, and drop CAPS/MUST emphasis. Anthropic warns that "CRITICAL: You MUST" causes overtriggering ([Anthropic](https://platform.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices)). OpenAI says "Be THOROUGH" backfires on GPT-5 ([OpenAI cheatsheet](https://cdn.openai.com/API/docs/gpt-5-for-coding-cheatsheet.pdf)). The differences are what the adapter's rule tables should encode:

| Rule | Claude | GPT (GPT-5.x / reasoning) | Gemini (3) |
|---|---|---|---|
| Structure | XML tags, descriptive names | XML-like tags or Markdown | Either one, used consistently |
| Long context | Documents on top, query last ("up to 30%" better) | GPT-4.1: repeat instructions top and bottom | Data first, instructions last; "Based on the above…" |
| Examples | 3–5, in `<example>` tags | Zero-shot first, few-shot if needed | "Always include" few-shot |
| Reasoning | "Think thoroughly" beats step lists | Define outcomes, not steps; tune reasoning_effort | Direct by default; ask explicitly for more detail |
| Gotchas | Prefill returns 400 on 4.6+; explain *why* behind rules | "Formatting re-enabled" turns markdown back on | Leave temperature at 1.0; avoid broad negatives |

Sources: [Anthropic](https://platform.claude.com/en/docs/build-with-claude/prompt-engineering/claude-prompting-best-practices), [OpenAI via Willison](https://simonwillison.net/b/8469), [GPT-5.5 summary (secondary)](https://aiengineerguide.com/til/openai-prompt-guidance-gpt-5-5/), [Google](https://ai.google.dev/docs/prompt_best_practices), [Vertex Gemini 3](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide). Some current OpenAI wording came from secondary summaries and should be checked against OpenAI's own pages.

Several items in the table (prefill, budget_tokens, temperature, reasoning_effort) are API-level controls. AntRouter hands prompts off to the consumer chat apps, where users can't change those settings. For handoff, only the text rules apply.

## A lightweight browser adapter AntRouter can ship

The design that follows from all of this:

1. **Run it after routing.** The router already picks the target, so the adapter just looks up that target's rule set. Keep the rules in a versioned JSON file per vendor, generated from the table above, so updates don't require code changes. This is prompt-master's model, but as data rather than prose.
2. **Use two tiers.**
   - **Free tier:** deterministic text transforms in JavaScript, with no LLM call and no latency. Examples: wrap pasted documents in XML for Claude, move the question below long context for Claude and Gemini, convert CAPS/MUST to plain imperatives, strip "think step by step" for reasoning targets.
   - **Opt-in "Enhance" tier:** a single LLM rewrite using a meta-prompt with the target's rules. It could use Chrome's on-device Gemini Nano for privacy and zero cost ([DEV](https://dev.to/harvesh_kumar/i-built-a-fully-local-prompt-enhancer-chrome-extension-with-gemini-nano-1m5m)), or a cheap hosted model.
3. **Guard against intent drift.** Show a side-by-side diff, keep the original one click away, and limit the meta-prompt to restructuring and clarifying. It should never invent new constraints, facts or personas. Like prompt-master, ask up to 3 clarifying questions instead of guessing.
4. **Skip when it won't help.** Pass short, specific prompts through untouched. Gains are concentrated in underspecified prompts, and rewriting already-clear ones mostly adds length.
5. **Set a length budget.** Reject a rewrite that grows past roughly 1.5x the original unless the user expands it. BPO-style rewriters tend toward verbosity ([arXiv](https://arxiv.org/abs/2311.04155)).
6. **Evaluate it yourself.** Build a small test set of 30–50 real student prompts. Compare original vs adapted outputs on each target using blind pairwise preference, and report results across several paraphrases, not single scores ([Mizrahi](https://arxiv.org/html/2401.00595v3)). Developer-time optimizers like PromptWizard or DSPy can then tune the adapter's own meta-prompt offline ([DSPy](https://dspy.ai/api/optimizers/MIPROv2/)).

## Conclusion

The research reframes the adapter's job. Its main value isn't squeezing benchmark points out of frontier models, which are getting more robust. It's **translating habits**: a prompt written the way ChatGPT likes isn't necessarily the way Claude or Gemini likes, and cross-family transfer is where the measured losses show up. That makes a rule-driven, transparent, undoable rewriter the right scope for a student project. It's cheap, it works in the browser, and you can explain why it made each change.

The open gap is evidence. No one has published Claude↔GPT↔Gemini transfer numbers for consumer chat prompts, and no one has measured intent drift in enhancer tools. If AntRouter logs whether users accept, edit or undo each rewrite, it gets a built-in quality signal, plus a defensible finding for the course write-up.
