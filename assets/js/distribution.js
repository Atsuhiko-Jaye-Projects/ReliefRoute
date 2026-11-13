/**
 * Distribution tracking. Inventory is reduced only when the user checks
 * the deduction box, and only once per record.
 */
const DistributionPage = (() => {
  const state = { page: 1, editing: null };
  const pageSize = 6;

  function recordForm() {
    return document.getElementById("recordForm");
  }

  function goodsSummary(items) {
    return (items || []).map((item) => item.name + " (" + item.quantity + " " + item.unit + ")").join(", ");
  }

  function filtered(user) {
    const filters = document.getElementById("filterForm");
    const query = filters.q.value.trim();
    const status = filters.status.value;
    const barangay = user.role === "barangay" ? user.barangay : filters.barangay.value;
    return RR.scope(user, ReliefStore.read("distributions")).filter((row) => {
      const text = [row.id, row.deliveryReference, row.barangay, row.personnel, row.status, row.remarks, goodsSummary(row.items)].join(" ");
      return RR.matchesQuery({ text: text }, query, ["text"]) && (!status || row.status === status) && (!barangay || row.barangay === barangay);
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
  }

  function render(user) {
    const rows = filtered(user);
    const page = RR.paginate(rows, state.page, pageSize);
    state.page = page.page;
    const manage = RR.can(user, "distribution.manage");
    document.getElementById("resultCount").textContent = rows.length + (rows.length === 1 ? " distribution" : " distributions");
    const body = document.getElementById("tableBody");
    if (!page.total) {
      body.innerHTML = RR.emptyRow(8, RR.scope(user, ReliefStore.read("distributions")).length ? "No distributions match these filters." : "No distribution records in this view.");
    } else {
      body.innerHTML = page.items.map((row) => {
        const actions = '<button type="button" class="btn btn-sm btn-outline-secondary" data-action="view" data-id="' + RR.escapeHtml(row.id) + '">View</button>' +
          (manage ? '<button type="button" class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="' + RR.escapeHtml(row.id) + '">Edit</button>' +
            '<button type="button" class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + RR.escapeHtml(row.id) + '">Delete</button>' : "");
        return "<tr><td>" + RR.escapeHtml(row.deliveryReference) + "<div class=\"small text-secondary\">" + RR.escapeHtml(row.id) + "</div></td><td>" +
          RR.escapeHtml(row.barangay) + "</td><td>" + RR.escapeHtml(RR.formatDate(row.date)) + "</td><td>" + RR.escapeHtml(goodsSummary(row.items)) +
          "</td><td>" + RR.escapeHtml(row.personnel) + "</td><td class=\"text-end\">" + Number(row.familiesServed || 0).toLocaleString("en-PH") +
          "</td><td>" + RR.statusBadge(row.status) + "</td><td><div class=\"d-flex flex-wrap gap-1\">" + actions + "</div></td></tr>";
      }).join("");
    }
    document.getElementById("pager").innerHTML = RR.pagerHtml(page);
  }

  function inventoryOptions(selected) {
    const items = ReliefStore.read("inventory");
    return items.map((item) => {
      return '<option value="' + RR.escapeHtml(item.name) + '" data-unit="' + RR.escapeHtml(item.unit) + '"' +
        (item.name === selected ? " selected" : "") + ">" + RR.escapeHtml(item.name) + "</option>";
    }).join("");
  }

  function renderGoods(items) {
    const source = items && items.length ? items : [{ name: "", quantity: 1, unit: "" }];
    document.getElementById("goodsLines").innerHTML = source.map((line) => {
      return '<div class="goods-line row g-2 align-items-end mb-2"><div class="col-12 col-md-5"><label class="form-label">Item</label><select class="form-select" name="goodsName">' +
        '<option value="">Select item</option>' + inventoryOptions(line.name) + '</select></div><div class="col-6 col-md-3"><label class="form-label">Quantity</label>' +
        '<input class="form-control" name="goodsQty" type="number" min="1" step="1" value="' + RR.escapeHtml(line.quantity) + '"></div>' +
        '<div class="col-6 col-md-3"><label class="form-label">Unit</label><input class="form-control" name="goodsUnit" value="' + RR.escapeHtml(line.unit || "") + '"></div>' +
        '<div class="col-12 col-md-1"><button type="button" class="btn btn-outline-danger w-100" data-remove-line aria-label="Remove item">&times;</button></div></div>';
    }).join("");
  }

  function collectGoods() {
    return Array.from(document.querySelectorAll(".goods-line")).map((line) => ({
      name: line.querySelector("[name=goodsName]").value,
      quantity: Number(line.querySelector("[name=goodsQty]").value),
      unit: line.querySelector("[name=goodsUnit]").value.trim()
    }));
  }

  function fillLinks(barangay, requestId, routeId) {
    const form = recordForm();
    const requests = ReliefStore.read("requests").filter((row) => !barangay || row.barangay === barangay);
    const routes = ReliefStore.read("routes").filter((row) => !barangay || row.destination === barangay);
    form.requestId.innerHTML = '<option value="">Not linked</option>' + requests.map((row) => {
      return '<option value="' + RR.escapeHtml(row.id) + '"' + (row.id === requestId ? " selected" : "") + ">" + RR.escapeHtml(row.id) + "</option>";
    }).join("");
    form.routeId.innerHTML = '<option value="">Not linked</option>' + routes.map((row) => {
      return '<option value="' + RR.escapeHtml(row.id) + '"' + (row.id === routeId ? " selected" : "") + ">" + RR.escapeHtml(row.id + " · " + row.destination) + "</option>";
    }).join("");
  }

  function openForm(user, record) {
    const form = recordForm();
    state.editing = record ? record.id : null;
    form.reset();
    RR.showFormErrors(document.getElementById("formAlert"), []);
    RR.fillSelect(form.barangay, RR.BARANGAYS, record ? record.barangay : "", "Select a barangay");
    RR.fillSelect(form.status, RR.DELIVERY_STATUS, record ? record.status : "Scheduled", "");
    form.date.value = record ? record.date : RR.todayInput();
    form.personnel.value = record ? record.personnel : "";
    form.familiesServed.value = record ? record.familiesServed : 0;
    form.remarks.value = record ? record.remarks || "" : "";
    form.reference.value = record ? record.deliveryReference : "Assigned when you save";
    renderGoods(record ? record.items : []);
    fillLinks(form.barangay.value, record ? record.requestId : "", record ? record.routeId : "");
    const note = document.getElementById("deductNote");
    const wrap = document.getElementById("deductWrap");
    form.deductInventory.checked = false;
    if (record && record.inventoryDeducted) {
      wrap.hidden = true;
      note.hidden = false;
      note.textContent = "Inventory was already updated for this delivery. Saving again will not deduct these quantities a second time. Cancelling the record does not automatically return stock.";
    } else {
      wrap.hidden = false;
      note.hidden = true;
    }
    document.getElementById("distributionModalTitle").textContent = record ? "Edit distribution" : "New distribution";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("formModal")).show();
  }

  function openView(record) {
    document.getElementById("viewTitle").textContent = record.deliveryReference;
    document.getElementById("viewBody").innerHTML = RR.detailGrid([
      { label: "Record ID", value: record.id },
      { label: "Barangay", value: record.barangay },
      { label: "Date", value: RR.formatDate(record.date) },
      { label: "Goods", value: goodsSummary(record.items) },
      { label: "Personnel", value: record.personnel },
      { label: "Families served", value: Number(record.familiesServed || 0).toLocaleString("en-PH") },
      { label: "Status", html: RR.statusBadge(record.status) },
      { label: "Request", html: record.requestId ? '<a href="relief-requests.html?q=' + encodeURIComponent(record.requestId) + '">' + RR.escapeHtml(record.requestId) + "</a>" : "Not linked" },
      { label: "Route", html: record.routeId ? '<a href="delivery-routes.html?q=' + encodeURIComponent(record.routeId) + '">' + RR.escapeHtml(record.routeId) + "</a>" : "Not linked" },
      { label: "Inventory", value: record.inventoryDeducted ? "Quantities were deducted once" : "Not deducted" },
      { label: "Remarks", value: record.remarks || "—" }
    ]);
    bootstrap.Modal.getOrCreateInstance(document.getElementById("viewModal")).show();
  }

  function deduct(items) {
    const inventory = ReliefStore.read("inventory");
    const problems = [];
    items.forEach((line) => {
      const item = inventory.find((row) => row.name.toLowerCase() === line.name.toLowerCase());
      if (!item) problems.push(line.name + " is not in the inventory.");
      else if (Number(item.quantity) < line.quantity) problems.push(item.name + " has only " + item.quantity + " " + item.unit + " available.");
    });
    if (problems.length) return problems;
    items.forEach((line) => {
      const item = inventory.find((row) => row.name.toLowerCase() === line.name.toLowerCase());
      item.quantity = Number(item.quantity) - line.quantity;
      item.updatedAt = RR.todayInput();
      item.lastNote = "Deducted " + line.quantity + " " + line.unit + " for a distribution.";
    });
    ReliefStore.write("inventory", inventory);
    return [];
  }

  function save(user) {
    const form = recordForm();
    const items = collectGoods();
    const data = {
      barangay: form.barangay.value,
      date: form.date.value,
      personnel: form.personnel.value.trim(),
      familiesServed: form.familiesServed.value,
      status: form.status.value,
      remarks: form.remarks.value.trim(),
      requestId: form.requestId.value,
      routeId: form.routeId.value,
      items: items
    };
    const errors = [];
    const invalid = [];
    if (!RR.BARANGAYS.includes(data.barangay)) { errors.push("Select a destination barangay."); invalid.push("barangay"); }
    if (!data.date) { errors.push("Enter the distribution date."); invalid.push("date"); }
    if (data.personnel.length < 3) { errors.push("Enter the assigned personnel."); invalid.push("personnel"); }
    if (!RR.DELIVERY_STATUS.includes(data.status)) { errors.push("Select a status."); invalid.push("status"); }
    if (!RR.integerInRange(data.familiesServed, 0, 20000)) { errors.push("Families served must be a whole number from 0 to 20000."); invalid.push("familiesServed"); }
    if ((data.status === "Delivered" || data.status === "Partially Delivered") && Number(data.familiesServed) < 1) {
      errors.push("Enter how many families were served for a delivered or partial record.");
      invalid.push("familiesServed");
    }
    if (!items.length) errors.push("Add at least one relief item.");
    const names = new Set();
    items.forEach((line) => {
      if (!line.name) errors.push("Select each relief item.");
      if (!RR.integerInRange(line.quantity, 1, 100000)) errors.push("Each quantity must be a whole number of at least 1.");
      if (!line.unit) errors.push("Enter the unit for each item.");
      if (names.has(line.name)) errors.push("List each relief item once.");
      if (line.name) names.add(line.name);
    });
    if (data.remarks.length > 500) errors.push("Keep remarks to 500 characters or fewer.");
    if (data.requestId) {
      const linkedRequest = ReliefStore.getById("requests", data.requestId);
      if (!linkedRequest) errors.push("The linked request does not exist.");
      else if (linkedRequest.barangay !== data.barangay) errors.push("Link a request from the same barangay.");
    }
    if (data.routeId) {
      const linkedRoute = ReliefStore.getById("routes", data.routeId);
      if (!linkedRoute) errors.push("The linked route does not exist.");
      else if (linkedRoute.destination !== data.barangay) errors.push("Link a route with the same destination barangay.");
    }
    const existing = state.editing ? ReliefStore.getById("distributions", state.editing) : null;
    const wantDeduct = form.deductInventory.checked && !(existing && existing.inventoryDeducted);
    if (wantDeduct && data.status !== "Delivered" && data.status !== "Partially Delivered") {
      errors.push("Deduct inventory only when the status is Delivered or Partially Delivered.");
    }
    let deductedNow = false;
    if (!errors.length && wantDeduct) {
      const stockErrors = deduct(items);
      if (stockErrors.length) errors.push.apply(errors, stockErrors);
      else deductedNow = true;
    }
    RR.markInvalid(form, invalid);
    RR.showFormErrors(document.getElementById("formAlert"), errors);
    if (errors.length) return;
    const payload = {
      barangay: data.barangay,
      date: data.date,
      items: items,
      personnel: data.personnel,
      familiesServed: Number(data.familiesServed),
      status: data.status,
      remarks: data.remarks,
      routeId: data.routeId,
      requestId: data.requestId,
      inventoryDeducted: deductedNow || (existing ? !!existing.inventoryDeducted : false),
      updatedAt: new Date().toISOString()
    };
    let id = state.editing;
    if (existing) {
      ReliefStore.update("distributions", existing.id, payload);
    } else {
      const all = ReliefStore.read("distributions");
      id = ReliefStore.nextNumberedId(all, "DS-", 3);
      const reference = ReliefStore.nextReference(all, "deliveryReference", "DLV-" + new Date().getFullYear() + "-", 3);
      ReliefStore.add("distributions", Object.assign({ id: id, deliveryReference: reference }, payload));
    }
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Updated a distribution",
      detail: id + " for " + data.barangay + " is " + data.status + ". Families served: " + payload.familiesServed + ".",
      module: "distribution",
      barangay: data.barangay
    });
    RR.toast((existing ? existing.deliveryReference : id) + " was saved.");
    bootstrap.Modal.getInstance(document.getElementById("formModal")).hide();
    render(user);
  }

  async function remove(user, id) {
    const existing = ReliefStore.getById("distributions", id);
    const stockNote = existing && existing.inventoryDeducted ? " Inventory that was already deducted is not returned automatically." : "";
    const ok = await RR.confirmAction({
      title: "Delete " + (existing ? existing.deliveryReference : id) + "?",
      message: "This removes the distribution from this browser." + stockNote,
      confirmLabel: "Delete distribution",
      danger: true
    });
    if (!ok) return;
    ReliefStore.remove("distributions", id);
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Deleted a distribution",
      detail: id + " was deleted.",
      module: "distribution",
      barangay: existing ? existing.barangay : ""
    });
    RR.toast(id + " was deleted.");
    render(user);
  }

  function init(user) {
    const manage = RR.can(user, "distribution.manage");
    if (!manage) document.getElementById("addBtn").hidden = true;
    const filters = document.getElementById("filterForm");
    RR.fillSelect(filters.status, RR.DELIVERY_STATUS, "", "All statuses");
    RR.fillSelect(filters.barangay, RR.BARANGAYS, "", "All barangays");
    if (user.role === "barangay") document.getElementById("barangayFilterWrap").hidden = true;
    filters.q.value = RR.queryParam("q");
    filters.status.value = RR.queryParam("status");
    filters.barangay.value = RR.queryParam("barangay");
    document.getElementById("scopeNote").textContent = manage
      ? "Record where relief goods are going, then update the status when the delivery changes. A delivered status means the goods were handed out. Other statuses are still pending."
      : "Delivery updates for Barangay " + user.barangay + ". You can follow the status, but only municipal staff can change it in this demo.";
    const refresh = () => {
      state.page = 1;
      RR.setQuery({
        q: filters.q.value.trim(),
        status: filters.status.value,
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
    document.getElementById("addGoodsLine").addEventListener("click", () => {
      const items = collectGoods();
      items.push({ name: "", quantity: 1, unit: "" });
      renderGoods(items);
    });
    document.getElementById("goodsLines").addEventListener("click", (event) => {
      if (!event.target.closest("[data-remove-line]")) return;
      const items = collectGoods();
      if (items.length === 1) {
        RR.toast("Keep at least one relief item.", "error");
        return;
      }
      const lines = Array.from(document.querySelectorAll(".goods-line"));
      const index = lines.indexOf(event.target.closest(".goods-line"));
      items.splice(index, 1);
      renderGoods(items);
    });
    document.getElementById("goodsLines").addEventListener("change", (event) => {
      if (event.target.name !== "goodsName") return;
      const option = event.target.selectedOptions[0];
      const unit = option ? option.getAttribute("data-unit") || "" : "";
      if (unit) event.target.closest(".goods-line").querySelector("[name=goodsUnit]").value = unit;
    });
    recordForm().barangay.addEventListener("change", () => {
      fillLinks(recordForm().barangay.value, recordForm().requestId.value, recordForm().routeId.value);
    });
    recordForm().addEventListener("submit", (event) => { event.preventDefault(); save(user); });
    document.getElementById("tableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const record = ReliefStore.getById("distributions", button.dataset.id);
      if (!record) return;
      if (button.dataset.action === "view") openView(record);
      if (button.dataset.action === "edit" && manage) openForm(user, record);
      if (button.dataset.action === "delete" && manage) remove(user, record.id);
    });
    RR.bindDataTools({
      user: user,
      fileName: "distributions",
      label: "distribution",
      collection: "distributions",
      module: "distribution",
      allowImport: manage,
      required: ["id", "deliveryReference", "barangay", "date", "personnel", "status"],
      validate: (row, index) => {
        if (!RR.DELIVERY_STATUS.includes(row.status)) return "Row " + (index + 1) + " has an unknown status.";
        if (!Array.isArray(row.items) || !row.items.length) return "Row " + (index + 1) + " needs a goods list.";
        return "";
      },
      getRows: () => filtered(user).map((row) => Object.assign({}, row, { goods: goodsSummary(row.items) })),
      onImported: () => render(user)
    });
    render(user);
  }

  return { init };
})();
