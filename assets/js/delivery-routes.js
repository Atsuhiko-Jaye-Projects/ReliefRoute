/**
 * Sample delivery routes. The map shows a published municipal reference
 * point only. It does not calculate distance or travel time.
 */
const DeliveryRoutes = (() => {
  const state = { editing: null };
  const steps = ["Scheduled", "Preparing", "Out for Delivery", "Delivered"];

  function recordForm() {
    return document.getElementById("recordForm");
  }

  function filtered() {
    const filters = document.getElementById("filterForm");
    const query = filters.q.value.trim();
    const status = filters.status.value;
    const barangay = filters.barangay.value;
    return ReliefStore.read("routes").filter((row) => {
      return RR.matchesQuery(row, query, ["id", "origin", "destination", "personnel", "supplies", "status", "notes", "relatedDistributionId"]) &&
        (!status || row.status === status) &&
        (!barangay || row.destination === barangay);
    }).sort((a, b) => String(b.scheduledDate).localeCompare(String(a.scheduledDate)));
  }

  function tracker(status) {
    if (status === "Cancelled") {
      return '<p class="mb-3">' + RR.statusBadge(status) + " This route will not be used.</p>";
    }
    const current = status === "Partially Delivered" ? "Delivered" : status;
    const index = steps.indexOf(current);
    return '<ol class="rr-steps" aria-label="Route progress">' + steps.map((step, stepIndex) => {
      const cls = index > stepIndex ? "is-done" : index === stepIndex ? "is-current" : "";
      const label = status === "Partially Delivered" && step === "Delivered" ? "Partial" : step;
      return '<li class="' + cls + '">' + RR.escapeHtml(label) + "</li>";
    }).join("") + "</ol>";
  }

  function render() {
    const rows = filtered();
    document.getElementById("resultCount").textContent = rows.length + (rows.length === 1 ? " route" : " routes");
    const list = document.getElementById("routeList");
    if (!rows.length) {
      list.innerHTML = '<div class="col-12"><div class="rr-card rr-empty"><i class="bi bi-signpost" aria-hidden="true"></i><p class="mb-0">No routes match these filters.</p></div></div>';
      return;
    }
    list.innerHTML = rows.map((row) => {
      return '<article class="col-12 col-xl-6"><div class="rr-card p-3 h-100"><div class="d-flex justify-content-between gap-2 align-items-start">' +
        "<div><h3 class=\"h6 mb-1\">" + RR.escapeHtml(row.id) + "</h3><p class=\"small text-secondary mb-2\">" + RR.escapeHtml(RR.formatDate(row.scheduledDate)) + "</p></div>" +
        RR.statusBadge(row.status) + "</div>" +
        '<p class="rr-route-line mb-2"><span class="rr-badge rr-badge-muted">' + RR.escapeHtml(row.origin) + '</span><i class="bi bi-arrow-right" aria-hidden="true"></i><span class="rr-badge rr-badge-high">' +
        RR.escapeHtml(row.destination) + "</span></p>" + tracker(row.status) +
        '<dl class="row small mb-2"><dt class="col-5">Personnel</dt><dd class="col-7">' + RR.escapeHtml(row.personnel) +
        '</dd><dt class="col-5">Supplies</dt><dd class="col-7">' + RR.escapeHtml(row.supplies) +
        '</dd><dt class="col-5">Distribution</dt><dd class="col-7">' + (row.relatedDistributionId ? '<a href="distribution.html?q=' + encodeURIComponent(row.relatedDistributionId) + '">' + RR.escapeHtml(row.relatedDistributionId) + "</a>" : "Not linked") +
        "</dd></dl><p class=\"small mb-3\">" + RR.escapeHtml(row.notes || "No notes.") + "</p>" +
        '<div class="d-flex flex-wrap gap-1"><button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="' + RR.escapeHtml(row.id) + '">Edit</button>' +
        '<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + RR.escapeHtml(row.id) + '">Delete</button></div></div></article>';
    }).join("");
  }

  function openForm(record) {
    const form = recordForm();
    state.editing = record ? record.id : null;
    form.reset();
    RR.showFormErrors(document.getElementById("formAlert"), []);
    RR.fillSelect(form.destination, RR.BARANGAYS, record ? record.destination : "", "Select a barangay");
    RR.fillSelect(form.status, RR.DELIVERY_STATUS, record ? record.status : "Scheduled", "");
    form.origin.value = record ? record.origin : "Mogpog Municipal Hall (sample staging point)";
    form.personnel.value = record ? record.personnel : "";
    form.supplies.value = record ? record.supplies : "";
    form.scheduledDate.value = record ? record.scheduledDate : RR.todayInput();
    form.notes.value = record ? record.notes || "" : "";
    const distributions = ReliefStore.read("distributions");
    form.relatedDistributionId.innerHTML = '<option value="">Not linked</option>' + distributions.map((row) => {
      return '<option value="' + RR.escapeHtml(row.id) + '"' + (record && row.id === record.relatedDistributionId ? " selected" : "") + ">" +
        RR.escapeHtml(row.deliveryReference + " · " + row.barangay) + "</option>";
    }).join("");
    document.getElementById("routeModalTitle").textContent = record ? "Edit delivery route" : "New delivery route";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("formModal")).show();
  }

  function save(user) {
    const form = recordForm();
    const data = {
      origin: form.origin.value.trim(),
      destination: form.destination.value,
      personnel: form.personnel.value.trim(),
      supplies: form.supplies.value.trim(),
      status: form.status.value,
      scheduledDate: form.scheduledDate.value,
      notes: form.notes.value.trim(),
      relatedDistributionId: form.relatedDistributionId.value
    };
    const errors = [];
    const invalid = [];
    if (data.origin.length < 3) { errors.push("Enter the origin."); invalid.push("origin"); }
    if (!RR.BARANGAYS.includes(data.destination)) { errors.push("Select a destination barangay."); invalid.push("destination"); }
    if (data.personnel.length < 3) { errors.push("Enter the assigned personnel."); invalid.push("personnel"); }
    if (data.supplies.length < 3) { errors.push("Enter the relief supplies for this route."); invalid.push("supplies"); }
    if (!data.scheduledDate) { errors.push("Enter the scheduled date."); invalid.push("scheduledDate"); }
    if (!RR.DELIVERY_STATUS.includes(data.status)) { errors.push("Select a status."); invalid.push("status"); }
    if (data.notes.length > 500) { errors.push("Keep notes to 500 characters or fewer."); invalid.push("notes"); }
    if (data.relatedDistributionId) {
      const linked = ReliefStore.getById("distributions", data.relatedDistributionId);
      if (!linked) errors.push("The linked distribution does not exist.");
      else if (linked.barangay !== data.destination) errors.push("Link a distribution for the same destination barangay.");
    }
    RR.markInvalid(form, invalid);
    RR.showFormErrors(document.getElementById("formAlert"), errors);
    if (errors.length) return;
    const payload = Object.assign({}, data, { updatedAt: new Date().toISOString() });
    let id = state.editing;
    if (id) ReliefStore.update("routes", id, payload);
    else {
      id = ReliefStore.nextNumberedId(ReliefStore.read("routes"), "RT-", 3);
      ReliefStore.add("routes", Object.assign({ id: id }, payload));
    }
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Updated a delivery route",
      detail: id + " to " + data.destination + " is " + data.status + ".",
      module: "routes",
      barangay: data.destination
    });
    RR.toast(id + " was saved.");
    bootstrap.Modal.getInstance(document.getElementById("formModal")).hide();
    render();
  }

  async function remove(user, id) {
    const ok = await RR.confirmAction({
      title: "Delete " + id + "?",
      message: "This removes the sample route from this browser. Linked distribution records stay in the distribution list.",
      confirmLabel: "Delete route",
      danger: true
    });
    if (!ok) return;
    const existing = ReliefStore.getById("routes", id);
    ReliefStore.remove("routes", id);
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Deleted a delivery route",
      detail: id + " was deleted.",
      module: "routes",
      barangay: existing ? existing.destination : ""
    });
    RR.toast(id + " was deleted.");
    render();
  }

  function initMap() {
    const note = document.getElementById("mapNote");
    if (!window.L) {
      note.textContent = "The map library did not load. The route cards still show origin, destination, and status.";
      return;
    }
    const map = L.map("routeMap", { scrollWheelZoom: false }).setView([13.4764, 121.8629], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    const icon = L.divIcon({
      className: "rr-map-pin",
      html: "<span>Mogpog</span>",
      iconSize: [78, 28],
      iconAnchor: [39, 14]
    });
    L.marker([13.4764, 121.8629], { icon: icon }).addTo(map).bindPopup("Municipal reference point published by PhilAtlas (13.4764, 121.8629). This is not a surveyed relief site and it is not a live vehicle.");
    note.textContent = "The pin is the municipal reference point for Mogpog from PhilAtlas. Route cards do not use invented road distances or travel times. Map tiles need an internet connection.";
    setTimeout(() => map.invalidateSize(), 200);
  }

  function init(user) {
    const filters = document.getElementById("filterForm");
    RR.fillSelect(filters.status, RR.DELIVERY_STATUS, "", "All statuses");
    RR.fillSelect(filters.barangay, RR.BARANGAYS, "", "All destinations");
    filters.q.value = RR.queryParam("q");
    filters.status.value = RR.queryParam("status");
    filters.barangay.value = RR.queryParam("barangay");
    const refresh = () => {
      RR.setQuery({ q: filters.q.value.trim(), status: filters.status.value, barangay: filters.barangay.value });
      render();
    };
    filters.addEventListener("submit", (event) => { event.preventDefault(); refresh(); });
    filters.addEventListener("input", refresh);
    document.getElementById("resetFilters").addEventListener("click", () => { filters.reset(); refresh(); });
    document.getElementById("addBtn").addEventListener("click", () => openForm(null));
    document.getElementById("routeList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const record = ReliefStore.getById("routes", button.dataset.id);
      if (!record) return;
      if (button.dataset.action === "edit") openForm(record);
      if (button.dataset.action === "delete") remove(user, record.id);
    });
    recordForm().addEventListener("submit", (event) => { event.preventDefault(); save(user); });
    RR.bindDataTools({
      user: user,
      fileName: "delivery-routes",
      label: "delivery route",
      collection: "routes",
      module: "routes",
      allowImport: true,
      required: ["id", "origin", "destination", "personnel", "supplies", "status", "scheduledDate"],
      validate: (row, index) => RR.DELIVERY_STATUS.includes(row.status) ? "" : "Row " + (index + 1) + " has an unknown status.",
      getRows: () => filtered(),
      onImported: render
    });
    render();
    initMap();
  }

  return { init };
})();
