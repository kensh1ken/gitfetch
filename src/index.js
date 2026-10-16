const API_BASE_URL = "https://api.github.com";

export async function fetchUser(username, fetchImplementation = fetch) {
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    throw new Error("Please provide a GitHub username.");
  }

  let response;
  try {
    response = await fetchImplementation(
      `${API_BASE_URL}/users/${encodeURIComponent(cleanUsername)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "gitfetch-cli",
          "X-GitHub-Api-Version": "2026-03-10",
        },
      },
    );
  } catch {
    throw new Error(
      "Could not reach GitHub. Check your internet connection and try again.",
    );
  }

  if (response.status === 404) {
    throw new Error(`GitHub user \"${cleanUsername}\" was not found.`);
  }

  if (response.status === 403 || response.status === 429) {
    const resetAt = response.headers.get("x-ratelimit-reset");
    const resetMessage = resetAt
      ? ` Try again after ${new Date(Number(resetAt) * 1000).toLocaleTimeString()}.`
      : "";
    throw new Error(`GitHub rate limit reached.${resetMessage}`);
  }

  if (!response.ok) {
    throw new Error(
      `GitHub returned ${response.status} ${response.statusText}.`,
    );
  }

  return response.json();
}

export async function fetchEvents(username, fetchImplementation = fetch) {
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    throw new Error("Please provide a GitHub username.");
  }

  let response;
  try {
    response = await fetchImplementation(
      `${API_BASE_URL}/users/${encodeURIComponent(cleanUsername)}/events`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "gitfetch-cli",
          "X-GitHub-Api-Version": "2026-03-10",
        },
      },
    );
  } catch {
    throw new Error(
      "Could not reach GitHub. Check your internet connection and try again.",
    );
  }

  if (!response.ok) {
    throw new Error(`Could not load events: GitHub returned ${response.status} ${response.statusText}.`);
  }

  return response.json();
}

export async function fetchRecentCommits(username, fetchImplementation = fetch) {
  const cleanUsername = username.trim();

  if (!cleanUsername) {
    throw new Error("Please provide a GitHub username.");
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "gitfetch-cli",
    "X-GitHub-Api-Version": "2026-03-10",
  };
  let repositoriesResponse;

  try {
    repositoriesResponse = await fetchImplementation(
      `${API_BASE_URL}/users/${encodeURIComponent(cleanUsername)}/repos?sort=pushed&direction=desc&per_page=100`,
      { headers },
    );
  } catch {
    throw new Error(
      "Could not reach GitHub. Check your internet connection and try again.",
    );
  }

  if (!repositoriesResponse.ok) {
    throw new Error(
      `Could not load public repositories: GitHub returned ${repositoriesResponse.status} ${repositoriesResponse.statusText}.`,
    );
  }

  const repositories = await repositoriesResponse.json();
  const commitsByRepository = await Promise.all(
    repositories.map(async (repository) => {
      const commitsUrl = `${API_BASE_URL}/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/commits?author=${encodeURIComponent(cleanUsername)}&per_page=6`;

      try {
        const response = await fetchImplementation(commitsUrl, { headers });
        if (!response.ok) return [];

        const commits = await response.json();
        return commits.map((commit) => ({
          ...commit,
          repository: repository.full_name ?? `${repository.owner.login}/${repository.name}`,
        }));
      } catch {
        return [];
      }
    }),
  );

  return commitsByRepository
    .flat()
    .map((commit) => ({
      repository: commit.repository,
      sha: commit.sha,
      message: commit.commit?.message,
      date: commit.commit?.author?.date ?? commit.commit?.committer?.date,
    }))
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .slice(0, 6);
}

export function formatUser(user) {
  const lines = [
    `GitHub profile: ${user.login}`,
    `Name: ${user.name ?? "Not provided"}`,
    `Bio: ${user.bio ?? "Not provided"}`,
    user.location ? `Location: ${user.location}` : 0,
    user.company ? `Company: ${user.company}` : 0,
    `Public repositories: ${user.public_repos.toLocaleString()}`,
    `Public gists: ${user.public_gists.toLocaleString()}`,
    `Followers: ${user.followers.toLocaleString()}`,
    `Following: ${user.following.toLocaleString()}`,
    `Joined GitHub: ${formatDate(user.created_at)}`,
    `Profile: www.${user.html_url}`,
  ];

  return lines.filter(Boolean).join("\n");
}

export function formatEvents(events) {
  return events.slice(0, 6).map((event) => ({
    action: eventAction(event.type),
    branch: event.payload?.ref?.replace("refs/heads/", "") ?? null,
    date: formatEventDate(event.created_at),
    repository: event.repo?.name ?? "Unknown repository",
    repositoryUrl: event.repo?.name
      ? `https://github.com/${event.repo.name}`
      : null,
    shortSha: event.payload?.head?.slice(0, 7) ?? null,
    type: event.type,
  }));

  const recentEvents = events.slice(0, 6);

  if (recentEvents.length === 0) {
    return "Recent public activity: No public events found.";
  }

  return [
    "Last 6 public events:",
    ...recentEvents.map((event) => `==> ${formatEventDate(event.created_at)} —\n    ${describeEvent(event)}`),
  ].join("\n");
}

function eventAction(eventType) {
  switch (eventType) {
    case "PushEvent":
      return "Pushed to";
    case "WatchEvent":
      return "Starred";
    case "CreateEvent":
      return "Created in";
    case "DeleteEvent":
      return "Deleted from";
    case "IssuesEvent":
      return "Updated an issue in";
    case "IssueCommentEvent":
      return "Commented in";
    case "PullRequestEvent":
      return "Updated a pull request in";
    case "ForkEvent":
      return "Forked";
    default:
      return `Recorded ${readableEventType(eventType)} in`;
  }
}

function describeEvent(event) {
  const repository = event.repo?.name ?? "an unknown repository";
  const repositoryUrl = event.repo?.name
    ? `https://github.com/${event.repo.name}`
    : null;
  const repositoryLabel = repositoryUrl
    ? `${repository}[${repositoryUrl}]`
    : repository;
  const branch = event.payload?.ref?.replace("refs/heads/", "");
  const shortSha = event.payload?.head?.slice(0, 7);

  switch (event.type) {
    case "PushEvent":
      return `pushEvent: ${repositoryLabel}${branch ? ` on ${branch}` : ""}.`;
    case "WatchEvent":
      return `WatchEvent: ${repositoryLabel}.`;
    case "CreateEvent":
      return `CreateEvent: ${repositoryLabel}.`;
    case "DeleteEvent":
      return `DeleteEvent: ${repositoryLabel}.`;
    case "IssuesEvent":
      return `IssuesEvent: ${repositoryLabel}.`;
    case "IssueCommentEvent":
      return `IssueCommentEvent: ${repositoryLabel}.`;
    case "PullRequestEvent":
      return `PullRequestEvent: ${repositoryLabel}.`;
    case "ForkEvent":
      return `ForkEvent: ${repositoryLabel}.`;
    default:
      return `Recorded a ${readableEventType(event.type)} in ${repositoryLabel}.`;
  }
}

function formatEventDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(dateString));
}

function readableEventType(eventType) {
  return eventType?.replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1 $2") ?? "unknown event";
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(dateString));
}

export function usage() {
  return [
    "Usage: gitfetch [github-username] [--events]",
    "",
    "Examples:",
    "  gitfetch octocat",
    "  gitfetch octocat --events",
  ].join("\n");
}
