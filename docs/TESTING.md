# ReliefRoute test notes

Tester: Cursor browser session during development.  
Date: 10 November 2026.  
Address: `http://localhost/systemmm/`.  
Method: the pages were opened, clicked, and measured. Results below are what that session showed. They are not a claim that every control was tested.

Sample data was changed during the tests and then restored with **Restore sample data**. After restore, this browser had 11 relief requests, rice quantity 80, and distribution `DS-001` status `Out for Delivery`.

## Functional checks

| Check | Result | What was observed |
| --- | --- | --- |
| First load seeds JSON | Pass | After clearing `localStorage` and `sessionStorage`, the users collection had 5 records. |
| Wrong password | Pass | Message: “Those credentials do not match a demo account.” |
| Inactive account | Pass | `inactive.user` showed that the demo account is inactive. |
| Administrator sign-in | Pass | Session user `USR-001`. Dashboard, before any edits: 11 requests, 2 pending, 2 approved, 2 critical areas, 281 affected families, 2 delivered distributions, 2 low-stock items. |
| Empty request form | Pass | Save was blocked. Messages named the barangay, assistance type, affected families (1 to 20000), and a situation of at least 10 characters. Those controls were marked invalid. |
| Add a request | Pass | Saved `RR-2026-012`, Guisian, Drinking water, 14 families, High, Approved. |
| Refresh keeps the request | Pass | Filter text `Guisian` and status Approved still showed “1 request”. |
| Update a distribution | Pass | `DS-001` / `DLV-2026-001` was set to Delivered, 40 families served, deduction checked. Status became Delivered and `inventoryDeducted` became true. |
| Inventory deduction | Pass | Rice went from 80 to 65, canned goods from 140 to 128, bottled water from 18 to 12. Other items stayed the same. The Out for Delivery filter then showed 0 rows. |
| Request status after delivery | Observed limitation | `RR-2026-001` stayed In Progress after `DS-001` was marked Delivered. The app does not change a request automatically. |
| Barangay representative | Pass | `brgy.balanacan` dashboard showed 1 request, 0 pending, 0 approved, 0 critical areas, 48 families, and 1 delivered distribution (after the delivery edit above). Navigation was Dashboard, Relief Requests, Priority Areas, and Distribution. |
| Barangay form limits | Pass | On a 320px-wide screen the request modal filled the viewport, the barangay was locked to Balanacan, staff fields were hidden, Import was hidden, and an In Progress request had no Edit button. |
| Users page for other roles | Pass | `users.html` for the barangay account and later for `USR-002` (coordinator) showed “This page is not available for your role.” Coordinator navigation omitted Users and included routes, inventory, and reports. |
| Priority areas list | Pass | Administrator saw 7 areas. |
| Delivery routes and map | Pass | 6 route cards. At 320px the map showed OpenStreetMap tiles and the note that distance is not calculated. |
| Reports | Pass | After the edits, with no date filter: 12 requests, 295 families, 3 delivered distributions, 97 families served. Goods included bottled water 14 cases and rice 15 sacks. Status counts were Pending 2, Under Review 1, Approved 3, In Progress 3, Completed 2, Rejected 1. |
| Low-stock filter | Pass | `inventory.html?low=1` showed Blankets (`INV-005`, 12 of 20) and Bottled water (`INV-003`, 12 of 24). |
| Restore sample data | Pass | Account menu opened a confirm dialog titled “Restore sample data?”. After **Restore samples**, requests were 11, rice was 80, and `DS-001` was Out for Delivery. |

## Not completed as interface tests

These controls exist in the code. They were not carried through in the browser, so this document does not mark them passed:

- Submitting a new priority area or editing one.
- Submitting a new delivery route.
- Confirming that Export CSV wrote a file to disk.
- Opening the browser print dialog from Reports.
- Signing in through the coordinator button and then editing a record. The coordinator role was checked by opening the users page as `USR-002`.

## Responsive checks

“No page overflow” means `documentElement.scrollWidth` was not greater than `clientWidth`. Wide tables sit inside `.table-responsive` and scroll inside the card. That is expected.

| Width × height | Page checked | Result |
| --- | --- | --- |
| 320 × 568 | Dashboard, requests, routes, reports, landing, inventory | No page overflow. Menu button visible. Route map rendered. |
| 375 × 667 | Relief requests | Width 375, no page overflow. Menu button visible. Filters stacked. Screenshot: `docs/screenshots/requests-mobile.png`. |
| 430 × 932 | Relief requests | Width 430, no page overflow. Menu button display was `block`. |
| 768 × 1024 | Priority areas | Width 768, no page overflow. Offcanvas menu opened and showed Close menu. |
| 1366 × 768 | Dashboard | Sidebar display `flex`, menu button `none`. Content width 1351 with the scrollbar. No page overflow. Screenshot: `docs/screenshots/dashboard-laptop.png` (taken while the test request and delivery edit were still saved: 12 requests, 295 families). |
| 1920 × 1080 | Dashboard | Sidebar `flex`, menu button `none`. Scroll width 1905 and client width 1905. No page overflow. No screenshot was saved at this size. |

Login was not measured as its own responsive pass. The landing page was included in the 320px check.

## Screenshot note

`dashboard-laptop.png` shows the dashboard after the functional edits and before restore. The clean sample dashboard figures are the ones in the table above (11 requests, 281 families, 2 delivered).
