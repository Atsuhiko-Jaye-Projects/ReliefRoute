/**
 * Priority areas are coordination records. They are not official disaster ratings.
 */
const PriorityAreas = (() => {
  const state = { page: 1, editing: null };
  const pageSize = 8;

  function recordForm() {
    return document.getElementById("recordForm");
  }

  function filtered(user) {
    const filters = document.getElementById("filterForm");
    const query = filters.q.value.trim();
    const status = filters.status.value;
    const priority = filters.priority.value;
    const barangay = user.role === "barangay" ? user.barangay : filters.barangay.value;
    return RR.scope(user, ReliefStore.read("areas")).filter((row) => {
      return RR.matchesQuery(row, query, ["id", "barangay", "location", "description", "assistanceNeeded", "status", "priority", "relatedRequestId"]) &&
        (!status || row.status === status) &&
        (!priority || row.priority === priority) &&
        (!barangay || row.barangay === barangay);
    }).sort((a, b) => (RR.PRIORITY_RANK[b.priority] || 0) - (RR.PRIORITY_RANK[a.priority] || 0) || String(b.lastUpdated).localeCompare(String(a.lastUpdated)));
  }

  function render(user) {
    const rows = filtered(user);
    const page = RR.paginate(rows, state.page, pageSize);
    state.page = page.page;
    const manage = RR.can(user, "areas.manage");
    document.getElementById("resultCount").textContent = rows.length + (rows.length === 1 ? " area" : " areas");
    const body = document.getElementById("tableBody");
    if (!page.total) {
      body.innerHTML = RR.emptyRow(8, RR.scope(user, ReliefStore.read("areas")).length ? "No areas match these filters." : "No priority areas have been recorded in this view.");
    } else {
      body.innerHTML = page.items.map((row) => {
        const actions = '<button type="button" class="btn btn-sm btn-outline-secondary" data-action="view" data-id="' + RR.escapeHtml(row.id) + '">View</button>' +
          (manage ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="' + RR.escapeHtml(row.id) + '">Edit</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + RR.escapeHtml(row.id) + '">Delete</button>' : "");
        return "<tr><td>" + RR.escapeHtml(row.id) + "</td><td>" + RR.escapeHtml(row.barangay) + "</td><td>" + RR.escapeHtml(row.location) +
          "</td><td class=\"text-end\">" + Number(row.affectedFamilies).toLocaleString("en-PH") + "</td><td>" + RR.escapeHtml(row.assistanceNeeded) +
          "</td><td>" + RR.priorityBadge(row.priority) + "</td><td>" + RR.statusBadge(row.status) +
          "</td><td><div class=\"d-flex flex-wrap gap-1\">" + actions + "</div></td></tr>";
      }).join("");
    }
    document.getElementById("pager").innerHTML = RR.pagerHtml(page);
  }

  function requestChoices(barangay, selected) {
    const requests = ReliefStore.read("requests").filter((row) => !barangay || row.barangay === barangay);
    const select = recordForm().relatedRequestId;
    let html = '<option value="">Not linked</option>';
    requests.forEach((row) => {
      html += '<option value="' + RR.escapeHtml(row.id) + '"' + (row.id === selected ? " selected" : "") + ">" +
        RR.escapeHtml(row.id + " · " + row.category) + "</option>";
    });
    if (selected && !requests.some((row) => row.id === selected)) {
      html += '<option value="' + RR.escapeHtml(selected) + '" selected>' + RR.escapeHtml(selected) + "</option>";
    }
    select.innerHTML = html;
  }

  function openForm(user, record) {
    const form = recordForm();
    state.editing = record ? record.id : null;
    form.reset();
    RR.showFormErrors(document.getElementById("formAlert"), []);
    RR.fillSelect(form.barangay, RR.BARANGAYS, record ? record.barangay : "", "Select a barangay");
    RR.fillSelect(form.priority, RR.PRIORITY, record ? record.priority : "Medium", "");
    RR.fillSelect(form.status, RR.AREA_STATUS, record ? record.status : "Needs Assessment", "");
    form.location.value = record ? record.location : "";
    form.affectedFamilies.value = record ? record.affectedFamilies : "";
    form.description.value = record ? record.description : "";
    form.assistanceNeeded.value = record ? record.assistanceNeeded : "";
    requestChoices(form.barangay.value, record ? record.relatedRequestId : "");
    document.getElementById("areaModalTitle").textContent = record ? "Edit priority area" : "New priority area";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("formModal")).show();
  }

  function openView(record) {
    const request = record.relatedRequestId ? ReliefStore.getById("requests", record.relatedRequestId) : null;
    document.getElementById("viewTitle").textContent = record.id;
    document.getElementById("viewBody").innerHTML = RR.detailGrid([
      { label: "Barangay", value: record.barangay },
      { label: "Location", value: record.location },
      { label: "Affected families", value: Number(record.affectedFamilies).toLocaleString("en-PH") },
      { label: "Assistance needed", value: record.assistanceNeeded },
      { label: "Priority", html: RR.priorityBadge(record.priority) },
      { label: "Status", html: RR.statusBadge(record.status) },
      { label: "Last updated", value: RR.formatDate(record.lastUpdated) },
      { label: "Description", value: record.description },
      {
        label: "Linked request",
        html: request ? '<a href="relief-requests.html?q=' + encodeURIComponent(request.id) + '">' + RR.escapeHtml(request.id) + "</a>" : "Not linked"
      }
    ]) + '<p class="small text-secondary mt-3 mb-0">Priority labels in this prototype are coordination markers for the demo. They are not an official disaster assessment.</p>';
    bootstrap.Modal.getOrCreateInstance(document.getElementById("viewModal")).show();
  }

  function save(user) {
    const form = recordForm();
    const data = {
      barangay: form.barangay.value,
      location: form.location.value.trim(),
      affectedFamilies: form.affectedFamilies.value,
      description: form.description.value.trim(),
      priority: form.priority.value,
      assistanceNeeded: form.assistanceNeeded.value.trim(),
      status: form.status.value,
      relatedRequestId: form.relatedRequestId.value
    };
    const errors = [];
    const invalid = [];
    if (!RR.BARANGAYS.includes(data.barangay)) { errors.push("Select a barangay."); invalid.push("barangay"); }
    if (data.location.length < 5) { errors.push("Enter a location or address of at least 5 characters."); invalid.push("location"); }
    if (!RR.integerInRange(data.affectedFamilies, 1, 20000)) { errors.push("Affected families must be a whole number from 1 to 20000."); invalid.push("affectedFamilies"); }
    if (data.description.length < 10) { errors.push("Describe the situation in at least 10 characters."); invalid.push("description"); }
    if (data.assistanceNeeded.length < 3) { errors.push("State the assistance needed."); invalid.push("assistanceNeeded"); }
    if (!RR.PRIORITY.includes(data.priority)) { errors.push("Select a priority level."); invalid.push("priority"); }
    if (!RR.AREA_STATUS.includes(data.status)) { errors.push("Select a status."); invalid.push("status"); }
    if (data.relatedRequestId) {
      const linked = ReliefStore.getById("requests", data.relatedRequestId);
      if (!linked) { errors.push("The linked request does not exist."); invalid.push("relatedRequestId"); }
      else if (linked.barangay !== data.barangay) { errors.push("Link a request from the same barangay."); invalid.push("relatedRequestId"); }
    }
    RR.markInvalid(form, invalid);
    RR.showFormErrors(document.getElementById("formAlert"), errors);
    if (errors.length) return;
    const today = RR.todayInput();
    if (state.editing) {
      ReliefStore.update("areas", state.editing, {
        barangay: data.barangay,
        location: data.location,
        affectedFamilies: Number(data.affectedFamilies),
        description: data.description,
        priority: data.priority,
        assistanceNeeded: data.assistanceNeeded,
        status: data.status,
        relatedRequestId: data.relatedRequestId,
        lastUpdated: today
      });
      ReliefStore.logActivity({
        actor: user.fullName,
        action: "Updated a priority area",
        detail: state.editing + " in " + data.barangay + " is now " + data.status + ".",
        module: "areas",
        barangay: data.barangay
      });
      RR.toast(state.editing + " was saved.");
    } else {
      const id = ReliefStore.nextNumberedId(ReliefStore.read("areas"), "PA-", 3);
      ReliefStore.add("areas", {
        id: id,
        barangay: data.barangay,
        location: data.location,
        affectedFamilies: Number(data.affectedFamilies),
        description: data.description,
        priority: data.priority,
        assistanceNeeded: data.assistanceNeeded,
        status: data.status,
        lastUpdated: today,
        relatedRequestId: data.relatedRequestId
      });
      ReliefStore.logActivity({
        actor: user.fullName,
        action: "Added a priority area",
        detail: id + " was recorded for " + data.barangay + ".",
        module: "areas",
        barangay: data.barangay
      });
      RR.toast(id + " was added.");
    }
    bootstrap.Modal.getInstance(document.getElementById("formModal")).hide();
    render(user);
  }

  async function remove(user, id) {
    const ok = await RR.confirmAction({
      title: "Delete " + id + "?",
      message: "This removes the priority area from this browser. Linked requests are not deleted.",
      confirmLabel: "Delete area",
      danger: true
    });
    if (!ok) return;
    const existing = ReliefStore.getById("areas", id);
    ReliefStore.remove("areas", id);
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Deleted a priority area",
      detail: id + " was deleted.",
      module: "areas",
      barangay: existing ? existing.barangay : ""
    });
    RR.toast(id + " was deleted.");
    render(user);
  }

  function init(user) {
    const manage = RR.can(user, "areas.manage");
    if (!manage) document.getElementById("addBtn").hidden = true;
    const filters = document.getElementById("filterForm");
    RR.fillSelect(filters.status, RR.AREA_STATUS, "", "All statuses");
    RR.fillSelect(filters.priority, RR.PRIORITY, "", "All priorities");
    RR.fillSelect(filters.barangay, RR.BARANGAYS, "", "All barangays");
    if (user.role === "barangay") document.getElementById("barangayFilterWrap").hidden = true;
    filters.q.value = RR.queryParam("q");
    filters.status.value = RR.queryParam("status");
    filters.priority.value = RR.queryParam("priority");
    filters.barangay.value = RR.queryParam("barangay");
    document.getElementById("scopeNote").textContent = manage
      ? "Add and update sample priority areas. These labels do not replace a professional assessment."
      : "You can review priority areas for Barangay " + user.barangay + ".";
    const refresh = () => {
      state.page = 1;
      RR.setQuery({
        q: filters.q.value.trim(),
        status: filters.status.value,
        priority: filters.priority.value,
        barangay: user.role === "barangay" ? "" : filters.barangay.value
      });
      render(user);
    };
    filters.addEventListener("submit", (event) => { event.preventDefault(); refresh(); });
    filters.addEventListener("input", refresh);
    document.getElementById("resetFilters").addEventListener("click", () => { filters.reset(); refresh(); });
    document.getElementById("pager").addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      render(user);
    });
    document.getElementById("addBtn").addEventListener("click", () => openForm(user, null));
    recordForm().barangay.addEventListener("change", () => requestChoices(recordForm().barangay.value, recordForm().relatedRequestId.value));
    recordForm().addEventListener("submit", (event) => { event.preventDefault(); save(user); });
    document.getElementById("tableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const record = ReliefStore.getById("areas", button.dataset.id);
      if (!record) return;
      if (button.dataset.action === "view") openView(record);
      if (button.dataset.action === "edit" && manage) openForm(user, record);
      if (button.dataset.action === "delete" && manage) remove(user, record.id);
    });
    RR.bindDataTools({
      user: user,
      fileName: "priority-areas",
      label: "priority area",
      collection: "areas",
      module: "areas",
      allowImport: manage,
      required: ["id", "barangay", "location", "affectedFamilies", "description", "priority", "assistanceNeeded", "status", "lastUpdated"],
      validate: (row, index) => RR.AREA_STATUS.includes(row.status) && RR.PRIORITY.includes(row.priority) ? "" : "Row " + (index + 1) + " has an unknown status or priority.",
      getRows: () => filtered(user),
      onImported: () => render(user)
    });
    render(user);
  }

  return { init };
})();
