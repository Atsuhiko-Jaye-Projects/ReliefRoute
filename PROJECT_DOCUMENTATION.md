# ReliefRoute project documentation

People to a Safer Tomorrow.  
Target location: Mogpog, Marinduque, Philippines.  
Type: frontend prototype for a Web Systems and Technologies final project.

## 1. Overview

ReliefRoute is a coordination and record-keeping site for a local disaster-relief desk. Staff can see relief requests, mark barangays that need follow-up, assign sample delivery routes, record what was distributed, watch stock, and read counts.

The site does not dispatch vehicles, assess damage, or replace the Municipal Disaster Risk Reduction and Management Office. Every sample record is labeled as a fictional demonstration scenario.

## 2. Problem statement

During relief operations, requests, priority lists, and delivery notes are often kept in separate messages and paper lists. A small municipal team can lose track of which barangay is still waiting, which goods already left the stockroom, and how many families a delivery was meant to reach.

ReliefRoute puts those records in one browser application so a class demonstration can show the flow from request, to priority area, to route, to distribution.

## 3. Objectives

1. Keep relief requests in one list with a reference number, barangay, date, assistance type, family count, priority, and status.
2. Show which sample areas are waiting, scheduled, or already served.
3. Record delivery assignments and whether goods are still pending or already delivered.
4. Count families from the stored requests and families served from distribution records.
5. Give administrators a dashboard and a report that recalculate from those records.
6. Let a barangay representative see and update only the records the prototype allows.
7. Keep the layout usable on a phone, a tablet, and a desktop.

## 4. Scope and limitations

In scope:

- Seven HTML modules plus a public landing page and a login page.
- Sample data for a fictional November 2026 operation in Mogpog.
- Add, edit, search, filter, and (where the role allows) delete records.
- Persistence in `localStorage`, plus JSON and CSV download.

Out of scope, and not pretended:

- Server accounts, hashed passwords, or protection against a user who edits the browser storage.
- Writing changes back into the JSON files. The browser cannot do that. Export downloads a copy instead.
- Official hazard maps, road distances, travel times, or live GPS.
- Automatic change of a request’s status when a linked delivery is marked delivered.
- Returning stock when a delivery is cancelled. Stock is reduced only when the user checks the deduction box and saves a Delivered or Partially Delivered record that has not already been deducted.
- Real resident data. Names in the user file are demo labels such as “Demo Administrator” and “Delivery Team A (sample)”.

## 5. Users and access

| Role | Demo username | Interface |
| --- | --- | --- |
| Administrator | `admin` | All modules, user accounts, import, delete requests, restore samples |
| Relief Coordinator | `coordinator` | Requests, areas, routes, distribution, inventory, reports. No user administration |
| Barangay representative | `brgy.balanacan`, `brgy.bintakay` | Own barangay requests. Can add a request and edit it only while it is Pending or Under Review. Can view related areas and distributions. Cannot set status, remarks, or coordinator, and cannot import |

The signed-in user id is stored in `sessionStorage` under `rr_session_user`. Closing the tab clears it. Refreshing the tab keeps it.

`assets/js/app.js` hides links and blocks a page when `RR.can(permission)` is false. This is a demonstration of role-based navigation. It is not production authentication. The footer of each signed-in page says the prototype is not an official emergency system.

## 6. Functional requirements

### Relief requests

- Create a request with a new id `RR-YYYY-NNN`.
- Store barangay, request date, category, affected families, description, priority, status, submitted-by user, assigned coordinator, and remarks.
- Status values: Pending, Under Review, Approved, In Progress, Completed, Rejected.
- Priority values: Low, Medium, High, Critical.
- Search, filter, sort, view, edit, and delete (delete is administrator only).
- Reject a save that is missing a barangay, a category, a whole number of families from 1 to 20000, or a description shorter than 10 characters.

### Priority areas

- Create and edit an area with id `PA-NNN`.
- Store barangay, location text, affected families, description, priority, assistance needed, status, last updated date, and an optional related request id.
- Status values: Needs Assessment, Awaiting Assistance, Assistance Scheduled, Assistance Delivered, Monitored.
- The related request must belong to the same barangay.
- Barangay representatives can view areas for their barangay and cannot open the manage form.

### Distribution

- Create a record with id `DS-NNN` and delivery reference `DLV-YYYY-NNN`.
- Store destination barangay, date, one or more goods with quantity and unit, personnel, families served, status, remarks, and optional request and route ids.
- Status values: Scheduled, Preparing, Out for Delivery, Delivered, Partially Delivered, Cancelled.
- Delivered and Partially Delivered require at least one family served.
- Linked request and route must name the same barangay as the distribution.
- Optional one-time inventory deduction.

### Routes, inventory, reports, users

- Routes store id `RT-NNN`, origin, destination barangay, personnel, supplies text, status, date, notes, and an optional distribution id. The map shows one pin at the PhilAtlas municipal point 13.4764, 121.8629. It does not draw a road path.
- Inventory stores item id, name, quantity, unit, reorder level, location, and last updated date. An item is low stock when quantity is less than or equal to the reorder level.
- Reports filter by date and barangay, chart status and priority, total goods from Delivered and Partially Delivered rows, and export JSON or CSV.
- Administrators can add and edit users, set a role, and activate or deactivate an account. A user cannot deactivate their own account or remove the last active administrator. User export includes the demo passwords and the page warns about that.

## 7. Non-functional requirements

- HTML5 structure, one custom stylesheet, Bootstrap 5.3.3 components.
- Viewport meta tag on every page.
- Sidebar from the `lg` breakpoint upward, and a Bootstrap offcanvas menu below that.
- Tables inside `table-responsive`.
- Modals use `modal-fullscreen-sm-down` so a small phone shows a full-screen form.
- Status is shown with a text label, not color alone. Charts are paired with a number list.
- Orange buttons use navy text so the label stays readable on `#F97316`.
- Destructive actions use a confirm dialog.
- Forms use labels, `novalidate`, and an error list. Invalid fields receive `aria-invalid`.

## 8. Technology choice

| Choice | Why it is used here | What was not used |
| --- | --- | --- |
| HTML, CSS, vanilla JavaScript | Matches a frontend subject and needs no build step | React, Vue, a Node server |
| Bootstrap 5 | Grid, forms, navbar, modal, offcanvas, and badges without a large custom stylesheet | A separate CSS framework |
| Fetch + JSON | Gives the class real sample records on first load | A database |
| localStorage | Keeps edits after refresh in this browser | PHP or MySQL writes |
| Chart.js | Draws the dashboard and report charts from the same arrays the tables use | Hardcoded chart numbers |
| Leaflet + OpenStreetMap | Shows a real map of the municipality | Invented distances or a routing API |

The comparison is about fit for this prototype. It is not a claim that these tools are better than a server application for a live operations center.

## 9. Architecture

```text
Browser page
  assets/js/app.js        shell, session, roles, shared UI
  assets/js/storage.js    load, save, import, export, activity log
  assets/js/<module>.js   that page's forms and tables
        |
        +-- localStorage keys rr_v1_<collection>
        |
        +-- first visit only: fetch data/<collection>.json
```

`RR.boot` reads the session, builds the sidebar, and then calls the page function. The page root stays hidden until the shell is ready, so a reader does not see an empty layout flash before the script runs.

Collections: `users`, `requests`, `areas`, `routes`, `distributions`, `inventory`, `activities`.

Activity rows are prepended and capped at 150. A new activity uses an ISO timestamp. The dashboard sorts activities with `Date`, because a text sort mixes `+08:00` sample times with UTC times from later edits.

## 10. How records connect

- A priority area may store `relatedRequestId`.
- A distribution may store `requestId` and `routeId`.
- A route may store `relatedDistributionId`.
- Saves check that linked records share the same barangay.
- Deleting a request does not delete the area or delivery that mentions it. The view screen still shows the link when the other record exists.

Dashboard family total adds `affectedFamilies` for every request whose status is not Rejected. The sample file’s non-rejected total is 281.

## 11. File map

| Path | Purpose |
| --- | --- |
| `index.html` | Public introduction and link to sign in |
| `pages/login.html` | Demo sign-in and account list |
| `pages/dashboard.html` | Counts, charts, recent requests, activity |
| `pages/relief-requests.html` | Core request log |
| `pages/priority-areas.html` | Core area list |
| `pages/distribution.html` | Core delivery and goods records |
| `pages/delivery-routes.html` | Route cards and map |
| `pages/inventory.html` | Stock and low-stock filter |
| `pages/reports.html` | Filters, charts, export, print |
| `pages/users.html` | Demo accounts |
| `assets/js/storage.js` | `ReliefStore` |
| `assets/js/app.js` | `RR` shell and permissions |
| `data/*.json` | Initial samples |

## 12. How to demonstrate

1. Open `http://localhost/systemmm/` through Apache or another local server.
2. Sign in as `admin` / `Admin@123` and read the dashboard counts.
3. Add a relief request and refresh the page. The new reference should still be there.
4. Open Distribution, edit a scheduled or out-for-delivery row, mark it Delivered, enter families served, and check the stock deduction. Then open Inventory.
5. Sign out. Sign in as `brgy.balanacan` / `Brgy@123` and confirm the list is only Balanacan.
6. Sign in as `admin` again and use Restore sample data before the next demonstration.

## 13. Test evidence

The checks that were actually run, including the widths that were measured, are in `docs/TESTING.md`. Screenshots taken during that session are in `docs/screenshots/`.

## 14. References used while building

- Republic Act No. 10121, Philippine Disaster Risk Reduction and Management Act of 2010, Official Gazette of the Republic of the Philippines. https://www.officialgazette.gov.ph/2010/05/27/republic-act-no-10121/
- PhilAtlas, “Mogpog, Province of Marinduque.” https://www.philatlas.com/luzon/mimaropa/marinduque/mogpog.html
- MDN Web Docs, “Fetch API” and “Window: localStorage property.” https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API and https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Bootstrap 5.3 documentation. https://getbootstrap.com/docs/5.3/getting-started/introduction/
- W3C, Web Content Accessibility Guidelines (WCAG) 2.2, 5 October 2023. https://www.w3.org/TR/WCAG22/
- Chart.js documentation. https://www.chartjs.org/docs/latest/
- Leaflet documentation and OpenStreetMap copyright. https://leafletjs.com/ and https://www.openstreetmap.org/copyright
