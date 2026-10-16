# gitfetch
---

A Node.js CLI that displays public GitHub user details in an Ink-powered terminal dashboard.
because CLI is cool. every native application is a CLI wrapper.

## Run it

```powershell
node .\bin\gitfetch.js <github-username>
```

To display the last six public events as a readable activity feed:

```powershell
node .\bin\gitfetch.js <github-username> --events
```

To use the one-word command from this project directory:

```powershell
npm.cmd link
gitfetch <github-username>
```

i wanted to stalk my peers githubs without increasing their profile views. and slop profile readmes but primarily the profile view counter they have. 