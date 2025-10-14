git commit -m "docs: update README branch coverage to 82.03%"
git push fork steam-rpc-feature

# Updating README coverage (manual)

If you want to update the branch coverage percentage shown in `README.md` manually (no tokens or secrets required), use the included helper script.

One-liner:

```fish
node scripts/update_readme_coverage.js 82.03
```

What it does:

```fish
git add README.md
git commit -m "docs: update README branch coverage to 82.03%"
git push fork steam-rpc-feature
```

Notes:
