# Khuôn kiểm chéo một unit

Bước này bắt buộc với nội dung mức A1–A2: người học chưa tự nhận ra câu sai, nên cần một model **khác** với model đã soạn đọc lại.

1. `npm run -s content:review -- <unit-id>` in ra prompt đã điền sẵn unit (không có id thì in danh sách unit chưa kiểm).
2. Dán vào model thứ hai (ví dụ Gemini, bản miễn phí ở aistudio.google.com).
3. Sửa theo các ý `must`, cân nhắc các ý `should`. Chạy `npm run content:check`.
4. Ghi vào unit: `"review": { "by": "<tên model>", "on": "<yyyy-mm-dd>", "note": "<đã sửa gì, nếu có>" }`.

Phần dưới đường kẻ là prompt (`content:review` tự điền `{{LEVEL}}`, `{{MAX_WORDS}}`, `{{UNIT}}`).

---

You are a careful English teacher and editor. Below is one lesson unit (JSON) for Vietnamese adults at CEFR {{LEVEL}}.
They cannot yet tell a wrong English sentence from a right one, so any mistake you miss, they will learn.

Check every English string (snippets, chunks, examples, models, scenario lines, pattern examples, sounds) and every Vietnamese string:
1. English is correct and natural: what a friendly native colleague would really say or write. Flag anything odd, too formal, or not idiomatic.
2. Level {{LEVEL}}: sentences of at most {{MAX_WORDS}} words, common words, no idioms or slang. Flag words a learner at {{LEVEL}} would not know without help.
3. Each chunk's `vi` and each `translationVi` / `exampleVi` / `sayVi` means the same as the English, in natural Vietnamese.
4. Each task: the models fit the task and the level; `points` list the ideas the task asks for; `hints` really help someone who is stuck.
5. The `pattern` is explained correctly (no wrong grammar rule); `sounds` tips are right for Vietnamese speakers.
6. Nothing is culturally odd, unkind, or assumes a gender, age or family situation without need.

Return ONLY JSON:
{"verdict": "ok" | "fix", "issues": [{"where": "<json path, e.g. snippets[1].text[0]>", "severity": "must" | "should", "problem": "<short>", "fix": "<the corrected text>"}]}
Return an empty "issues" list if everything is right. Do not rewrite things that are already correct.

Unit:
{{UNIT}}
