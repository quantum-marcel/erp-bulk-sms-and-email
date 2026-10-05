The frontend contract is based on the supplied ERP Mass Mailer & SMS API 3.4.0 specification in `backend-openapi.json`.

After replacing that specification with a backend release:

1. Run `npm run api:generate` to regenerate `src/types/backend.ts`.
2. Run `npm run api:check`, `npm test`, and `npm run build`.
3. Review new endpoints and changed defaults as well as compiler errors. Generated types cannot verify runtime business rules or undocumented responses.

Campaign, domain, company, SMS configuration and email configuration types use this contract. Email accounts support company-scoped creation, editing, deletion and connection tests. Campaigns retain the selected email account on edit and duplicate; null selects the backend default. Passwords are omitted when unchanged and cleared only by explicit request.

The campaign output schema omits `email_field` and `phone_field` although both request schemas accept them. Draft edits omit unknown field values to preserve the saved backend values. Duplicating a campaign cannot recover omitted values and uses the API defaults. The backend should expose these fields for exact duplication.

Auth and campaign-log responses have no defined response schema in this specification, so their existing response handling cannot be fully verified from OpenAPI. Odoo source provisioning, schema refresh, sync API keys and setup-status endpoints are not currently exposed as frontend administration screens; sync/webhook endpoints are integration endpoints. This update does not add those separate administration workflows.

Validation is local against the supplied contract; live backend connectivity and actual email/SMS delivery require integration testing against the deployment.

List views and searchable company/audience pickers request one `limit`/`offset` page at a time and use the response `total`. Search and filters reset to page one; stale responses are ignored, and deletion refreshes the current page with recovery when its last row disappears. Page sizes stop at the documented maximum of 200. Recipient preview endpoints already use offset-based paging.

Campaign tabs use exact API statuses (including running and completed_with_failures). Delivery-log search uses the backend contact/recipient-reference index; receipt filters use exact delivery_status values and retry_pending. Displayed log status counts are explicitly per-page. Sorting controls are disabled because the list endpoints do not accept sorting parameters. Dashboard totals come from bounded count queries, not the loaded pages. The dashboard campaign list follows backend ordering.

Workspace selection no longer preloads all campaigns and audiences. Admin company access and the company picker load bounded pages; a selected company outside the page is resolved individually, and the backend authorizes company selection. Complete-list store helpers remain available for callers explicitly requiring a full lookup, but rendered lists do not use them.

Admins automatically select the first company returned by the company list when signing in or when no valid selection exists. Selection requests a company-scoped token from the backend; subsequent refreshes preserve a valid selected company. Recipient preview tables hide the partner ID column.

User creation and updates include company access via `company_ids`. The supplied contract no longer exposes assignment POST/DELETE endpoints. Users manage access in the account dialog; `/assignments` redirects to `/users`. Since `UserOut` does not include memberships, editing first reads every page of the username-filtered assignment list and matches `user_id` exactly. Failed membership reads block saving. Company choices remain paginated, and selected IDs outside the current page stay visible. An empty selection sends `company_ids: []`. Confirm replacement/empty-list behavior against the deployment: OpenAPI specifies the field shape but does not describe PATCH replacement semantics.

Delivery logs expose one channel-aware status filter, using the same mapping as row badges and retry eligibility. Successful email sends display Sent; successful SMS sends without confirmed delivery display Accepted. Explicit delivery confirmation takes precedence; failed sends with stale pending receipts remain Failed and retryable. A queued retry is Pending and cannot be submitted again. The supplied contract has no unified status parameter, so selecting a status reads all search-matching pages, normalizes and filters them, then paginates with the matching total. All statuses uses ordinary server pagination. This makes filtered requests more expensive for large logs; a backend normalized-status filter would remove that cost. The October 1 specification matches the checked-in contract and leaves log rows untyped, so these channel semantics still require deployment verification.

The October 2 supplied contract adds stale-partner cleanup preview/prune endpoints and `StalePruneIn`; these have no existing frontend callers. Company actions label SMS configuration as “SMS providers”. Quantum settings expose an optional webhook URL through `extra.webhook_url`, retaining other extra settings and omitting unchanged credentials. The contract documents POST `/webhooks/quantum-sms` as the delivery callback receiver but leaves `extra` untyped; verify that the deployed Quantum adapter uses `webhook_url` when sending messages.
