# Rusted Development Kit

Development kit for [Rusted Warfare](https://rustedwarfare.com/) mod files in VSCode/VSCodium.

## Features

- **Syntax highlighting** for `.ini` unit definition files, including:
  - Sections (`[core]`, `[turret_NAME]`, `[hiddenAction_NAME]`, etc.)
  - Keys and values
  - `@memory` directives (`unit`, `float`, `number`, `boolean`, `string`, and array types)
  - Comments (`#` and block comments)
  - Interpolation (`${...}`) and file path references
  - Logic keywords (`self`, `and`, `or`, `not`, `if`) and operators
- **Custom language mode** (`rustedwarfare`) automatically applied to Rusted Warfare unit `.ini` files

## Usage

1. Install the extension.
2. Open any Rusted Warfare unit `.ini` file

## Requirements

Works with VSCode/VSCodium **1.125.0** or above.

## Contributing

Found a bug or missing field/key? Open an issue or pull request on [GitHub](https://github.com/doggidoggi/rusted-development-kit).