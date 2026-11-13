/**
 * Relief request records: create, edit, status, search, and local save.
 */
const ReliefRequests = (() => {
  const state = { page: 1, editing: null };
  const pageSize = 8;

  function form() {
    return document.getElementById("recordForm");
  }

  function scoped(user) {
    return RR.scope(user, ReliefStore.read("requests"));
  }

  function filtered(user) {
    const filterForm = document.getElementById("filterForm");
    const query = filterForm.q.value.trim();
    const status = filterForm.status.value;
    const priority = filterForm.priority.value;
    const barangay = user.role === "barangay" ? user.barangay : filterForm.barangay.value;
    const sort = filterForm.sort.value;
    let rows = scoped(user).filter((row) => {
      const text = [row.id, row.barangay, row.category, row.description, row.priority, row.status, row.remarks, RR.userName(row.submittedBy)].join(" ");
      return RR.matchesQuery({ text: text }, query, ["text"]) &&
        (!status || row.status === status) &&
        (!priority || row.priority === priority) &&
        (!barangay || row.barangay === barangay);
    });
    rows.sort((a, b) => {
      if (sort === "oldest") return String(a.requestDate).localeCompare(String(b.requestDate));
      if (sort === "priority") return (RR.PRIORITY_RANK[b.priority] || 0) - (RR.PRIORITY_RANK[a.priority] || 0) || String(b.requestDate).localeCompare(String(a.requestDate));
      if (sort === "families") return Number(b.affectedFamilies) - Number(a.affectedFamilies);
      if (sort === "barangay") return String(a.barangay).localeCompare(String(b.barangay));
      return String(b.requestDate).localeCompare(String(a.requestDate)) || String(b.id).localeCompare(String(a.id));
    });
    return rows;
  }

  function render(user) {
    const rows = filtered(user);
    const page = RR.paginate(rows, state.page, pageSize);
    state.page = page.page;
    const body = document.getElementById("tableBody");
    document.getElementById("resultCount").textContent = rows.length + (rows.length === 1 ? " request" : " requests");
    if (!page.total) {
      const source = scoped(user);
      body.innerHTML = RR.emptyRow(8, source.length ? "No requests match these filters." : "No relief requests have been recorded in this view.");
    } else {
      body.innerHTML = page.items.map((row) => {
        const edit = RR.canEditRequest(user, row)
          ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="' + RR.escapeHtml(row.id) + '">Edit</button>'
          : "";
        const remove = RR.can(user, "requests.delete")
          ? '<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + RR.escapeHtml(row.id) + '">Delete</button>'
          : "";
        return "<tr><td>" + RR.escapeHtml(row.id) + "</td><td>" + RR.escapeHtml(row.barangay) + "</td><td>" + RR.escapeHtml(RR.formatDate(row.requestDate)) +
          "</td><td>" + RR.escapeHtml(row.category) + "</td><td class=\"text-end\">" + Number(row.affectedFamilies).toLocaleString("en-PH") +
          "</td><td>" + RR.priorityBadge(row.priority) + "</td><td>" + RR.statusBadge(row.status) +
          "</td><td><div class=\"d-flex flex-wrap gap-1\"><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-action=\"view\" data-id=\"" +
          RR.escapeHtml(row.id) + "\">View</button>" + edit + remove + "</div></td></tr>";
      }).join("");
    }
    document.getElementById("pager").innerHTML = RR.pagerHtml(page);
  }

  function syncUrl(user) {
    const filterForm = document.getElementById("filterForm");
    RR.setQuery({
      q: filterForm.q.value.trim(),
      status: filterForm.status.value,
      priority: filterForm.priority.value,
      barangay: user.role === "barangay" ? "" : filterForm.barangay.value,
      sort: filterForm.sort.value === "newest" ? "" : filterForm.sort.value
    });
  }

  function openForm(user, record) {
    const recordForm = form();
    state.editing = record ? record.id : null;
    recordForm.reset();
    RR.showFormErrors(document.getElementById("formAlert"), []);
    RR.fillSelect(recordForm.barangay, RR.BARANGAYS, record ? record.barangay : user.barangay, "Select a barangay");
    RR.fillSelect(recordForm.category, RR.CATEGORIES, record ? record.category : "", "Select assistance");
    RR.fillSelect(recordForm.priority, RR.PRIORITY, record ? record.priority : "Medium", "");
    RR.fillSelect(recordForm.status, RR.REQUEST_STATUS, record ? record.status : "Pending", "");
    RR.peopleOptions(recordForm.assignedCoordinator, record ? record.assignedCoordinator : "", "Unassigned");
    recordForm.requestDate.value = record ? record.requestDate : RR.todayInput();
    recordForm.affectedFamilies.value = record ? record.affectedFamilies : "";
    recordForm.description.value = record ? record.description : "";
    recordForm.remarks.value = record ? record.remarks || "" : "";
    const lockBarangay = user.role === "barangay";
    recordForm.barangay.disabled = lockBarangay;
    if (lockBarangay) recordForm.barangay.value = user.barangay;
    const staff = RR.can(user, "requests.status");
    document.getElementById("staffFields").hidden = !staff;
    recordForm.status.disabled = !staff;
    recordForm.assignedCoordinator.disabled = !staff;
    recordForm.remarks.disabled = !staff;
    document.getElementById("requestModalTitle").textContent = record ? "Edit relief request" : "New relief request";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("formModal")).show();
  }

  function openView(record) {
    const areas = ReliefStore.read("areas").filter((row) => row.relatedRequestId === record.id);
    const deliveries = ReliefStore.read("distributions").filter((row) => row.requestId === record.id);
    const related = '<div class="mt-3"><h3 class="h6">Linked records</h3><p class="mb-1">Priority areas: ' +
      (areas.length ? areas.map((row) => '<a href="priority-areas.html?q=' + encodeURIComponent(row.id) + '">' + RR.escapeHtml(row.id) + "</a>").join(", ") : "None") +
      "</p><p class=\"mb-0\">Distributions: " +
      (deliveries.length ? deliveries.map((row) => '<a href="distribution.html?q=' + encodeURIComponent(row.id) + '">' + RR.escapeHtml(row.id) + "</a>").join(", ") : "None") +
      "</p></div>";
    document.getElementById("viewTitle").textContent = record.id;
    document.getElementById("viewBody").innerHTML = RR.detailGrid([
      { label: "Barangay", value: record.barangay },
      { label: "Request date", value: RR.formatDate(record.requestDate) },
      { label: "Assistance", value: record.category },
      { label: "Affected families", value: Number(record.affectedFamilies).toLocaleString("en-PH") },
      { label: "Priority", html: RR.priorityBadge(record.priority) },
      { label: "Status", html: RR.statusBadge(record.status) },
      { label: "Submitted by", value: RR.userName(record.submittedBy) },
      { label: "Coordinator", value: RR.userName(record.assignedCoordinator) },
      { label: "Description", value: record.description },
      { label: "Remarks", value: record.remarks || "—" }
    ]) + related;
    bootstrap.Modal.getOrCreateInstance(document.getElementById("viewModal")).show();
  }

  function validate(data, user) {
    const errors = [];
    const invalid = [];
    if (!RR.BARANGAYS.includes(data.barangay)) {
      errors.push("Select a barangay.");
      invalid.push("barangay");
    }
    if (user.role === "barangay" && data.barangay !== user.barangay) {
      errors.push("You can only save requests for your own barangay.");
      invalid.push("barangay");
    }
    if (!data.requestDate) {
      errors.push("Enter the request date.");
      invalid.push("requestDate");
    }
    if (!RR.CATEGORIES.includes(data.category)) {
      errors.push("Select the type of assistance.");
      invalid.push("category");
    }
    if (!RR.integerInRange(data.affectedFamilies, 1, 20000)) {
      errors.push("Affected families must be a whole number from 1 to 20000.");
      invalid.push("affectedFamilies");
    }
    if (!data.description || data.description.length < 10) {
      errors.push("Describe the situation in at least 10 characters.");
      invalid.push("description");
    }
    if (data.description.length > 1000) {
      errors.push("Keep the description to 1000 characters or fewer.");
      invalid.push("description");
    }
    if (!RR.PRIORITY.includes(data.priority)) {
      errors.push("Select a priority level.");
      invalid.push("priority");
    }
    if (RR.can(user, "requests.status") && !RR.REQUEST_STATUS.includes(data.status)) {
      errors.push("Select a valid status.");
      invalid.push("status");
    }
    if (data.remarks && data.remarks.length > 500) {
      errors.push("Keep remarks to 500 characters or fewer.");
      invalid.push("remarks");
    }
    return { errors, invalid };
  }

  function save(user) {
    const recordForm = form();
    const data = {
      barangay: user.role === "barangay" ? user.barangay : recordForm.barangay.value,
      requestDate: recordForm.requestDate.value,
      category: recordForm.category.value,
      affectedFamilies: recordForm.affectedFamilies.value,
      description: recordForm.description.value.trim(),
      priority: recordForm.priority.value,
      status: recordForm.status.value,
      assignedCoordinator: recordForm.assignedCoordinator.value,
      remarks: recordForm.remarks.value.trim()
    };
    const check = validate(data, user);
    RR.markInvalid(recordForm, check.invalid);
    RR.showFormErrors(document.getElementById("formAlert"), check.errors);
    if (check.errors.length) return;
    const now = new Date().toISOString();
    if (state.editing) {
      const existing = ReliefStore.getById("requests", state.editing);
      if (!existing || !RR.canEditRequest(user, existing)) {
        RR.toast("You cannot edit this request.", "error");
        return;
      }
      const patch = {
        barangay: data.barangay,
        requestDate: data.requestDate,
        category: data.category,
        affectedFamilies: Number(data.affectedFamilies),
        description: data.description,
        priority: data.priority,
        updatedAt: now
      };
      if (RR.can(user, "requests.status")) {
        patch.status = data.status;
        patch.assignedCoordinator = data.assignedCoordinator;
        patch.remarks = data.remarks;
      }
      ReliefStore.update("requests", existing.id, patch);
      ReliefStore.logActivity({
        actor: user.fullName,
        action: existing.status !== patch.status && patch.status ? "Updated request status" : "Edited a relief request",
        detail: existing.id + (patch.status && existing.status !== patch.status ? " is now " + patch.status + "." : " was updated."),
        module: "requests",
        barangay: data.barangay
      });
      RR.toast(existing.id + " was saved.");
    } else {
      const records = ReliefStore.read("requests");
      const id = ReliefStore.nextNumberedId(records, "RR-" + new Date().getFullYear() + "-", 3);
      ReliefStore.add("requests", {
        id: id,
        barangay: data.barangay,
        requestDate: data.requestDate,
        category: data.category,
        affectedFamilies: Number(data.affectedFamilies),
        description: data.description,
        priority: data.priority,
        status: RR.can(user, "requests.status") ? data.status : "Pending",
        submittedBy: user.id,
        assignedCoordinator: RR.can(user, "requests.status") ? data.assignedCoordinator : "",
        remarks: RR.can(user, "requests.remarks") ? data.remarks : "",
        createdAt: now,
        updatedAt: now
      });
      ReliefStore.logActivity({
        actor: user.fullName,
        action: "Submitted a relief request",
        detail: id + " was recorded for " + data.barangay + ".",
        module: "requests",
        barangay: data.barangay
      });
      RR.toast(id + " was submitted.");
    }
    bootstrap.Modal.getInstance(document.getElementById("formModal")).hide();
    render(user);
  }

  async function remove(user, id) {
    const related = ReliefStore.read("areas").filter((row) => row.relatedRequestId === id).length +
      ReliefStore.read("distributions").filter((row) => row.requestId === id).length;
    const extra = related ? " " + related + " linked area or distribution record will keep this reference number." : "";
    const ok = await RR.confirmAction({
      title: "Delete " + id + "?",
      message: "This removes the request from this browser only." + extra,
      confirmLabel: "Delete request",
      danger: true
    });
    if (!ok) return;
    const existing = ReliefStore.getById("requests", id);
    ReliefStore.remove("requests", id);
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Deleted a relief request",
      detail: id + " was deleted.",
      module: "requests",
      barangay: existing ? existing.barangay : ""
    });
    RR.toast(id + " was deleted.");
    render(user);
  }

  function init(user) {
    const filterForm = document.getElementById("filterForm");
    RR.fillSelect(filterForm.status, RR.REQUEST_STATUS, "", "All statuses");
    RR.fillSelect(filterForm.priority, RR.PRIORITY, "", "All priorities");
    RR.fillSelect(filterForm.barangay, RR.BARANGAYS, "", "All barangays");
    if (user.role === "barangay") document.getElementById("barangayFilterWrap").hidden = true;
    filterForm.q.value = RR.queryParam("q");
    filterForm.status.value = RR.queryParam("status");
    filterForm.priority.value = RR.queryParam("priority");
    filterForm.barangay.value = RR.queryParam("barangay");
    filterForm.sort.value = RR.queryParam("sort") || "newest";
    document.getElementById("scopeNote").textContent = user.role === "barangay"
      ? "You can submit requests for Barangay " + user.barangay + " and edit them while they are Pending or Under Review."
      : "Municipal staff can review every barangay request and update status and remarks.";

    const refresh = () => {
      state.page = 1;
      syncUrl(user);
      render(user);
    };
    filterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      refresh();
    });
    filterForm.addEventListener("input", refresh);
    document.getElementById("resetFilters").addEventListener("click", () => {
      filterForm.reset();
      filterForm.sort.value = "newest";
      refresh();
    });
    document.getElementById("pager").addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      state.page = Number(button.dataset.page);
      render(user);
    });
    document.getElementById("addBtn").addEventListener("click", () => openForm(user, null));
    document.getElementById("tableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const record = ReliefStore.getById("requests", button.dataset.id);
      if (!record) return;
      if (button.dataset.action === "view") openView(record);
      if (button.dataset.action === "edit") openForm(user, record);
      if (button.dataset.action === "delete" && RR.can(user, "requests.delete")) remove(user, record.id);
    });
    form().addEventListener("submit", (event) => {
      event.preventDefault();
      save(user);
    });
    RR.bindDataTools({
      user: user,
      fileName: "relief-requests",
      label: "relief request",
      collection: "requests",
      module: "requests",
      allowImport: RR.can(user, "requests.import"),
      required: ["id", "barangay", "requestDate", "category", "affectedFamilies", "description", "priority", "status"],
      validate: (row, index) => {
        if (!RR.REQUEST_STATUS.includes(row.status)) return "Row " + (index + 1) + " has an unknown status.";
        if (!RR.PRIORITY.includes(row.priority)) return "Row " + (index + 1) + " has an unknown priority.";
        return "";
      },
      getRows: () => filtered(user),
      onImported: () => render(user)
    });
    render(user);
  }

  return { init };
})();
