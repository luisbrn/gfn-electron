#!/usr/bin/env fish
# Create a new feature branch and push to fork
if test (count $argv) -eq 0
  echo "Usage: new-branch.fish <short-name>"
  exit 1
end
set NAME $argv[1]
set BRANCH feat/$NAME
git checkout -b $BRANCH
git push fork $BRANCH --set-upstream
echo "Created and pushed $BRANCH"
