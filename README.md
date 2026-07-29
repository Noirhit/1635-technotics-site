# 1635 Newtown Technotics — team website

Live site: **https://noirhit.github.io/1635-technotics-site/**

Plain HTML/CSS/JS. No frameworks, no build step. three.js renders the robot,
GSAP drives the scroll effects, the Logbook is a single JSON file.

## 📖 Start here

Everything — how the code works, how to post to the Logbook, how the 3D
robot and scroll animations are built, how to publish — is documented in:

> **[HANDBOOK.md](HANDBOOK.md)**

## Quick reference

| Task | Where |
|---|---|
| Post to the Logbook | edit `data/posts.json` → [Handbook §8](HANDBOOK.md#8-tutorial-posting-to-the-logbook) |
| Run locally | VS Code → Live Server on `index.html` |
| Publish | GitHub Desktop → Commit → Push (auto-deploys in ~1 min) |
| Rebuild the 3D robot | `python tools/build_kitbot.py` |
