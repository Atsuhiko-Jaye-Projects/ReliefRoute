/**
 * Shared interface for ReliefRoute.
 * Role checks here are for the classroom prototype only. They run in the
 * browser and can be bypassed. They are not production authentication.
 */
const RR = (() => {
  const BARANGAYS = [
    "Anapog-Sibucao", "Argao", "Balanacan", "Banto", "Bintakay", "Bocboc", "Butansapa",
    "Candahon", "Capayang", "Danao", "Dulong Bayan", "Gitnang Bayan", "Guisian",
    "Hinadharan", "Hinanggayon", "Ino", "Janagdong", "Lamesa", "Laon", "Magapua",
    "Malayak", "Malusak", "Mampaitan", "Mangyan-Mababad", "Market Site", "Mataas na Bayan",
    "Mendez", "Nangka I", "Nangka II", "Paye", "Pili", "Puting Buhangin", "Sayao",
    "Silangan", "Sumangga", "Tarug", "Villa Mendez"
  ];

  const CATEGORIES = [
    "Food packs",
    "Drinking water",
    "Hygiene kits",
    "Blankets and sleeping mats",
    "Medical supplies",
    "Temporary shelter materials",
    "Evacuation support"
  ];

  const PRIORITY = ["Low", "Medium", "High", "Critical"];
  const REQUEST_STATUS = ["Pending", "Under Review", "Approved", "In Progress", "Completed", "Rejected"];
  const AREA_STATUS = ["Needs Assessment", "Awaiting Assistance", "Assistance Scheduled", "Assistance Delivered", "Monitored"];
  const DELIVERY_STATUS = ["Scheduled", "Preparing", "Out for Delivery", "Delivered", "Partially Delivered", "Cancelled"];
  const ROLES = ["administrator", "coordinator", "barangay"];

  const NAV = [
    { page: "dashboard", href: "dashboard.html", icon: "bi-speedometer2", label: "Dashboard", roles: ROLES },
    { page: "requests", href: "relief-requests.html", icon: "bi-inboxes", label: "Relief Requests", roles: ROLES },
    { page: "areas", href: "priority-areas.html", icon: "bi-geo-alt", label: "Priority Areas", roles: ROLES },
    { page: "routes", href: "delivery-routes.html", icon: "bi-signpost-split", label: "Delivery Routes", roles: ["administrator", "coordinator"] },
    { page: "distribution", href: "distribution.html", icon: "bi-truck", label: "Distribution", roles: ROLES },
    { page: "inventory", href: "inventory.html", icon: "bi-box-seam", label: "Inventory", roles: ["administrator", "coordinator"] },
    { page: "reports", href: "reports.html", icon: "bi-bar-chart", label: "Reports", roles: ["administrator", "coordinator"] },
    { page: "users", href: "users.html", icon: "bi-people", label: "Users", roles: ["administrator"] }
  ];

  const PAGE_TITLES = {
    dashboard: "Dashboard",
    requests: "Relief Requests",
    areas: "Priority Areas",
    routes: "Delivery Routes",
    distribution: "Distribution",
    inventory: "Relief Inventory",
    reports: "Reports",
    users: "User Accounts"
  };

  const PERMISSIONS = {
    "requests.create": ROLES,
    "requests.status": ["administrator", "coordinator"],
    "requests.remarks": ["administrator", "coordinator"],
    "requests.delete": ["administrator"],
    "requests.import": ["administrator", "coordinator"],
    "areas.manage": ["administrator", "coordinator"],
    "routes.manage": ["administrator", "coordinator"],
    "distribution.manage": ["administrator", "coordinator"],
    "inventory.manage": ["administrator", "coordinator"],
    "users.manage": ["administrator"],
    "reports.view": ["administrator", "coordinator"],
    "data.restore": ["administrator"]
  };

  const PRIORITY_RANK = { Critical: 4, High: 3, Medium: 2, Low: 1 };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function roleLabel(role) {
    if (role === "administrator") return "Administrator";
    if (role === "coordinator") return "Relief Coordinator";
    if (role === "barangay") return "Barangay Representative";
    return role || "User";
  }

  function initials(name) {
    return String(name || "U")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(String(value).length === 10 ? value + "T00:00:00" : value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatWhen(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function todayInput() {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function priorityBadge(priority) {
    const map = {
      Critical: "rr-badge-critical",
      High: "rr-badge-high",
      Medium: "rr-badge-medium",
      Low: "rr-badge-low"
    };
    return '<span class="rr-badge ' + (map[priority] || "rr-badge-muted") + '">' + escapeHtml(priority || "—") + "</span>";
  }

  function statusBadge(status) {
    const map = {
      Pending: "rr-badge-muted",
      "Under Review": "rr-badge-warn",
      Approved: "rr-badge-info",
      "In Progress": "rr-badge-progress",
      Completed: "rr-badge-ok",
      Rejected: "rr-badge-danger",
      "Needs Assessment": "rr-badge-warn",
      "Awaiting Assistance": "rr-badge-progress",
      "Assistance Scheduled": "rr-badge-info",
      "Assistance Delivered": "rr-badge-ok",
      Monitored: "rr-badge-muted",
      Scheduled: "rr-badge-info",
      Preparing: "rr-badge-warn",
      "Out for Delivery": "rr-badge-progress",
      Delivered: "rr-badge-ok",
      "Partially Delivered": "rr-badge-warn",
      Cancelled: "rr-badge-danger",
      active: "rr-badge-ok",
      inactive: "rr-badge-muted"
    };
    return '<span class="rr-badge ' + (map[status] || "rr-badge-muted") + '">' + escapeHtml(status || "—") + "</span>";
  }

  function publicUser(user) {
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      barangay: user.barangay || "",
      status: user.status,
      email: user.email || ""
    };
  }

  function currentUser() {
    const id = ReliefStore.getSessionId();
    if (!id) return null;
    const user = ReliefStore.getById("users", id);
    if (!user || user.status !== "active") return null;
    return publicUser(user);
  }

  function userName(id) {
    if (!id) return "Unassigned";
    const user = ReliefStore.getById("users", id);
    return user ? user.fullName : "Unknown user";
  }

  function can(user, action) {
    return (PERMISSIONS[action] || []).includes(user.role);
  }

  function canEditRequest(user, request) {
    if (user.role === "administrator" || user.role === "coordinator") return true;
    return request.barangay === user.barangay && (request.status === "Pending" || request.status === "Under Review");
  }

  function scope(user, records) {
    if (user.role === "barangay") {
      return records.filter((row) => row.barangay === user.barangay);
    }
    return records.slice();
  }

  function optionsHtml(values, selected, placeholder) {
    let html = placeholder ? '<option value="">' + escapeHtml(placeholder) + "</option>" : "";
    values.forEach((value) => {
      html += '<option value="' + escapeHtml(value) + '"' + (value === selected ? " selected" : "") + ">" + escapeHtml(value) + "</option>";
    });
    return html;
  }

  function fillSelect(select, values, selected, placeholder) {
    if (!select) return;
    select.innerHTML = optionsHtml(values, selected || "", placeholder || "");
  }

  function peopleOptions(select, selected, placeholder) {
    const people = ReliefStore.read("users").filter((user) => {
      return user.status === "active" && (user.role === "administrator" || user.role === "coordinator");
    });
    let html = '<option value="">' + escapeHtml(placeholder || "Unassigned") + "</option>";
    people.forEach((person) => {
      html += '<option value="' + escapeHtml(person.id) + '"' + (person.id === selected ? " selected" : "") + ">" +
        escapeHtml(person.fullName) + " (" + escapeHtml(roleLabel(person.role)) + ")</option>";
    });
    select.innerHTML = html;
  }

  function queryParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function setQuery(params) {
    const url = new URL(window.location.href);
    Object.keys(params).forEach((key) => {
      if (params[key]) url.searchParams.set(key, params[key]);
      else url.searchParams.delete(key);
    });
    history.replaceState(null, "", url);
  }

  function paginate(items, page, size) {
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(page, 1), pages);
    const start = (current - 1) * size;
    return {
      items: items.slice(start, start + size),
      page: current,
      pages: pages,
      total: total,
      start: start
    };
  }

  function pagerHtml(state) {
    if (!state.total) return "";
    const from = state.start + 1;
    const to = state.start + state.items.length;
    return '<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">' +
      '<p class="small text-secondary mb-0">Showing ' + from + "–" + to + " of " + state.total + "</p>" +
      '<div class="btn-group">' +
      '<button type="button" class="btn btn-outline-secondary btn-sm" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? " disabled" : "") + ">Previous</button>" +
      '<button type="button" class="btn btn-outline-secondary btn-sm" disabled>' + state.page + " / " + state.pages + "</button>" +
      '<button type="button" class="btn btn-outline-secondary btn-sm" data-page="' + (state.page + 1) + '"' + (state.page >= state.pages ? " disabled" : "") + ">Next</button>" +
      "</div></div>";
  }

  function emptyRow(colspan, message) {
    return '<tr><td colspan="' + colspan + '"><div class="rr-empty"><i class="bi bi-inbox" aria-hidden="true"></i><p class="mb-0">' +
      escapeHtml(message) + "</p></div></td></tr>";
  }

  function detailGrid(rows) {
    return '<dl class="row mb-0">' + rows.map((row) => {
      const value = row.html != null ? row.html : escapeHtml(row.value == null || row.value === "" ? "—" : row.value);
      return '<dt class="col-sm-4">' + escapeHtml(row.label) + '</dt><dd class="col-sm-8">' + value + "</dd>";
    }).join("") + "</dl>";
  }

  function toast(message, type) {
    const holder = document.getElementById("rrToasts");
    if (!holder) return;
    const item = document.createElement("div");
    item.className = "toast show rr-toast " + (type === "error" ? "rr-toast-error" : "");
    item.setAttribute("role", "status");
    const body = document.createElement("div");
    body.className = "toast-body";
    body.textContent = message;
    const row = document.createElement("div");
    row.className = "d-flex";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close me-2 m-auto";
    close.setAttribute("aria-label", "Dismiss notification");
    close.addEventListener("click", () => item.remove());
    row.append(body, close);
    item.appendChild(row);
    holder.appendChild(item);
    setTimeout(() => item.remove(), 4800);
  }

  function confirmAction(options) {
    return new Promise((resolve) => {
      const modalEl = document.getElementById("rrConfirm");
      document.getElementById("rrConfirmTitle").textContent = options.title || "Please confirm";
      document.getElementById("rrConfirmBody").textContent = options.message || "";
      const ok = document.getElementById("rrConfirmOk");
      ok.textContent = options.confirmLabel || "Confirm";
      ok.className = options.danger ? "btn btn-rr-danger" : "btn btn-rr";
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        ok.removeEventListener("click", onOk);
        modalEl.removeEventListener("hidden.bs.modal", onHide);
        resolve(value);
      };
      const onOk = () => {
        finish(true);
        modal.hide();
      };
      const onHide = () => finish(false);
      ok.addEventListener("click", onOk);
      modalEl.addEventListener("hidden.bs.modal", onHide);
      modal.show();
    });
  }

  function showFormErrors(box, errors) {
    if (!box) return;
    if (!errors.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML = "<strong>Check the form</strong><ul class=\"mb-0\">" +
      errors.map((error) => "<li>" + escapeHtml(error) + "</li>").join("") + "</ul>";
    box.focus();
  }

  function markInvalid(form, names) {
    Array.from(form.elements).forEach((element) => element.removeAttribute("aria-invalid"));
    names.forEach((name) => {
      const element = form.elements[name];
      if (element && element.setAttribute) element.setAttribute("aria-invalid", "true");
    });
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch (error) {
          reject(new Error("That file is not valid JSON."));
        }
      };
      reader.onerror = () => reject(new Error("The file could not be read."));
      reader.readAsText(file);
    });
  }

  function bindDataTools(options) {
    const exportRows = () => options.getRows();
    document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
      const rows = exportRows();
      ReliefStore.download(options.fileName + ".json", JSON.stringify(rows, null, 2), "application/json");
      toast("JSON file downloaded.");
    });
    document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
      const rows = exportRows();
      if (!rows.length) {
        toast("There are no records to export.", "error");
        return;
      }
      ReliefStore.download(options.fileName + ".csv", ReliefStore.toCsv(rows), "text/csv;charset=utf-8");
      toast("CSV file downloaded.");
    });
    const input = document.getElementById("importJsonInput");
    const importBtn = document.getElementById("importJsonBtn");
    if (!options.allowImport && importBtn) importBtn.hidden = true;
    importBtn?.addEventListener("click", () => input && input.click());
    input?.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file || !options.allowImport) return;
      try {
        const data = await readJsonFile(file);
        const ok = await confirmAction({
          title: "Replace these records?",
          message: "Importing replaces the current " + options.label + " records stored in this browser. The original sample file in the project folder is not changed.",
          confirmLabel: "Replace records",
          danger: true
        });
        if (!ok) return;
        ReliefStore.replaceAll(options.collection, data, options.required, options.validate);
        ReliefStore.logActivity({
          actor: options.user.fullName,
          action: "Imported records",
          detail: options.label + " records were replaced from a JSON file.",
          module: options.module
        });
        toast("Records imported into this browser.");
        options.onImported();
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  function navHtml(user) {
    return NAV.filter((item) => item.roles.includes(user.role)).map((item) => {
      const active = item.page === document.body.dataset.page;
      return '<a class="rr-nav-link' + (active ? " active" : "") + '" href="' + item.href + '"' +
        (active ? ' aria-current="page"' : "") + '><i class="bi ' + item.icon + '" aria-hidden="true"></i><span>' +
        item.label + "</span></a>";
    }).join("");
  }

  function paintShell(user) {
    const page = document.body.dataset.page;
    const root = document.getElementById("page-root");
    const links = navHtml(user);
    const restore = can(user, "data.restore")
      ? '<li><button type="button" class="dropdown-item" id="restoreBtn">Restore sample data</button></li>'
      : "";
    const shell = document.createElement("div");
    shell.className = "rr-shell d-lg-flex";
    shell.innerHTML =
      '<a class="visually-hidden-focusable position-absolute top-0 start-0 m-2 btn btn-rr" href="#page-root">Skip to content</a>' +
      '<aside class="rr-sidebar d-none d-lg-flex flex-column">' +
      '<a class="rr-brand" href="dashboard.html"><span class="rr-mark" aria-hidden="true"><i class="bi bi-signpost-2"></i></span><span><strong>ReliefRoute</strong><small>Mogpog, Marinduque</small></span></a>' +
      '<nav class="rr-nav" aria-label="Main">' + links + "</nav>" +
      '<p class="rr-side-note mt-auto">Classroom prototype. Not an official emergency system.</p></aside>' +
      '<div class="rr-maincol"><header class="rr-topbar">' +
      '<button class="btn btn-outline-secondary d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#rrMobileNav" aria-controls="rrMobileNav" aria-label="Open menu"><i class="bi bi-list" aria-hidden="true"></i></button>' +
      "<div><h1>" + escapeHtml(PAGE_TITLES[page] || "ReliefRoute") + "</h1></div>" +
      '<div class="dropdown ms-auto"><button class="btn btn-light border d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">' +
      '<span class="rr-avatar" aria-hidden="true">' + escapeHtml(initials(user.fullName)) + "</span>" +
      '<span class="d-none d-sm-inline text-start lh-sm"><span class="d-block small fw-semibold">' + escapeHtml(user.fullName) +
      '</span><span class="d-block rr-fine">' + escapeHtml(roleLabel(user.role)) + "</span></span></button>" +
      '<ul class="dropdown-menu dropdown-menu-end"><li><span class="dropdown-item-text small text-secondary">' + escapeHtml(user.username) +
      "</span></li>" + restore + '<li><button type="button" class="dropdown-item" id="logoutBtn">Log out</button></li></ul></div></header>' +
      '<div id="rr-slot"></div>' +
      '<footer class="rr-footer">ReliefRoute coordinates sample relief records for Mogpog. It does not replace official emergency procedures or decisions by authorized personnel. Sign-in and role limits in this prototype run only in the browser.</footer></div>' +
      '<div class="offcanvas offcanvas-start rr-offcanvas" tabindex="-1" id="rrMobileNav" aria-labelledby="rrMobileLabel">' +
      '<div class="offcanvas-header"><h2 class="offcanvas-title h5" id="rrMobileLabel">ReliefRoute</h2><button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close menu"></button></div>' +
      '<div class="offcanvas-body p-0"><nav class="rr-nav" aria-label="Mobile">' + links + "</nav></div></div>" +
      '<div class="modal fade" id="rrConfirm" tabindex="-1" aria-labelledby="rrConfirmTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h2 class="modal-title h5" id="rrConfirmTitle">Confirm</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body" id="rrConfirmBody"></div><div class="modal-footer">' +
      '<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>' +
      '<button type="button" class="btn btn-rr-danger" id="rrConfirmOk">Confirm</button></div></div></div></div>' +
      '<div class="toast-container position-fixed bottom-0 end-0 p-3" id="rrToasts" aria-live="polite" aria-atomic="false"></div>';
    document.body.appendChild(shell);
    shell.querySelector("#rr-slot").appendChild(root);
    root.hidden = false;
    document.getElementById("rr-boot")?.remove();
    document.getElementById("logoutBtn").addEventListener("click", () => {
      ReliefStore.clearSession();
      window.location.href = "login.html";
    });
    document.getElementById("restoreBtn")?.addEventListener("click", async () => {
      const ok = await confirmAction({
        title: "Restore sample data?",
        message: "This clears prototype edits stored in this browser and loads the original JSON sample files again. Files you already downloaded are not changed.",
        confirmLabel: "Restore samples",
        danger: true
      });
      if (!ok) return;
      try {
        await ReliefStore.restoreSamples();
        const id = ReliefStore.getSessionId();
        if (id && !ReliefStore.getById("users", id)) ReliefStore.clearSession();
        toast("Sample data restored.");
        setTimeout(() => window.location.reload(), 400);
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  function safeNext(user) {
    const next = new URLSearchParams(window.location.search).get("next") || "dashboard.html";
    const item = NAV.find((entry) => entry.href === next);
    if (!item) return "dashboard.html";
    if (user && !item.roles.includes(user.role)) return "dashboard.html";
    return item.href;
  }

  function setupLogin() {
    document.getElementById("rr-boot")?.remove();
    const existing = currentUser();
    if (existing) {
      window.location.replace(safeNext(existing));
      return;
    }
    const form = document.getElementById("loginForm");
    const alertBox = document.getElementById("loginAlert");
    document.querySelectorAll("[data-demo]").forEach((button) => {
      button.addEventListener("click", () => {
        const parts = button.getAttribute("data-demo").split("|");
        form.username.value = parts[0];
        form.password.value = parts[1];
        form.username.focus();
      });
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      alertBox.hidden = true;
      const username = form.username.value.trim();
      const password = form.password.value;
      if (!username || !password) {
        alertBox.textContent = "Enter the username and password.";
        alertBox.hidden = false;
        return;
      }
      const user = ReliefStore.read("users").find((row) => row.username.toLowerCase() === username.toLowerCase());
      if (!user || user.password !== password) {
        alertBox.textContent = "Those credentials do not match a demo account.";
        alertBox.hidden = false;
        return;
      }
      if (user.status !== "active") {
        alertBox.textContent = "This demo account is inactive. An administrator can activate it from User Accounts.";
        alertBox.hidden = false;
        return;
      }
      ReliefStore.setSessionId(user.id);
      ReliefStore.logActivity({
        actor: user.fullName,
        action: "Signed in",
        detail: user.username + " opened a demo session.",
        module: "auth",
        barangay: user.barangay || ""
      });
      window.location.replace(safeNext(publicUser(user)));
    });
  }

  function startPage() {
    const user = currentUser();
    if (!user) {
      const here = window.location.pathname.split("/").pop() || "dashboard.html";
      window.location.replace("login.html?next=" + encodeURIComponent(here));
      return null;
    }
    paintShell(user);
    const item = NAV.find((entry) => entry.page === document.body.dataset.page);
    if (!item || !item.roles.includes(user.role)) {
      document.body.dataset.denied = "true";
      document.getElementById("page-root").innerHTML =
        '<section class="rr-card p-4"><h2 class="h4">This page is not available for your role</h2>' +
        "<p>Your demo account is a " + escapeHtml(roleLabel(user.role)) + ". Role limits in this prototype are enforced only with browser JavaScript.</p>" +
        '<a class="btn btn-rr" href="dashboard.html">Back to dashboard</a></section>';
    }
    return user;
  }

  async function boot(startModule) {
    const bootEl = document.getElementById("rr-boot");
    try {
      await ReliefStore.init();
      if (document.body.dataset.page === "login") {
        setupLogin();
        return;
      }
      const user = startPage();
      if (!user || document.body.dataset.denied === "true") return;
      if (typeof startModule === "function") startModule(user);
    } catch (error) {
      if (bootEl) {
        bootEl.hidden = false;
        bootEl.className = "alert alert-danger m-3";
        bootEl.textContent = error.message + "Open the project through a local web server, for example http://localhost/systemmm/ . Opening the HTML file directly usually blocks the Fetch API.";
      }
    }
  }

  function matchesQuery(record, query, fields) {
    if (!query) return true;
    const haystack = fields.map((field) => record[field] == null ? "" : typeof record[field] === "object" ? JSON.stringify(record[field]) : record[field]).join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function inDateRange(value, from, to) {
    if (!value) return !from && !to;
    const day = String(value).slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }

  function countBy(rows, field) {
    const counts = {};
    rows.forEach((row) => {
      const key = row[field] || "Unspecified";
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  function integerInRange(value, min, max) {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max;
  }

  return {
    BARANGAYS,
    CATEGORIES,
    PRIORITY,
    REQUEST_STATUS,
    AREA_STATUS,
    DELIVERY_STATUS,
    ROLES,
    PRIORITY_RANK,
    boot,
    escapeHtml,
    roleLabel,
    formatDate,
    formatWhen,
    todayInput,
    priorityBadge,
    statusBadge,
    currentUser,
    userName,
    can,
    canEditRequest,
    scope,
    fillSelect,
    peopleOptions,
    queryParam,
    setQuery,
    paginate,
    pagerHtml,
    emptyRow,
    detailGrid,
    toast,
    confirmAction,
    showFormErrors,
    markInvalid,
    bindDataTools,
    matchesQuery,
    inDateRange,
    countBy,
    integerInRange
  };
})();
