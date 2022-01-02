#!/bin/bash
VERSION="${1:-"patch"}" # major | minor | patch

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo '--> Only execute this on main branch'
  exit 0
fi

# make sure you don't tag an old commit
git pull --ff-only &&

# don't create git tag here, it will automatically be created in the next step
npm version "$VERSION" -f -m "Upgrade to %s" &&

# push after versioning (tags will be pushed in next step)
# (also relevant: `postVersion:` key: https://docs.npmjs.com/cli/v7/commands/npm-version)
git push &&

# github will automatically create and push the tag when you create a release
tag="v$(node -p "require('./package.json').version")"
gh release create \
  "$tag" \
  --title "$tag" \
  --notes "releases $tag" &&

npm publish