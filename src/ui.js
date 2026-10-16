import React from "react";
import { Box, Text } from "ink";
import { ASCII_ART } from "./ascii-art.js";
import { formatEvents } from "./index.js";

const h = React.createElement;

export function Dashboard({ user, events = [], showEvents }) {
  return h(
    Box,
    { flexDirection: "column", paddingX: 1 },
    h(
      Box,
      {
        alignItems: "flex-start",
        marginLeft: 4,
        marginTop: 1,
        marginBottom: 1,
      },
      h(ArtPanel),
      h(
        Box,
        { flexDirection: "column", flexGrow: 1, flexBasis: 0, marginLeft: 1 },
        h(ProfilePanel, { user }),
        showEvents ? h(ActivityPanel, { events, marginTop: 1 }) : null,
      ),
    ),
  );
}

function ArtPanel() {
  return h(
    Box,
    {
      flexDirection: "column",
      width: 42,
    },
    h(Text, { color: "magenta" }, ASCII_ART),
  );
}

function ProfilePanel({ user }) {
  return h(
    Panel,
    {
      color: "cyan",
    },
    h(Row, { label: "Name", value: user.name ?? "Not provided" }),
    user.location && h(Row, { label: "Location", value: user.location }),
    user.company && h(Row, { label: "Company", value: user.company }),
    h(Row, {
      label: "Repositories",
      value: user.public_repos.toLocaleString(),
    }),
    h(Row, { label: "Followers", value: user.followers.toLocaleString() }),
    h(Row, { label: "Following", value: user.following.toLocaleString() }),
    h(Row, { label: "Joined", value: formatDate(user.created_at) }),
    h(Row, { label: "Profile", value: user.html_url }),
  );
}

function ActivityPanel({ events, ...boxProps }) {
  const activity = formatEvents(events);

  return h(
    Panel,
    { color: "green", ...boxProps },
    activity.length
      ? activity.map((event) => h(ActivityEvent, { key: `${event.type}-${event.date}-${event.repository}`, event }))
      : h(Text, { color: "gray" }, "No recent public activity found."),
  );
}

function ActivityEvent({ event }) {
  return h(
    Box,
    { flexDirection: "column", marginBottom: 1 },
    h(
      Box,
      null,
      h(Text, { color: "gray" }, `${event.date} `),
      h(Text, { color: eventColor(event.type), bold: true }, readableEventType(event.type)),
    ),
    h(Box,
      null,
      h(Text, { color: "white" }, `${event.action} `),
      h(Text, { color: "cyan", bold: true, wrap: "truncate-end" }, event.repository),
      h(Text, { color: "gray", dimColor: true }, " • "),
      h(
      Text,
      { color: "magenta" , dimColor: true},
      [event.branch && `branch: ${event.branch}`, event.shortSha && `commit: ${event.shortSha}`]
        .filter(Boolean)
        .join(" | "),
      ),
    ),
    event.repositoryUrl && h(Text, { color: "gray", dimColor: true, wrap: "truncate-end" }, event.repositoryUrl),
  );

}

function eventColor(type) {
  return {
    PushEvent: "yellow",
    WatchEvent: "magenta",
    CreateEvent: "green",
    DeleteEvent: "red",
    IssuesEvent: "red",
    IssueCommentEvent: "blue",
    PullRequestEvent: "blue",
    ForkEvent: "cyan",
  }[type] ?? "white";
}

function readableEventType(type) {
  return type.replace(/Event$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function Panel({ children, ...boxProps }) {
  return h(
    Box,
    {
      flexDirection: "column",
      ...boxProps,
    },
    children,
  );
}

function Row({ label, value }) {
  return h(
    Box,
    null,
    h(
      Box,
      { flexShrink: 0, width: 18 },
      h(Text, { color: "yellow" }, `${label}: `),
    ),
    h(Text, { color: "cyan", bold: true, flexGrow: 1, wrap: "truncate-end" }, value),
  );
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(dateString));
}
