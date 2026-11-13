/**
 * Reports are calculated from the prototype records currently in the browser.
 */
const ReportsPage = (() => {
  let statusChart;
  let priorityChart;

  function filters() {
    return {
      from: document.getElementById("filterForm").from.value,
      to: document.getElementById("filterForm").to.value,
      barangay: document.getElementById("filterForm").barangay.value
    };
  }

  function requests() {
    const filter = filters();
    return ReliefStore.read("requests").filter((row) => {
      return RR.inDateRange(row.requestDate, filter.from, filter.to) && (!filter.barangay || row.barangay === filter.barangay);
    });
  }

  function distributions() {
    const filter = filters();
    return ReliefStore.read("distributions").filter((row) => {
      return RR.inDateRange(row.date, filter.from, filter.to) && (!filter.barangay || row.barangay === filter.barangay);
    });
  }

  function goodsTotals(rows) {
    const totals = {};
    rows.forEach((row) => {
      if (row.status !== "Delivered" && row.status !== "Partially Delivered") return;
      (row.items || []).forEach((item) => {
        const key = item.name + "||" + item.unit;
        if (!totals[key]) totals[key] = { name: item.name, unit: item.unit, quantity: 0 };
        totals[key].quantity += Number(item.quantity || 0);
      });
    });
    return Object.values(totals).sort((a, b) => a.name.localeCompare(b.name));
  }

  function render() {
    const requestRows = requests();
    const distributionRows = distributions();
    const families = requestRows.filter((row) => row.status !== "Rejected").reduce((sum, row) => sum + Number(row.affectedFamilies || 0), 0);
    const delivered = distributionRows.filter((row) => row.status === "Delivered");
    const served = distributionRows.reduce((sum, row) => sum + Number(row.familiesServed || 0), 0);
    document.getElementById("reportSummary").innerHTML = [
      ["Relief requests", requestRows.length],
      ["Affected families", families.toLocaleString("en-PH")],
      ["Delivered distributions", delivered.length],
      ["Families served", served.toLocaleString("en-PH")]
    ].map((item) => '<div class="col-6 col-lg-3"><div class="rr-card p-3 h-100"><p class="small text-secondary mb-1">' + item[0] + '</p><p class="h4 mb-0">' + item[1] + "</p></div></div>").join("");

    const byStatus = RR.countBy(requestRows, "status");
    const byPriority = RR.countBy(requestRows, "priority");
    const byBarangay = RR.countBy(requestRows, "barangay");
    document.getElementById("statusTable").innerHTML = tableFromCounts(byStatus, RR.REQUEST_STATUS, "Status", "Requests") || emptyLine("No requests in this date range.");
    document.getElementById("priorityTable").innerHTML = tableFromCounts(byPriority, RR.PRIORITY, "Priority", "Requests") || emptyLine("No requests in this date range.");
    const barangayKeys = Object.keys(byBarangay).sort((a, b) => byBarangay[b] - byBarangay[a] || a.localeCompare(b));
    document.getElementById("barangayTable").innerHTML = barangayKeys.length ? barangayKeys.map((key) => {
      return "<tr><td>" + RR.escapeHtml(key) + "</td><td class=\"text-end\">" + byBarangay[key] + "</td></tr>";
    }).join("") : emptyLine("No requests in this date range.");

    const goods = goodsTotals(distributionRows);
    document.getElementById("goodsTable").innerHTML = goods.length ? goods.map((item) => {
      return "<tr><td>" + RR.escapeHtml(item.name) + "</td><td class=\"text-end\">" + item.quantity.toLocaleString("en-PH") + "</td><td>" + RR.escapeHtml(item.unit) + "</td></tr>";
    }).join("") : emptyLine("No delivered or partially delivered goods in this range.");

    document.getElementById("historyBody").innerHTML = distributionRows.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((row) => {
      const goodsText = (row.items || []).map((item) => item.quantity + " " + item.unit + " " + item.name).join(", ");
      return "<tr><td>" + RR.escapeHtml(row.deliveryReference || row.id) + "</td><td>" + RR.escapeHtml(RR.formatDate(row.date)) + "</td><td>" +
        RR.escapeHtml(row.barangay) + "</td><td>" + RR.escapeHtml(goodsText) + "</td><td class=\"text-end\">" + Number(row.familiesServed || 0) +
        "</td><td>" + RR.statusBadge(row.status) + "</td></tr>";
    }).join("") || RR.emptyRow(6, "No distributions in this range.");

    document.getElementById("generatedAt").textContent = "Generated " + RR.formatWhen(new Date().toISOString()) + " from records in this browser.";
    draw(byStatus, byPriority);
  }

  function emptyLine(message) {
    return '<tr><td colspan="3" class="text-secondary">' + RR.escapeHtml(message) + "</td></tr>";
  }

  function chartOrClear(existing, canvas, config) {
    if (existing) existing.destroy();
    if (!window.Chart || !canvas || !config.data.labels.length) return null;
    return new Chart(canvas, config);
  }

  function tableFromCounts(counts, order, label) {
    const keys = (order || Object.keys(counts)).filter((key) => counts[key]);
    if (!keys.length) return "";
    return keys.map((key) => "<tr><td>" + RR.escapeHtml(key) + "</td><td class=\"text-end\">" + counts[key] + "</td></tr>").join("");
  }

  function draw(byStatus, byPriority) {
    if (!window.Chart) return;
    const colors = ["#1E293B", "#F97316", "#EF4444", "#64748B", "#0F766E", "#CA8A04", "#0369A1"];
    const statusKeys = RR.REQUEST_STATUS.filter((key) => byStatus[key]);
    const priorityKeys = RR.PRIORITY.filter((key) => byPriority[key]);
    statusChart = chartOrClear(statusChart, document.getElementById("statusChart"), {
      type: "bar",
      data: { labels: statusKeys, datasets: [{ label: "Requests", data: statusKeys.map((key) => byStatus[key]), backgroundColor: "#1E293B", borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 }, beginAtZero: true } } }
    });
    priorityChart = chartOrClear(priorityChart, document.getElementById("priorityChart"), {
      type: "doughnut",
      data: { labels: priorityKeys, datasets: [{ data: priorityKeys.map((key) => byPriority[key]), backgroundColor: colors.slice(0, Math.max(priorityKeys.length, 1)), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
    });
  }

  function snapshot() {
    const requestRows = requests();
    const distributionRows = distributions();
    return {
      generatedAt: new Date().toISOString(),
      filters: filters(),
      totals: {
        requests: requestRows.length,
        affectedFamilies: requestRows.filter((row) => row.status !== "Rejected").reduce((sum, row) => sum + Number(row.affectedFamilies || 0), 0),
        deliveredDistributions: distributionRows.filter((row) => row.status === "Delivered").length,
        familiesServed: distributionRows.reduce((sum, row) => sum + Number(row.familiesServed || 0), 0)
      },
      requestsByStatus: RR.countBy(requestRows, "status"),
      requestsByPriority: RR.countBy(requestRows, "priority"),
      requestsByBarangay: RR.countBy(requestRows, "barangay"),
      goodsDistributed: goodsTotals(distributionRows),
      requests: requestRows,
      distributions: distributionRows
    };
  }

  function init() {
    const form = document.getElementById("filterForm");
    RR.fillSelect(form.barangay, RR.BARANGAYS, "", "All barangays");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      render();
    });
    form.addEventListener("input", render);
    document.getElementById("resetFilters").addEventListener("click", () => {
      form.reset();
      render();
    });
    document.getElementById("exportJsonBtn").addEventListener("click", () => {
      ReliefStore.download("reliefroute-report.json", JSON.stringify(snapshot(), null, 2), "application/json");
      RR.toast("Report JSON downloaded.");
    });
    document.getElementById("exportCsvBtn").addEventListener("click", () => {
      const rows = requests();
      if (!rows.length) {
        RR.toast("There are no requests in this report to export.", "error");
        return;
      }
      ReliefStore.download("relief-requests-report.csv", ReliefStore.toCsv(rows), "text/csv;charset=utf-8");
      RR.toast("Request CSV downloaded.");
    });
    document.getElementById("exportDistCsvBtn").addEventListener("click", () => {
      const rows = distributions().map((row) => ({
        id: row.id,
        deliveryReference: row.deliveryReference,
        barangay: row.barangay,
        date: row.date,
        goods: (row.items || []).map((item) => item.quantity + " " + item.unit + " " + item.name).join("; "),
        familiesServed: row.familiesServed,
        status: row.status,
        personnel: row.personnel,
        remarks: row.remarks
      }));
      if (!rows.length) {
        RR.toast("There are no distributions in this report to export.", "error");
        return;
      }
      ReliefStore.download("distributions-report.csv", ReliefStore.toCsv(rows), "text/csv;charset=utf-8");
      RR.toast("Distribution CSV downloaded.");
    });
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    render();
  }

  return { init };
})();
