# gitfetch

A dependency-free Node.js CLI that displays public GitHub user details.

## Run it

```powershell
node .\bin\gitfetch.js octocat
```

To display the last six public events as a readable activity feed:

```powershell
node .\bin\gitfetch.js octocat --events
```

To use the one-word command from this project directory:

```powershell
npm.cmd link
gitfetch octocat
```

## Test it

```powershell
npm.cmd test
```

## What it teaches

- accepting command-line arguments
- calling an HTTP API with `fetch`
- request headers and API versioning
- JSON parsing
- friendly error handling
- automated tests without external packages
