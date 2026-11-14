# Khuôn soạn một unit

Dán toàn bộ phần dưới đường kẻ vào model soạn (Claude, Gemini…). Thay các chỗ `<…>`.
Kết quả là **nháp**: chạy `npm run content:check`, rồi kiểm chéo bằng model khác (`review.md`) trước khi dùng.

---

You write one lesson unit for FluentLoop, an app where Vietnamese adults learn English they can use at work.
Return ONLY one JSON object that matches the shape of the example unit below (same keys, same nesting).

Unit:
- id: `<track>-<topic>` (lowercase, a-z 0-9 -); every id inside must be unique in the whole app, so prefix them with the track (`core-…`).
- track: `<track id>` · level (cefr): `<A1 | A2 | B1>`
- topic: `<chủ đề, ví dụ: kế hoạch tuần tới>` · sentence pattern taught: `<ví dụ: going to / will>`
- learner: `<ví dụ: người đi làm ngành phần mềm, khoảng A2>`

Rules:
1. 3 snippets (short real texts: chat, email, meeting, phone, standup, conversation), 2 paragraphs each.
   Every snippet uses the pattern. Each has 3-4 chunks from the unit's chunk list that appear word for word in its text
   (or one of the chunk's `forms` does).
2. Sentence length: A1 at most 10 words, A2 at most 14, B1 at most 20. Common words only (top 2000) at A1-A2.
   No idioms or slang below B1. Names and places: Vietnamese colleagues (Linh, Nam, Mai) and an English-speaking one (Tom, Sarah).
3. chunks: what a learner reuses ("call you back", not "call"). `example` is a NEW sentence (not from the snippet);
   `answer` is the part of `example` that is blanked out. `vi` is natural Vietnamese, short.
4. One task per snippet (`snippet.task`). A task has: `promptVi` (what to write, in Vietnamese, one situation),
   `required` (1-2 chunks with variants), `models` (1-2 natural answers at the same level),
   `points` (the ideas a complete answer has, each with English `variants` a simple text search can find),
   `hints` exactly 2: [a guiding question in Vietnamese, the start of the answer in English ending with "…"], `tipVi` (one rule, no grammar terms).
5. `pattern`: titleVi, `forms` (the shapes, one per line), 3-4 `examples` {en, vi}, `noteVi` (the mistake Vietnamese learners make most).
6. `sounds`: 2-3 words from the snippets that Vietnamese speakers often say wrong, with `tipVi` (how to move the mouth, IPA allowed).
7. One scenario: partner (name, role), situationVi, goalVi, `persona` and `goal` in English for the AI,
   and a `script` of 3-4 nodes; every node but the last has 1-2 replies that point to the next node; the last has none.
8. Vietnamese: natural, friendly ("mình", "bạn"), no word-for-word translation.

Example unit (shape only, do not copy the content):
<dán một file unit có sẵn, ví dụ content/tracks/core/units/plan.json>
