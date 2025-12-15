  #!/bin/bash

# Increment patch version in package.json
bun -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("./package.json", "utf8"));
const parts = pkg.version.split(".");
parts[2] = parseInt(parts[2]) + 1;
pkg.version = parts.join(".");
fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2));
console.log(`Bumped version to ${pkg.version}`);
'

# Build the executable
bun build --compile --outfile=bpl ./index.ts