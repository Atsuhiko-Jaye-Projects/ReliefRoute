/**
 * Sample relief inventory and low-stock monitoring.
 */
const InventoryPage = (() => {
  const state = { editing: null };

  function recordForm() {
    return document.getElementById("recordForm");
  }

  function isLow(item) {
    return Number(item.quantity) <= Number(item.reorderLevel);
  }

  function filtered() {
    const filters = document.getElementById("filterForm");
    const query = filters.q.value.trim();
    const lowOnly = filters.low.checked;
    return ReliefStore.read("inventory").filter((row) => {
      return RR.matchesQuery(row, query, ["id", "name", "category", "unit", "location", "lastNote"]) && (!lowOnly || isLow(row));
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function render() {
    const rows = filtered();
    document.getElementById("resultCount").textContent = rows.length + (rows.length === 1 ? " item" : " items");
    const body = document.getElementById("tableBody");
    if (!rows.length) {
      body.innerHTML = RR.emptyRow(8, ReliefStore.read("inventory").length ? "No items match these filters." : "No inventory items have been recorded.");
      return;
    }
    body.innerHTML = rows.map((row) => {
      const stock = isLow(row) ? '<span class="rr-badge rr-badge-danger">Low stock</span>' : '<span class="rr-badge rr-badge-ok">In stock</span>';
      return "<tr><td>" + RR.escapeHtml(row.name) + "<div class=\"small text-secondary\">" + RR.escapeHtml(row.id) + "</div></td><td>" +
        RR.escapeHtml(row.category) + "</td><td class=\"text-end\">" + Number(row.quantity).toLocaleString("en-PH") + "</td><td>" + RR.escapeHtml(row.unit) +
        "</td><td class=\"text-end\">" + Number(row.reorderLevel).toLocaleString("en-PH") + "</td><td>" + stock + "</td><td>" + RR.escapeHtml(RR.formatDate(row.updatedAt)) +
        "</td><td><div class=\"d-flex flex-wrap gap-1\"><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-action=\"edit\" data-id=\"" +
        RR.escapeHtml(row.id) + "\">Edit</button><button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-action=\"delete\" data-id=\"" +
        RR.escapeHtml(row.id) + "\">Delete</button></div></td></tr>";
    }).join("");
  }

  function openForm(record) {
    const form = recordForm();
    state.editing = record ? record.id : null;
    form.reset();
    RR.showFormErrors(document.getElementById("formAlert"), []);
    form.name.value = record ? record.name : "";
    form.category.value = record ? record.category : "Food";
    form.quantity.value = record ? record.quantity : "";
    form.unit.value = record ? record.unit : "";
    form.reorderLevel.value = record ? record.reorderLevel : 10;
    form.location.value = record ? record.location : "Municipal stockroom (sample)";
    form.lastNote.value = record ? record.lastNote || "" : "";
    document.getElementById("inventoryModalTitle").textContent = record ? "Edit relief item" : "New relief item";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("formModal")).show();
  }

  function save(user) {
    const form = recordForm();
    const data = {
      name: form.name.value.trim(),
      category: form.category.value.trim(),
      quantity: form.quantity.value,
      unit: form.unit.value.trim(),
      reorderLevel: form.reorderLevel.value,
      location: form.location.value.trim(),
      lastNote: form.lastNote.value.trim()
    };
    const errors = [];
    const invalid = [];
    if (data.name.length < 2) { errors.push("Enter the item name."); invalid.push("name"); }
    if (data.category.length < 2) { errors.push("Enter a category."); invalid.push("category"); }
    if (!RR.integerInRange(data.quantity, 0, 1000000)) { errors.push("Quantity must be a whole number from 0 upward."); invalid.push("quantity"); }
    if (!data.unit) { errors.push("Enter the unit of measurement."); invalid.push("unit"); }
    if (!RR.integerInRange(data.reorderLevel, 0, 1000000)) { errors.push("Reorder level must be a whole number from 0 upward."); invalid.push("reorderLevel"); }
    if (data.location.length < 3) { errors.push("Enter the storage location."); invalid.push("location"); }
    const duplicate = ReliefStore.read("inventory").some((row) => row.name.toLowerCase() === data.name.toLowerCase() && row.id !== state.editing);
    if (duplicate) { errors.push("An item with that name is already in the inventory."); invalid.push("name"); }
    RR.markInvalid(form, invalid);
    RR.showFormErrors(document.getElementById("formAlert"), errors);
    if (errors.length) return;
    const payload = {
      name: data.name,
      category: data.category,
      quantity: Number(data.quantity),
      unit: data.unit,
      reorderLevel: Number(data.reorderLevel),
      location: data.location,
      lastNote: data.lastNote,
      updatedAt: RR.todayInput()
    };
    let id = state.editing;
    if (id) ReliefStore.update("inventory", id, payload);
    else {
      id = ReliefStore.nextNumberedId(ReliefStore.read("inventory"), "INV-", 3);
      ReliefStore.add("inventory", Object.assign({ id: id }, payload));
    }
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Updated inventory",
      detail: data.name + " now has " + payload.quantity + " " + payload.unit + ".",
      module: "inventory"
    });
    RR.toast(data.name + " was saved.");
    bootstrap.Modal.getInstance(document.getElementById("formModal")).hide();
    render();
  }

  async function remove(user, id) {
    const existing = ReliefStore.getById("inventory", id);
    const ok = await RR.confirmAction({
      title: "Delete " + (existing ? existing.name : id) + "?",
      message: "Past distribution records that name this item will keep their own goods list.",
      confirmLabel: "Delete item",
      danger: true
    });
    if (!ok) return;
    ReliefStore.remove("inventory", id);
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Deleted an inventory item",
      detail: (existing ? existing.name : id) + " was removed from inventory.",
      module: "inventory"
    });
    RR.toast("Item deleted.");
    render();
  }

  function init(user) {
    const filters = document.getElementById("filterForm");
    filters.q.value = RR.queryParam("q");
    filters.low.checked = RR.queryParam("low") === "1";
    const refresh = () => {
      RR.setQuery({ q: filters.q.value.trim(), low: filters.low.checked ? "1" : "" });
      render();
    };
    filters.addEventListener("submit", (event) => { event.preventDefault(); refresh(); });
    filters.addEventListener("input", refresh);
    document.getElementById("resetFilters").addEventListener("click", () => { filters.reset(); refresh(); });
    document.getElementById("addBtn").addEventListener("click", () => openForm(null));
    recordForm().addEventListener("submit", (event) => { event.preventDefault(); save(user); });
    document.getElementById("tableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const record = ReliefStore.getById("inventory", button.dataset.id);
      if (!record) return;
      if (button.dataset.action === "edit") openForm(record);
      if (button.dataset.action === "delete") remove(user, record.id);
    });
    RR.bindDataTools({
      user: user,
      fileName: "relief-inventory",
      label: "inventory",
      collection: "inventory",
      module: "inventory",
      allowImport: true,
      required: ["id", "name", "category", "quantity", "unit", "reorderLevel"],
      getRows: () => filtered(),
      onImported: render
    });
    render();
  }

  return { init };
})();
