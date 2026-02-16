//testing function to see how the data is fetched

async function testPaths() {
  const data = await query(`
    query {
      transaction(
        where: { type: { _like: "skill_%" } }
        limit: 1000
      ) {
        path
        amount
        type
      }

      progress(
        limit: 1000
      ) {
        path
        grade
        createdAt
      }
    }
  `);

  console.log(
    "SKILLS:",
    data.transaction.map((t) => ({
      path: t.path,
      skill: t.type,
      amount: t.amount,
    }))
  );

  console.log(
    "PROGRESS:",
    data.progress.map((p) => ({
      path: p.path,
      grade: p.grade,
      date: p.createdAt,
    }))
  );
}

function formatXP(bytes) {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(2) + " MB";
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + " KB";
  return bytes + " B";
}

async function chart() {
  //use the transaction table to get the xp amounts
  //result table to get pass / fail
  const data = await query(`
    query {
      transaction(where: { type: { _eq: "xp" } }) {
      amount
      createdAt
      }

      result {
      grade}
    }
  `);

  //   console.log("Stats data:", data);

  // calc the sum of xp through all paths
  const totalXp = data.transaction.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById("totalXp").textContent = `Your total xp ${formatXP(
    totalXp
  )}`;

  //check the result table to filter through the passes and fails , including all the paths
  const pass = data.result.filter((r) => r.grade >= 1);
  const fail = data.result.filter((r) => r.grade <= 0);

  const passTotal = pass.length;
  const failTotal = fail.length;

  document.getElementById(
    "passFail"
  ).textContent = `Pass/fail ratio: ${passTotal} / ${failTotal}`;
}
async function audits() {
  try {
    const data = await query(`
      query {
        transaction {
          type
          amount
        }
      }
    `);

    let done = 0;
    let received = 0;

    data.transaction.forEach((t) => {
      if (t.type === "up") done += t.amount;
      if (t.type === "down") received += t.amount;
    });

    const ratio = received ? done / received : 0;

    document.getElementById("doneValue").textContent = done;
    document.getElementById("receivedValue").textContent = received;

    document.getElementById("ratioValue").textContent = ratio.toFixed(2);

    // map ratio to degrees
    // 1 = 180deg (half ring)
    // 2 = 360deg (full ring)
    const progressDeg = Math.min(ratio / 2, 1) * 360;

    document
      .getElementById("ratioRing")
      .style.setProperty("--progress", `${progressDeg}deg`);
  } catch (err) {
    console.error(err);
  }
}

async function renderSkillsRadarModule250() {
  const el = document.getElementById("skillsChart");
  if (!el) return;

  try {
    const data = await query(`
      query {
        transaction(
          where: {
            path: { _like: "/bahrain/bh-module/%" }
            type: { _like: "skill_%" }
          }
          limit: 1000
        ) {
          type
          amount
        }
      }
    `);

    const totals = {};
    data.transaction.forEach((t) => {
      const skill = t.type.replace("skill_", "");
      totals[skill] = (totals[skill] || 0) + t.amount;
    });

    const skills = Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    if (!skills.length) {
      el.innerHTML = "<p>No skills data</p>";
      return;
    }

    const size = 500;
    const center = size / 2;
    const maxValue = Math.max(...skills.map(([, v]) => v));
    const maxRadius = 70;

    const angleStep = (Math.PI * 2) / skills.length;

    const bubbles = skills
      .map(([skill, value], i) => {
        const angle = i * angleStep;
        const orbit = 140;
        const cx = center + orbit * Math.cos(angle);
        const cy = center + orbit * Math.sin(angle);

        const r = Math.max(18, (value / maxValue) * maxRadius);

        return `
        <g>
          <circle
            cx="${cx}"
            cy="${cy}"
            r="${r}"
            fill="rgba(170,140,255,0.65)"
            stroke-width="2"
          />
          <text
            x="${cx}"
            y="${cy}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="#fff"
            font-size="13"
            font-weight="600"
          >
            ${skill.toUpperCase()}
          </text>
          <text
            x="${cx}"
            y="${cy + r + 16}"
            text-anchor="middle"
            fill="#aaa"
            font-size="11"
          >
           
          </text>
        </g>
      `;
      })
      .join("");

    el.innerHTML = `
    
      <svg width="${size}" height="${size}">
        ${bubbles}
      </svg>
    `;
  } catch (err) {
    console.error(err);
    el.innerHTML = "<p style='color:red'>Skills data unavailable</p>";
  }
}

const tooltip = document.createElement("div");
tooltip.id = "xpTooltip";
tooltip.className = "xp-tooltip";
document.body.appendChild(tooltip);

async function renderXpTimeline() {
  const svg = document.getElementById("xpSvg");
  const line = document.getElementById("xpLine");
  const pointsGroup = document.getElementById("xpPoints");
  const xLabelsGroup = document.getElementById("xLabels");
  const yLabelsGroup = document.getElementById("yLabels");
  const tooltip = document.getElementById("xpTooltip");
  const yAxis = document.getElementById("yAxis");
  const xAxis = document.getElementById("xAxis");

  if (!svg || !line || !pointsGroup || !tooltip) return;

  /* ================= FETCH DATA ================= */
  const data = await query(`
    query {
      transaction(
        where: {
          _and: [
            { type: { _eq: "xp" } }
            { path: { _nlike: "/bahrain/bh-module/piscine-js%" } }
            { path: { _nlike: "%checkpoint%" } }
            { path: { _nlike: "%quest%" } }
          ]
        }
        order_by: { createdAt: asc }
      ) {
        amount
        createdAt
        path
      }
    }
  `);

  if (!data.transaction.length) return;

  /* ================= PROCESS DATA ================= */
  let cumulative = 0;
  const points = data.transaction.map((t) => {
    cumulative += t.amount;
    return {
      date: new Date(t.createdAt),
      added: t.amount,
      xp: cumulative,
      project: t.path.split("/").pop(),
    };
  });

  /* ================= CHART METRICS ================= */
  const width = 600;
  const height = 240;
  const padding = 50;
  const maxXp = Math.max(...points.map((p) => p.xp)) || 1;
  const ySteps = 4;

  const denom = Math.max(points.length - 1, 1);

  const coords = points.map((p, i) => {
    const x = padding + (i / denom) * (width - padding * 2);

    const y = height - padding - (p.xp / maxXp) * (height - padding * 2);

    return { x, y, ...p };
  });

  /* ================= AXES ================= */
  yAxis.setAttribute("x1", padding);
  yAxis.setAttribute("y1", padding);
  yAxis.setAttribute("x2", padding);
  yAxis.setAttribute("y2", height - padding);

  xAxis.setAttribute("x1", padding);
  xAxis.setAttribute("y1", height - padding);
  xAxis.setAttribute("x2", width - padding);
  xAxis.setAttribute("y2", height - padding);

  /* ================= Y AXIS LABELS (XP) ================= */
  yLabelsGroup.innerHTML = "";

  for (let i = 0; i <= ySteps; i++) {
    const value = Math.round((maxXp / ySteps) * i);
    const y = height - padding - (value / maxXp) * (height - padding * 2);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

    text.setAttribute("x", padding - 10);
    text.setAttribute("y", y + 4);
    text.setAttribute("text-anchor", "end");
    text.setAttribute("fill", "#777");
    text.setAttribute("font-size", "11");
    text.textContent = value;

    yLabelsGroup.appendChild(text);
  }

  /* ================= X AXIS LABELS (DATES) ================= */
  xLabelsGroup.innerHTML = "";
  const labelStep = Math.ceil(coords.length / 6);

  coords.forEach((c, i) => {
    if (i % labelStep !== 0) return;

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

    text.setAttribute("x", c.x);
    text.setAttribute("y", height - padding + 18);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "#777");
    text.setAttribute("font-size", "11");
    text.textContent = c.date.toLocaleDateString();

    xLabelsGroup.appendChild(text);
  });

  /* ================= LINE ================= */
  line.setAttribute("points", coords.map((c) => `${c.x},${c.y}`).join(" "));

  /* ================= POINTS + ANCHORED TOOLTIP ================= */
  pointsGroup.innerHTML = "";

  coords.forEach((c) => {
    const circle = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );

    circle.setAttribute("cx", c.x);
    circle.setAttribute("cy", c.y);
    circle.setAttribute("r", 4);
    circle.setAttribute("fill", "#7c83ff");
    circle.style.cursor = "pointer";

    circle.addEventListener("mouseenter", () => {
      tooltip.innerHTML = `
    <b>${c.project}</b><br>
    Date: ${c.date.toLocaleDateString()}<br>
    XP added: +${formatXP(c.added)}<br>
    Total XP: ${formatXP(c.xp)}
  `;

      tooltip.classList.add("show");

      // wait one frame so tooltip has dimensions
      requestAnimationFrame(() => {
        const dotRect = circle.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();

        let top = dotRect.top - tipRect.height - 12;
        let left = dotRect.left + dotRect.width / 2 - tipRect.width / 2;

        // keep inside viewport
        if (left < 8) left = 8;
        if (left + tipRect.width > window.innerWidth - 8) {
          left = window.innerWidth - tipRect.width - 8;
        }
        if (top < 8) {
          top = dotRect.bottom + 12; // fallback below if no space
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
      });
    });

    circle.addEventListener("mouseleave", () => {
      tooltip.classList.remove("show");
    });

    pointsGroup.appendChild(circle);
  });
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  return (bytes / 1024).toFixed(2) + " KB";
}


