# opencode.ai prompts (use in order, test after each)

1. Visual polish (Design / Usability)
"Improve the visual design of public/ for a transport control-room: clear severity colours, larger notice clock, responsive layout, accessible labels. Keep all existing behaviour and API calls."

2. Nielsen heuristics pass (Usability)
"Review the UI against Nielsen's 10 heuristics. Add: visible system status after publish, confirmation before publishing HIGH/CRITICAL, clear error messages, undo-safe actions, and keyboard focus order. List what you changed."

3. SAP sandbox mode (Functionality)
"Set EHS_MODE=sandbox with SAP_API_KEY from the environment. Verify GET /api/sap/incidents returns real incidents and the 'Link SAP EHS incident' dropdown shows them. Do not log the key."

4. Optional PO
"Set PO_MODE=sandbox. Call GET /api/po/orders. If entity or field names differ from adapters/po.js, adapt the mapping and show the first result."

5. SC-06 review (only if time)
"Add a Review tab listing closed HIGH/CRITICAL incidents with a form for root cause and corrective actions (owner, due date). A review cannot close if an action lacks owner or due date. Store in data/db.json."

6. Demo data + export
"Make sure seeded demo incidents are labelled, README is up to date, and .env is not included."
