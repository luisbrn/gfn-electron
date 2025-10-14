#!/usr/bin/env fish
# Simple release helper: bump tag and push
if test (count $argv) -eq 0
  echo "Usage: release.fish <version>  (e.g. 2.2.1)"
  exit 1
end
set VERSION $argv[1]
set TAG v$VERSION
npm run build --if-present
git tag -a $TAG -m "Release $TAG"
git push fork $TAG
echo "Created and pushed tag $TAG"
