/**
 * Demo accounts. Passwords are stored in plain text for the prototype only.
 */
const UsersPage = (() => {
  const state = { editing: null };

  function recordForm() {
    return document.getElementById("recordForm");
  }

  function filtered() {
    const filters = document.getElementById("filterForm");
    const query = filters.q.value.trim();
    const role = filters.role.value;
    const status = filters.status.value;
    return ReliefStore.read("users").filter((row) => {
      return RR.matchesQuery(row, query, ["id", "fullName", "username", "email", "barangay", "role"]) &&
        (!role || row.role === role) &&
        (!status || row.status === status);
    }).sort((a, b) => String(a.fullName).localeCompare(String(b.fullName)));
  }

  function render() {
    const rows = filtered();
    document.getElementById("resultCount").textContent = rows.length + (rows.length === 1 ? " account" : " accounts");
    const body = document.getElementById("tableBody");
    if (!rows.length) {
      body.innerHTML = RR.emptyRow(7, "No accounts match these filters.");
      return;
    }
    body.innerHTML = rows.map((row) => {
      return "<tr><td>" + RR.escapeHtml(row.fullName) + "<div class=\"small text-secondary\">" + RR.escapeHtml(row.username) + "</div></td><td>" +
        RR.escapeHtml(RR.roleLabel(row.role)) + "</td><td>" + RR.escapeHtml(row.barangay || "—") + "</td><td>" + RR.escapeHtml(row.email) +
        "</td><td>" + RR.statusBadge(row.status) + "</td><td>" + RR.escapeHtml(row.id) +
        "</td><td><div class=\"d-flex flex-wrap gap-1\"><button type=\"button\" class=\"btn btn-sm btn-outline-secondary\" data-action=\"edit\" data-id=\"" +
        RR.escapeHtml(row.id) + "\">Edit</button><button type=\"button\" class=\"btn btn-sm btn-outline-danger\" data-action=\"delete\" data-id=\"" +
        RR.escapeHtml(row.id) + "\">Delete</button></div></td></tr>";
    }).join("");
  }

  function toggleBarangay() {
    const form = recordForm();
    const needed = form.role.value === "barangay";
    document.getElementById("barangayRequired").hidden = !needed;
    form.barangay.required = needed;
  }

  function openForm(record) {
    const form = recordForm();
    state.editing = record ? record.id : null;
    form.reset();
    RR.showFormErrors(document.getElementById("formAlert"), []);
    form.role.innerHTML = RR.ROLES.map((role) => {
      return '<option value="' + RR.escapeHtml(role) + '"' + (role === (record ? record.role : "coordinator") ? " selected" : "") + ">" + RR.escapeHtml(RR.roleLabel(role)) + "</option>";
    }).join("");
    RR.fillSelect(form.barangay, RR.BARANGAYS, record ? record.barangay : "", "Not assigned");
    form.status.innerHTML = '<option value="active"' + (!record || record.status === "active" ? " selected" : "") + '>Active</option><option value="inactive"' + (record && record.status === "inactive" ? " selected" : "") + ">Inactive</option>";
    form.fullName.value = record ? record.fullName : "";
    form.username.value = record ? record.username : "";
    form.email.value = record ? record.email : "";
    form.password.value = "";
    document.getElementById("passwordHelp").textContent = record
      ? "Leave the password blank to keep the current demo password."
      : "Use at least 8 characters. Demo passwords are stored in plain text in this browser.";
    document.getElementById("userModalTitle").textContent = record ? "Edit account" : "New account";
    toggleBarangay();
    bootstrap.Modal.getOrCreateInstance(document.getElementById("formModal")).show();
  }

  function activeAdmins(exceptId, nextRole, nextStatus) {
    return ReliefStore.read("users").filter((row) => {
      if (row.id === exceptId) return nextRole === "administrator" && nextStatus === "active";
      return row.role === "administrator" && row.status === "active";
    }).length;
  }

  function save(user) {
    const form = recordForm();
    const data = {
      fullName: form.fullName.value.trim(),
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      role: form.role.value,
      barangay: form.role.value === "barangay" ? form.barangay.value : "",
      status: form.status.value
    };
    const errors = [];
    const invalid = [];
    if (data.fullName.length < 3) { errors.push("Enter the full name."); invalid.push("fullName"); }
    if (!/^[a-zA-Z0-9.]{3,30}$/.test(data.username)) { errors.push("Username must be 3 to 30 letters, numbers, or dots."); invalid.push("username"); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { errors.push("Enter a valid email address. A .local demo address is fine."); invalid.push("email"); }
    if (!RR.ROLES.includes(data.role)) { errors.push("Select a role."); invalid.push("role"); }
    if (data.role === "barangay" && !RR.BARANGAYS.includes(data.barangay)) { errors.push("Assign a barangay to this representative."); invalid.push("barangay"); }
    if (!["active", "inactive"].includes(data.status)) { errors.push("Select a status."); invalid.push("status"); }
    if (!state.editing && data.password.length < 8) { errors.push("Set a password of at least 8 characters."); invalid.push("password"); }
    if (state.editing && data.password && data.password.length < 8) { errors.push("A replacement password must be at least 8 characters."); invalid.push("password"); }
    const taken = ReliefStore.read("users").some((row) => row.username.toLowerCase() === data.username.toLowerCase() && row.id !== state.editing);
    if (taken) { errors.push("That username is already used."); invalid.push("username"); }
    if (state.editing === user.id && (data.role !== user.role || data.status !== "active")) {
      errors.push("You cannot change your own role or deactivate the account you are using.");
    }
    if (state.editing && activeAdmins(state.editing, data.role, data.status) < 1) {
      errors.push("Keep at least one active administrator.");
    }
    RR.markInvalid(form, invalid);
    RR.showFormErrors(document.getElementById("formAlert"), errors);
    if (errors.length) return;
    if (state.editing) {
      const existing = ReliefStore.getById("users", state.editing);
      ReliefStore.update("users", state.editing, {
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password ? data.password : existing.password,
        role: data.role,
        barangay: data.barangay,
        status: data.status
      });
      RR.toast(data.fullName + " was saved.");
    } else {
      const id = ReliefStore.nextNumberedId(ReliefStore.read("users"), "USR-", 3);
      ReliefStore.add("users", {
        id: id,
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        barangay: data.barangay,
        status: data.status
      });
      RR.toast(data.username + " was added.");
    }
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Updated a user account",
      detail: data.username + " is an " + RR.roleLabel(data.role) + " (" + data.status + ").",
      module: "users",
      barangay: data.barangay
    });
    bootstrap.Modal.getInstance(document.getElementById("formModal")).hide();
    render();
  }

  async function remove(user, id) {
    if (id === user.id) {
      RR.toast("You cannot delete the account you are using.", "error");
      return;
    }
    const existing = ReliefStore.getById("users", id);
    if (existing && existing.role === "administrator" && existing.status === "active" && activeAdmins(id, "", "inactive") < 1) {
      RR.toast("Keep at least one active administrator.", "error");
      return;
    }
    const ok = await RR.confirmAction({
      title: "Delete this account?",
      message: "The person will no longer be able to sign in on this browser. Older records will keep their stored user ID.",
      confirmLabel: "Delete account",
      danger: true
    });
    if (!ok) return;
    ReliefStore.remove("users", id);
    ReliefStore.logActivity({
      actor: user.fullName,
      action: "Deleted a user account",
      detail: (existing ? existing.username : id) + " was deleted.",
      module: "users"
    });
    RR.toast("Account deleted.");
    render();
  }

  function init(user) {
    const filters = document.getElementById("filterForm");
    filters.role.innerHTML = '<option value="">All roles</option>' + RR.ROLES.map((role) => {
      return '<option value="' + RR.escapeHtml(role) + '">' + RR.escapeHtml(RR.roleLabel(role)) + "</option>";
    }).join("");
    filters.status.innerHTML = '<option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>';
    const refresh = () => render();
    filters.addEventListener("submit", (event) => { event.preventDefault(); refresh(); });
    filters.addEventListener("input", refresh);
    document.getElementById("resetFilters").addEventListener("click", () => { filters.reset(); refresh(); });
    document.getElementById("addBtn").addEventListener("click", () => openForm(null));
    recordForm().role.addEventListener("change", toggleBarangay);
    recordForm().addEventListener("submit", (event) => { event.preventDefault(); save(user); });
    document.getElementById("tableBody").addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const record = ReliefStore.getById("users", button.dataset.id);
      if (!record) return;
      if (button.dataset.action === "edit") openForm(record);
      if (button.dataset.action === "delete") remove(user, record.id);
    });
    RR.bindDataTools({
      user: user,
      fileName: "users",
      label: "user",
      collection: "users",
      module: "users",
      allowImport: true,
      required: ["id", "fullName", "username", "password", "role", "status"],
      validate: (row, index) => RR.ROLES.includes(row.role) ? "" : "Row " + (index + 1) + " has an unknown role.",
      getRows: () => filtered(),
      onImported: render
    });
    render();
  }

  return { init };
})();
