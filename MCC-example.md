# MCC-1485014 — UI: Integrate "Add Proposed Deviation" Modal with POST /v1/protocol_deviations

**Issue Links:**
- MCC-1481236 [API]: Create Protocol Deviation Manually	ACCEPTED
- MCC-1451091 Create a new page for Protocol integrity report	ACCEPTED
- MCC-1484084 Spike: APIs to fetch dropdown values [Site, Patient, Visits]	ACCEPTED
- MCC-1497182 API: Align PDCreateRequest Schema with UI	ACCEPTED
- MCC-1485021 UI: Integrate Site, Patient and Visit APIs for PIR Dropdowns	COMPLETED

### Background
What: Wire the "Add Proposed Deviation" modal's manual entry form to the live POST /v1/protocol_deviations API, replacing the current local-state mock.
Why: The POST API is live on sandbox. The UI currently generates a DEV_XXX ID client-side and stores the record in local state only (see AddProposedDeviationContext.tsx — addDeviation()). This story replaces that mock with a real API call so deviations are persisted on the server and the PD ID comes from the backend (MCC-1481236)

### Repository
protocol-deviation-ui

Reference: src/services/appApi.ts, AddProposedDeviationContext.tsx, ManualDeviationContent.tsx

### Requirement
Add createProtocolDeviation(payload) to ts calling POST /v1/protocol_deviations
Replace local addDeviation() in tsx with the real API call
Map UI form fields to API body: site_uuid, patient_uuid, visit_name, details_text (min 10 chars), optional pdap_uuid
Display the pd_id from the 201 response in the success state
On 422, surface validation errors per field
On success, invalidate the React Query cache for the PD list so the In Progress view refreshes

### Architectural Change
No

### Impacted Modules
PIR Protocol Integrity Report
UX Mock-ups

Figma - https://www.figma.com/design/bPkBEY0GbDrmruQouQKWMP/Protocol-integrity-report--PIR- 

("Add proposed deviation" button, top-right of Protocol Integrity Report page)
BDR - https://learn.mdsol.com/pages/viewpage.action?spaceKey=CSAandPatientProfiles&title=Protocol+Integrity+Report+BRD+MVP

### Test Plan
Verify POST /v1/protocol_deviations called on Submit with correct payload.
Verify PD ID from 201 response displayed in UI.
Verify 422 validation errors surfaced per field.
Verify In Progress list refreshes after successful create.
Verify details_text minimum of 10 chars enforced client-side before submit.

### Acceptance Criteria
AC 01 – Submit calls POST /v1/protocol_deviations with form data; local addDeviation() mock is removed.
AC 02 – After successfully creating on PD redirect to main Index page.
AC 03 – 422 errors are surfaced on the relevant form fields.
AC 04 – details_text minimum 10 chars validated client-side before the API call is made.
AC 05 - details for Site, Patient are on place. Visit API data related approach is not yet finalized.

---
*Source: https://jira.mdsol.com/browse/MCC-1485014*