# nishkam-new-alevel
AQA A-Level Business (7138) — Nishkam School West London

## Accounts, homework and the tracker

- `tracker/` is the Cloudflare Worker for this site (`nishkam-tracker-7138`), copied from the 7132 tracker. It has its own D1 database, `nishkam-tracker-7138`. Secrets `TEACHER_PASSWORD` and `CONTENT_KEY` are set in Cloudflare only.
- `account.js` signs students in (username and password) and keeps their work in sync. Browser storage keys start with `n8_`, so they never mix with the 7132 site on the same github.io address.
- `course-tracker.html` is the teacher dashboard. `schedule.html` is the student's homework page.
- `conclusion-lab.html` is the Conclusion Lab: the student writes only the conclusion to a 9 or 15-mark question and gets a level. `conclusion-bank.js` holds its questions and paragraphs; homework questions stay locked there until their homework is due. Open `conclusion-lab.html?check=1` to run the marker check.
- `exam-bank.js` holds the weekly plan. `hw-bank.js` holds the 6, 9 and 15-mark homework questions and their case studies. `weekly/` holds the calculations and knowledge quizzes; `drill/` holds the data drills.
- No student data is kept in this repository.
