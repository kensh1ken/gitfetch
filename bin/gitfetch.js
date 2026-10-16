#!/usr/bin/env node

import React from "react";
import { render } from "ink";
import { createSpinner } from "nanospinner";
import {
  fetchEvents,
  fetchUser,
  usage,
} from "../src/index.js";
import { Dashboard } from "../src/ui.js";

const arguments_ = process.argv.slice(2);
const showEvents = arguments_.includes("--events");
const username = arguments_.find((argument) => !argument.startsWith("-"));

if (arguments_.includes("--help") || arguments_.includes("-h")) {
  console.log(usage());
  process.exitCode = 0;
} else {
  try {
    const requestedUsername = username || "octocat";
    const dashboard = await withSpinner(() => loadDashboard(requestedUsername, showEvents));
    render(React.createElement(Dashboard, { ...dashboard, showEvents }));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

async function loadDashboard(username, includeEvents) {
  const [user, events] = await Promise.all([
    fetchUser(username),
    includeEvents ? fetchEvents(username) : Promise.resolve([]),
  ]);

  return { user, events };
}

async function withSpinner(task) {
  const spinner = createSpinner("Fetching").start();

  try {
    const result = await task();
    spinner.success({ text: "Fetched" });
    return result;
  } catch (error) {
    spinner.error({ text: "Fetching failed" });
    throw error;
  }
}
