# Package Management

BPL projects are typically organized into packages.

## Package Structure

A package is a directory containing a `bpl-package.json` (or similar) and source files.

```
my-package/
  bpl-package.json
  src/
    main.bpl
    utils.bpl
```

## Dependencies

Dependencies are listed in the package configuration file. The package manager handles downloading and linking these dependencies.

_(Note: Package management tooling is currently in development)_
