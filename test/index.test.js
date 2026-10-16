import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchEvents,
  fetchRecentCommits,
  fetchUser,
  formatEvents,
  formatUser,
  usage
} from "../src/index.js";

test("fetchUser calls GitHub's user endpoint with the expected headers", async () => {
  let requestedUrl;
  let requestedOptions;
  const fakeFetch = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return new Response(JSON.stringify({ login: "octocat" }), { status: 200 });
  };

  const user = await fetchUser("octo cat", fakeFetch);

  assert.equal(requestedUrl, "https://api.github.com/users/octo%20cat");
  assert.equal(requestedOptions.headers.Accept, "application/vnd.github+json");
  assert.equal(user.login, "octocat");
});

test("fetchUser explains when a username is missing", async () => {
  await assert.rejects(() => fetchUser("  "), /Please provide a GitHub username/);
});

test("fetchUser explains when GitHub returns 404", async () => {
  const fakeFetch = async () => new Response(null, { status: 404 });

  await assert.rejects(() => fetchUser("missing-user", fakeFetch), /was not found/);
});

test("fetchEvents returns the parsed events response", async () => {
  const fakeFetch = async () =>
    new Response(
      JSON.stringify([
        {
          type: "PushEvent",
          repo: { name: "octocat/Hello-World" },
          payload: { head: "abc123" }
        }
      ]),
      { status: 200 }
    );

  const events = await fetchEvents("octocat", fakeFetch);

  assert.deepEqual(events, [{
    type: "PushEvent",
    repo: { name: "octocat/Hello-World" },
    payload: { head: "abc123" }
  }]);
});

test("fetchRecentCommits returns the newest authored public commits", async () => {
  const fakeFetch = async (url) => {
    if (url.includes("/repos?")) {
      return new Response(JSON.stringify([
        { name: "first", owner: { login: "octocat" } },
        { name: "second", owner: { login: "octocat" } },
      ]), { status: 200 });
    }

    if (url.includes("/repos/octocat/first/commits")) {
      return new Response(JSON.stringify([{
        sha: "older1234567",
        commit: { message: "Older commit", author: { date: "2026-10-01T00:00:00Z" } },
      }]), { status: 200 });
    }

    return new Response(JSON.stringify([{
      sha: "newer1234567",
      commit: { message: "Newer commit", author: { date: "2026-10-02T00:00:00Z" } },
    }]), { status: 200 });
  };

  const commits = await fetchRecentCommits("octocat", fakeFetch);

  assert.deepEqual(commits.map((commit) => commit.sha), ["newer1234567", "older1234567"]);
  assert.equal(commits[0].repository, "octocat/second");
});

test("formatUser makes profile data readable", () => {
  const output = formatUser({
    login: "octocat",
    name: null,
    bio: null,
    location: null,
    company: null,
    public_repos: 1_234,
    public_gists: 0,
    followers: 20,
    following: 2,
    created_at: "2008-01-14T04:33:35Z",
    html_url: "https://github.com/octocat"
  });

  assert.match(output, /GitHub profile: octocat/);
  assert.match(output, /Public repositories: 1,234/);
  assert.match(output, /Joined GitHub: January 14, 2008/);
});

test("usage gives an example", () => {
  assert.match(usage(), /gitfetch octocat/);
  assert.match(usage(), /--events/);
});

test("formatEvents returns six structured events for the UI", () => {
  const activity = formatEvents([
    {
      type: "PushEvent",
      created_at: "2026-10-11T14:17:45Z",
      repo: { name: "octocat/Hello-World" },
      payload: { ref: "refs/heads/main", head: "a45923b7dac74df7b7526f59bb5fe8434fd7ffa5" }
    },
    {
      type: "WatchEvent",
      created_at: "2026-10-10T14:17:45Z",
      repo: { name: "octocat/Spoon-Knife" },
      payload: { action: "started" }
    },
    ...Array.from({ length: 5 }, (_, index) => ({
      type: "CreateEvent",
      created_at: "2026-10-09T14:17:45Z",
      repo: { name: `octocat/repo-${index}` },
      payload: { ref_type: "branch" }
    }))
  ]);

  assert.equal(activity.length, 6);
  assert.deepEqual(activity[0], {
    action: "Pushed to",
    branch: "main",
    date: "Oct 11, 2026, 7:47 PM",
    repository: "octocat/Hello-World",
    repositoryUrl: "https://github.com/octocat/Hello-World",
    shortSha: "a45923b",
    type: "PushEvent"
  });
  assert.equal(activity[1].action, "Starred");
});

test("formatEvents returns no activity when no events exist", () => {
  assert.deepEqual(formatEvents([]), []);
});
