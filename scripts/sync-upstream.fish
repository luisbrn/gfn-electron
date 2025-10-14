#!/usr/bin/env fish
# Fetch and fast-forward master from upstream
set BRANCH master
if test (count $argv) -gt 0
  set BRANCH $argv[1]
end
printf "Fetching upstream and fast-forwarding %s\n" $BRANCH
git fetch upstream
git checkout $BRANCH
git pull --ff-only upstream $BRANCH
printf "Pushing updated %s to fork\n" $BRANCH
git push fork $BRANCH
