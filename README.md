# ReliefRoute

People to a Safer Tomorrow.

ReliefRoute is a classroom prototype for coordinating disaster-relief records in Mogpog, Marinduque. Authorized users can record relief requests, mark priority areas, plan sample delivery routes, track distribution, watch inventory, and read reports.

It is an information tool. It does not replace official emergency procedures, professional damage assessment, or decisions of the local government.

## Run the project

The pages load JSON with the Fetch API. Open the site through a local web server. Opening the HTML files directly (`file://`) will fail to load the sample data.

With XAMPP, place this folder at `htdocs/systemmm` and open:

[http://localhost/systemmm/](http://localhost/systemmm/)

Sign in from **Open the demo**.

## Demo accounts

| Username | Password | Role | What you can do |
| --- | --- | --- | --- |
| `admin` | `Admin@123` | Administrator | Every module, including users and Restore sample data |
| `coordinator` | `Coord@123` | Relief Coordinator | Requests, areas, routes, distribution, inventory, and reports |
| `brgy.balanacan` | `Brgy@123` | Barangay representative | Balanacan requests, plus related areas and distributions |
| `brgy.bintakay` | `Brgy@123` | Barangay representative | Bintakay requests, plus related areas and distributions |
| `inactive.user` | `Inactive@123` | Coordinator | Account exists but cannot sign in |

Passwords are stored in plain text inside `data/users.json` and in this browser. That is acceptable only for a demonstration.

Role checks run in JavaScript in the browser. They show how the interface changes. They are not secure authentication. Anyone can edit localStorage and bypass them.

## What is saved

The first visit copies each JSON file into `localStorage`. Later adds, edits, and deletes stay in that browser and survive a refresh. They do not change the files in `data/`.

- **Export JSON / Export CSV** downloads the records currently shown by the filters.
- **Import JSON** replaces that whole collection in this browser after a confirmation. The file on disk stays the same.
- **Restore sample data** (administrator account menu) loads the original JSON files again.

Use a different browser, or restore the samples, when you want a clean demonstration.

## Modules

- Dashboard counts and charts are calculated from the stored records.
- Relief requests, priority areas, and distribution are the three core modules.
- Delivery routes use a sample origin at the municipal hall and a map pin for Mogpog. The map does not calculate road distance or travel time.
- Inventory can reduce stock when a distribution is saved as Delivered or Partially Delivered and the deduction box is checked. Stock is reduced once. Cancelling a delivery does not put stock back.
- Reports can be filtered by date and barangay, then exported or printed.

## Sample story

The records describe a fictional November 2026 relief operation. Barangay names are the public names of Mogpog’s barangays. The people, family counts, and needs are made up for class demonstration. Do not treat them as a real disaster assessment.

## Included libraries

These files are stored in `assets/vendor` so the interface works without a package install:

- Bootstrap 5.3.3 (MIT)
- Bootstrap Icons 1.11.3 (MIT)
- Chart.js 4.4.6 (MIT)
- Leaflet 1.9.4 (BSD 2-Clause)

The route map requests tiles from OpenStreetMap. Those tiles need an internet connection and are © OpenStreetMap contributors. The rest of the app does not need Google Fonts or a CDN.

## Project files

```text
index.html
pages/          login, dashboard, and each module
assets/css/     small custom stylesheet
assets/js/      shared storage, shell, and one script per module
assets/vendor/  Bootstrap, icons, Chart.js, Leaflet
data/           sample JSON
docs/           test notes, screenshots, manuscript
```

Read `PROJECT_DOCUMENTATION.md` for requirements, data fields, and how the modules connect. Read `docs/TESTING.md` for the checks that were actually run. Read `AI_DISCLOSURE.md` before submission.
# ReliefRoute
