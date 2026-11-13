# AI usage disclosure — ReliefRoute

This note is for the instructor and the project team. Replace the bracketed fields before submission.

## Tools

| Item | Detail |
| --- | --- |
| Tool | Cursor IDE |
| Model | Grok 4.7 |
| Session date | 10 November 2026 |
| Who started the session | [Student name] |
| Who reviewed the result | [Student name or names] |

No other AI tool was used to generate this repository.

## Prompt

The instruction given to the AI was the assignment brief titled **MASTER PROJECT PROMPT: RELIEFROUTE**. The team already has that brief. It asked for a frontend-only disaster-relief coordination prototype for Mogpog, Marinduque, with these constraints stated verbatim in the brief:

- HTML5, CSS3, Bootstrap 5, vanilla JavaScript, Bootstrap Icons, JSON files, Fetch API, and localStorage.
- No PHP, MySQL, Laravel, React, Vue, or Node.js backend.
- Roles: Administrator, Relief Coordinator, and Barangay Representative, with client-side restrictions that must be documented as insecure.
- Three working core modules: Relief Request Management, Priority Area Management, and Delivery and Distribution Tracking.
- Supporting modules: dashboard, delivery routes, inventory, reports, and user management.
- Brand colors Navy `#1E293B`, Red `#EF4444`, Orange `#F97316`, and light background `#F1F5F9`.
- Documentation, an AI disclosure, a contributions file, and test notes based on real results.

The AI was told to build a working prototype rather than a static layout, and to avoid invented disaster assessments, invented map distances, invented citations, and invented test passes.

## What the AI produced

The initial application in this repository was generated in that session:

- HTML pages in the project root and `pages/`
- `assets/css/style.css`
- `assets/js/` (storage, shared shell, and one script per module)
- Sample records in `data/`
- This disclosure, `README.md`, `PROJECT_DOCUMENTATION.md`, `CONTRIBUTIONS.md`, and `docs/TESTING.md`
- `docs/final-manuscript.md`, drafted from the implemented system

The AI also downloaded Bootstrap 5.3.3, Bootstrap Icons 1.11.3, Chart.js 4.4.6, and Leaflet 1.9.4 into `assets/vendor`. Those are third-party libraries, not AI-written code. Their licenses stay with the libraries.

Screenshots in `docs/screenshots/` were captured from the running app in the browser during the same session.

## How the output was checked

The following checks were done in the browser at `http://localhost/systemmm/` on 10 November 2026. Details and numbers are in `docs/TESTING.md`.

- Sign-in with a wrong password, an inactive account, the administrator, a barangay representative, and a coordinator opening the users page.
- Empty request form validation, then a saved request that was still present after refresh.
- A distribution status change that reduced inventory once.
- Dashboard totals before those edits, scoped barangay navigation, the route map, reports, and low-stock inventory.
- Page width checks at 320, 375, 430, 768, 1366, and 1920 pixels.
- Restore sample data, which returned the browser to the original JSON records.

A bug found during that session was fixed in code: the dashboard activity list compared timestamps as text, so a later UTC timestamp could sort below an earlier `+08:00` timestamp. The sort now uses `Date`. That correction was not rechecked in the interface after the sample data was restored.

## What the team must still do

The AI wrote the first draft. The team is responsible for the submitted work.

- [ ] Read every page and script and correct anything that does not match the instructor’s rubric.
- [ ] Run the demo accounts and the tests in `docs/TESTING.md` again.
- [ ] Replace bracketed names in this file, in `CONTRIBUTIONS.md`, and in the manuscript.
- [ ] Add the team’s own screenshots if the instructor wants captures from the team’s computer.
- [ ] Do not submit client-side role checks as if they were secure authentication.

## What the AI did not do

- It did not interview residents or use private personal data.
- It did not invent journal articles, authors, or research findings. Citations in the manuscript point to public laws, reference sites, and vendor documentation.
- It did not mark untested actions as passed. Creating a priority area, creating a route, downloading a CSV to disk, and using the print dialog were not completed as full interface tests.
