{panel:title=Background|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
{*}What{*}: Wire the "Add Proposed Deviation" modal's manual entry form to the live POST /v1/protocol_deviations API, replacing the current local-state mock.
{*}Why{*}: The POST API is live on sandbox. The UI currently generates a DEV_XXX ID client-side and stores the record in local state only (see AddProposedDeviationContext.tsx — addDeviation()). This story replaces that mock with a real API call so deviations are persisted on the server and the PD ID comes from the backend (MCC-1481236)
{panel}
{panel:title=Repository|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
+protocol-deviation-ui+

Reference: src/services/appApi.ts, AddProposedDeviationContext.tsx, ManualDeviationContent.tsx
{panel}
{panel:title=Requirement|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
 * Add createProtocolDeviation(payload) to ts calling POST /v1/protocol_deviations
 * Replace local addDeviation() in tsx with the real API call
 * Map UI form fields to API body: site_uuid, patient_uuid, visit_name, details_text (min 10 chars), optional pdap_uuid
 * Display the pd_id from the 201 response in the success state
 * On 422, surface validation errors per field
 * On success, invalidate the React Query cache for the PD list so the In Progress view refreshes{panel}
{panel:title=Impacted Modules|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
 * PIR Protocol Integrity Report{panel}
{panel:title=UX Mock-ups|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
Figma - [https://www.figma.com/design/bPkBEY0GbDrmruQouQKWMP/Protocol-integrity-report--PIR-] 

("Add proposed deviation" button, top-right of Protocol Integrity Report page)
BDR - [https://learn.mdsol.com/pages/viewpage.action?spaceKey=CSAandPatientProfiles&title=Protocol+Integrity+Report+BRD+MVP] 
{panel}
{panel:title=Architectural Change|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
No
{panel}
{panel:title=Test Plan|borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
 # Verify POST /v1/protocol_deviations called on Submit with correct payload.
 # Verify PD ID from 201 response displayed in UI.
 # Verify 422 validation errors surfaced per field.
 # Verify In Progress list refreshes after successful create.
 # Verify details_text minimum of 10 chars enforced client-side before submit.{panel}
{panel:title=Acceptance Criteria |borderStyle=solid|borderColor=#cccccc|titleBGColor=#add8e6|bgColor=#fefaf8}
 * *AC 01* – Submit calls POST /v1/protocol_deviations with form data; local addDeviation() mock is removed.
 * *AC 02* – After successfully creating on PD redirect to main Index page.
 * *AC 03* – 422 errors are surfaced on the relevant form fields.
 * *AC 04* – details_text minimum 10 chars validated client-side before the API call is made.
 * *AC 05* - details for Site, Patient are on place. Visit API data related approach is not yet finalized. {panel}