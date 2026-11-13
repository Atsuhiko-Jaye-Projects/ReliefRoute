/**
 * Dashboard figures are calculated from the records in this browser.
 */
const DashboardPage = (() => {
  let statusChart;
  let barangayChart;

  function drawChart(canvas, config) {
    if (!window.Chart || !canvas) return null;
    return new Chart(canvas, config);
  }

  function listCounts(target, counts, order) {
    const keys = order ? order.filter((key) => counts[key]) : Object.keys(counts);
    if (!keys.length) {
      target.innerHTML = "<li>No records in this view.</li>";
      return;
    }
    target.innerHTML = keys.map((key) => "<li><span>" + RR.escapeHtml(key) + "</span><strong>" + counts[key] + "</strong></li>").join("");
  }

  function init(user) {
    const requests = RR.scope(user, ReliefStore.read("requests"));
    const areas = RR.scope(user, ReliefStore.read("areas"));
    const distributions = RR.scope(user, ReliefStore.read("distributions"));
    const families = requests
      .filter((row) => row.status !== "Rejected")
      .reduce((sum, row) => sum + Number(row.affectedFamilies || 0), 0);
    const pending = requests.filter((row) => row.status === "Pending").length;
    const approved = requests.filter((row) => row.status === "Approved").length;
    const critical = areas.filter((row) => row.priority === "Critical").length;
    const delivered = distributions.filter((row) => row.status === "Delivered").length;

    const scope = document.getElementById("scopeNote");
    scope.textContent = user.role === "barangay"
      ? "Showing records for Barangay " + user.barangay + ". Counts come from data saved in this browser."
      : "Municipal view for Mogpog. Counts come from data saved in this browser.";

    const cards = [
      ["relief-requests.html", "bi-inboxes", "Total relief requests", requests.length, "All statuses in this view"],
      ["relief-requests.html?status=Pending", "bi-hourglass-split", "Pending requests", pending, "Status is Pending"],
      ["relief-requests.html?status=Approved", "bi-check2-square", "Approved requests", approved, "Status is Approved"],
      ["priority-areas.html?priority=Critical", "bi-exclamation-triangle", "Critical priority areas", critical, "Areas marked Critical"],
      ["relief-requests.html", "bi-people", "Affected families", families.toLocaleString("en-PH"), "Sum from requests that are not rejected"],
      ["distribution.html?status=Delivered", "bi-truck", "Delivered distributions", delivered, "Status is Delivered"]
    ];
    document.getElementById("statGrid").innerHTML = cards.map((card) => {
      return '<div class="col-12 col-sm-6 col-lg-4"><a class="rr-stat" href="' + card[0] + '">' +
        '<span class="rr-stat-icon"><i class="bi ' + card[1] + '" aria-hidden="true"></i></span><span>' +
        '<span class="rr-stat-label">' + card[2] + "</span>" +
        '<span class="rr-stat-value">' + RR.escapeHtml(card[3]) + "</span>" +
        '<span class="rr-stat-note">' + card[4] + "</span></span></a></div>";
    }).join("");

    const stockLine = document.getElementById("stockLine");
    if (user.role === "barangay") {
      stockLine.hidden = true;
    } else {
      const low = ReliefStore.read("inventory").filter((item) => Number(item.quantity) <= Number(item.reorderLevel));
      stockLine.hidden = false;
      stockLine.innerHTML = low.length
        ? '<a href="inventory.html?low=1">' + low.length + " inventory item" + (low.length === 1 ? "" : "s") + " at or below the reorder level</a>."
        : "No inventory item is below its reorder level.";
    }

    const statusCounts = RR.countBy(requests, "status");
    listCounts(document.getElementById("statusList"), statusCounts, RR.REQUEST_STATUS);
    const barangayCounts = RR.countBy(requests, "barangay");
    const barangayKeys = Object.keys(barangayCounts).sort((a, b) => barangayCounts[b] - barangayCounts[a] || a.localeCompare(b));
    listCounts(document.getElementById("barangayList"), barangayCounts, barangayKeys);

    const colors = ["#1E293B", "#F97316", "#EF4444", "#64748B", "#0F766E", "#CA8A04", "#0369A1"];
    if (window.Chart) {
      Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
      Chart.defaults.color = "#1E293B";
      if (statusChart) statusChart.destroy();
      if (barangayChart) barangayChart.destroy();
      const statusKeys = RR.REQUEST_STATUS.filter((key) => statusCounts[key]);
      statusChart = drawChart(document.getElementById("statusChart"), {
        type: "doughnut",
        data: {
          labels: statusKeys,
          datasets: [{ data: statusKeys.map((key) => statusCounts[key]), backgroundColor: colors, borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }
      });
      barangayChart = drawChart(document.getElementById("barangayChart"), {
        type: "bar",
        data: {
          labels: barangayKeys,
          datasets: [{ label: "Requests", data: barangayKeys.map((key) => barangayCounts[key]), backgroundColor: "#1E293B", borderRadius: 6 }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { ticks: { precision: 0 }, beginAtZero: true } }
        }
      });
    }

    const recent = requests.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
    document.getElementById("recentBody").innerHTML = recent.length ? recent.map((row) => {
      return "<tr><td><a href=\"relief-requests.html?q=" + encodeURIComponent(row.id) + "\">" + RR.escapeHtml(row.id) + "</a></td>" +
        "<td>" + RR.escapeHtml(row.barangay) + "</td><td>" + RR.escapeHtml(row.category) + "</td><td>" + RR.priorityBadge(row.priority) + "</td><td>" + RR.statusBadge(row.status) + "</td></tr>";
    }).join("") : RR.emptyRow(5, "No relief requests in this view.");

    let activities = ReliefStore.read("activities").slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    if (user.role === "barangay") {
      activities = activities.filter((row) => !row.barangay || row.barangay === user.barangay);
    }
    const feed = document.getElementById("activityFeed");
    feed.innerHTML = activities.slice(0, 6).map((row) => {
      return "<li><time datetime=\"" + RR.escapeHtml(row.at) + "\">" + RR.escapeHtml(RR.formatWhen(row.at)) + "</time><p class=\"mb-0\"><strong>" +
        RR.escapeHtml(row.action) + ".</strong> " + RR.escapeHtml(row.detail) + "</p></li>";
    }).join("") || "<li>No recent activity.</li>";
  }

  return { init };
})();
