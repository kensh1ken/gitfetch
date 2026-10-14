#!/usr/bin/env node

import {
  fetchEvents,
  fetchUser,
  formatEvents,
  formatUser,
  usage,
} from "../src/index.js";

const arguments_ = process.argv.slice(2);
const showEvents = arguments_.includes("--events");
const username = arguments_.find((argument) => !argument.startsWith("-"));

if (arguments_.includes("--help") || arguments_.includes("-h")) {
  console.log(usage());
  process.exitCode = 0;
} else {
  try {
    const requestedUsername = username || "kensh1ken";
    const user = await fetchUser(requestedUsername);
    const output = [formatUser(user)];

    if (showEvents) {
      const events = await fetchEvents(requestedUsername);
      output.push(`Public activity:\n${formatEvents(events)}`);
    }

    console.log(output.join("\n\n"));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}
