# Changelog

All notable changes to the "Rusted Development Kit" extension are documented in this file.

## [0.2.0] - 2026-08-29

### Added
- Document formatter for `.ini`/`.template`/`mod-info.txt` files - aligns keys and values within each block, including `@`-directives (`@memory`, `@copyFromSection`, `@define`, etc.).
- Support for `.template` and `mod-info.txt` files in addition to `.ini`.

### Fixed
- Formatter no longer breaks on Windows-style line endings (CRLF).
- Formatter no longer splits a block's alignment when a single-line comment (`#...`) appears inside it; only divider-style comments (`##...`) are treated as block boundaries.
- Formatter now removes blank lines within a block and inserts a single blank line before section headers and divider comments for consistent spacing.

## [0.1.2] - 2026-08-29

### Fixed
- Lowered the minimum required VSCode/VSCodium version (`engines.vscode`) to `^1.125.0` for broader compatibility with current VSCodium releases.
- Comment blocks (`[comment_NAME]` sections) are now fully highlighted as comments, including all lines inside the block, not just the section header.
- Array type modifiers (e.g. `unit[]`, `int[]`) are now highlighted correctly instead of falling back to plain text.

## [0.1.1] - 2026-08-29

### Added
- Added Russian translation.

## [0.1.0] - 2026-08-28

### Added
- Initial release.
- Syntax highlighting for Rusted Warfare unit `.ini` files, including sections, keys, values, `@memory` directives, comments, and logic expressions.
- Language configuration for `.ini`.