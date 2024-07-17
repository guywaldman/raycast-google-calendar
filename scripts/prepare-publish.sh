#!/bin/bash

# This script prepares the extension for publishing to the Raycast store.

set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$(realpath "$SCRIPT_DIR/..")

RAYCAST_EXTENSIONS_DIR_NAME="raycast-extensions"
EXTENSION_NAME="google-calendar"

# check if does not already exist
if [ -d $ROOT_DIR/$RAYCAST_EXTENSIONS_DIR_NAME ]; then
	echo "'$ROOT_DIR/$RAYCAST_EXTENSIONS_DIR_NAME' directory exists. Skipping clone."
else
	git clone https://github.com/guywaldman/raycast-extensions --depth=1 --branch=master $RAYCAST_EXTENSIONS_DIR_NAME
fi

echo "Deleting existing extension"
rm -rf $RAYCAST_EXTENSIONS_DIR_NAME/extensions/$EXTENSION_NAME

echo "Copying extension to $RAYCAST_EXTENSIONS_DIR_NAME/$EXTENSION_NAME"
mkdir -p $RAYCAST_EXTENSIONS_DIR_NAME/$EXTENSION_NAME
rsync -av . $RAYCAST_EXTENSIONS_DIR_NAME/extensions/$EXTENSION_NAME --exclude=.git --exclude=node_modules --exclude=$RAYCAST_EXTENSIONS_DIR_NAME --exclude=scripts --exclude=.vscode

echo "Creating new commit"
pushd $RAYCAST_EXTENSIONS_DIR_NAME
git checkout main
git add extensions/$EXTENSION_NAME
git commit -m "Update $EXTENSION_NAME"
git push
popd

echo "Done! Create a pull request for https://github.com/raycast/extensions"
