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

export function formatUser(user) {
  const lines = [
    `GitHub profile: ${user.login}`,
    `Name: ${user.name ?? "Not provided"}`,
    `Bio: ${user.bio ?? "Not provided"}`,
    `Location: ${user.location ?? "Not provided"}`,
    `Company: ${user.company ?? "Not provided"}`,
    `Public repositories: ${user.public_repos.toLocaleString()}`,
    `Public gists: ${user.public_gists.toLocaleString()}`,
    `Followers: ${user.followers.toLocaleString()}`,
    `Following: ${user.following.toLocaleString()}`,
    `Joined GitHub: ${formatDate(user.created_at)}`,
    `Profile: ${user.html_url}`,
  ];

  return lines.join("\n");
}

export function formatEvents(events) {
  const recentEvents = events.slice(0, 6);

  if (recentEvents.length === 0) {
    return "Recent public activity: No public events found.";
  }

  return [
    "Last 6 public events:",
    ...recentEvents.map((event) => `• ${formatEventDate(event.created_at)} — ${describeEvent(event)}`),
  ].join("\n");
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
      return `Pushed into Public Repository: ${repositoryLabel}${branch ? ` on ${branch}` : ""}${shortSha ? `. Latest commit: ${shortSha}` : ""}.`;
    case "WatchEvent":
      return `Starred Public Repository: ${repositoryLabel}.`;
    case "CreateEvent":
      return `Created a ${event.payload?.ref_type ?? "new"} in ${repositoryLabel}.`;
    case "DeleteEvent":
      return `Deleted a ${event.payload?.ref_type ?? "reference"} from ${repositoryLabel}.`;
    case "IssuesEvent":
      return `${capitalize(event.payload?.action ?? "updated")} an issue in ${repositoryLabel}.`;
    case "IssueCommentEvent":
      return `Commented on an issue in ${repositoryLabel}.`;
    case "PullRequestEvent":
      return `${capitalize(event.payload?.action ?? "updated")} a pull request in ${repositoryLabel}.`;
    case "ForkEvent":
      return `Forked Public Repository: ${repositoryLabel}.`;
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
