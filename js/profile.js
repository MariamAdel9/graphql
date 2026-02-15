(async function init() {
  const token = localStorage.getItem("jwt");

  if (!token) {
    location.href = "login.html";
    return;
  }

  try {
    await loadUser();
    await chart();
    await testPaths();
    await audits();
    await renderSkillsRadarModule250();
    await renderXpTimeline();
  } catch (err) {
    console.error("Profile Error:", err);
  }
})();

async function loadUser() {
  const data = await query(`
    query {
      user {
        id
        login
      }
    }
  `);

  console.log("User data:", data);

  document.getElementById(
    "userLogin"
  ).textContent = `Welcome, ${data.user[0].login}`;
}
