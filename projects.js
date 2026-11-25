const owner = "BlackBearRedux";
const profile = `https://github.com/${owner}?tab=repositories`;
const cacheKey = `github-projects:${owner}`;
const list = document.querySelector("#projects");
const status = document.querySelector("#status");

async function fetchProjects() {
  const projects = [];
  const endpoint = `https://api.github.com/users/${owner}/repos`;
  const signal = AbortSignal.timeout(10000);

  for (let page = 1; ; page++) {
    const response = await fetch(`${endpoint}?type=owner&sort=updated&per_page=100&page=${page}`, { signal });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Unexpected GitHub response");

    for (const repo of batch) {
      if (repo.private || repo.owner?.login.toLowerCase() !== owner.toLowerCase()) continue;
      if (repo.name.toLowerCase() === `${owner.toLowerCase()}.github.io`) continue;
      projects.push({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
      });
    }
    if (batch.length < 100 || !response.headers.get("link")?.includes('rel="next"')) return projects;
  }
}

function render(projects, cached = false) {
  const rows = document.createDocumentFragment();
  for (const project of projects) {
    const row = document.createElement("li");
    row.className = "project";
    const details = document.createElement("div");
    const heading = document.createElement("h3");
    const link = document.createElement("a");
    link.href = `https://github.com/${owner}/${encodeURIComponent(project.name)}`;
    link.textContent = project.name;
    heading.append(link);
    details.append(heading);
    if (project.description) {
      const description = document.createElement("p");
      description.textContent = project.description;
      details.append(description);
    }
    row.append(details);

    const metadata = [
      project.language,
      project.stars > 0 && `${project.stars.toLocaleString()} ${project.stars === 1 ? "star" : "stars"}`,
    ].filter(Boolean);
    if (metadata.length) {
      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = metadata.join(" · ");
      row.append(meta);
    }
    rows.append(row);
  }
  list.replaceChildren(rows);
  const count = projects.length;
  status.textContent = `${count} ${count === 1 ? "project" : "projects"}${cached ? " · saved list" : ""}`;
}

async function load() {
  try {
    const projects = await fetchProjects();
    render(projects);
    try { localStorage.setItem(cacheKey, JSON.stringify(projects)); } catch {}
  } catch {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (Array.isArray(cached)) {
        render(cached, true);
        return;
      }
    } catch {}
    const link = document.createElement("a");
    link.href = profile;
    link.textContent = "View repositories on GitHub";
    status.replaceChildren("Couldn’t load projects. ", link);
  }
}

load();
