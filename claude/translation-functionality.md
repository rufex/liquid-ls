# Translation Functionality Implementation

## Overview

This document describes the translation functionality added to the Liquid Language Server. The implementation provides:

1. **Hover Information** - Hover over translation calls (`{% t 'key' %}`) to see all locale translations
2. **Go to Definition** - Navigate directly from translation calls to their definitions (`{% t= 'key' default:'Text' %}`)

## Architecture

### TreeSitter Integration

The implementation leverages the custom TreeSitter parser for Liquid templates. Key findings about the parser:

- Translation calls are parsed as `translation_expression` nodes
- Translation definitions are parsed as `translation_statement` nodes
- String literals are parsed as `string` nodes with `key` field names
- Translation definitions contain `locale_declaration` nodes for default values

### Core Components

#### TreeSitterLiquidProvider Enhancements

New methods added to `src/treeSitterLiquidProvider.ts`:

1. **`findTranslationCalls(tree: Parser.Tree)`** - Uses TreeSitter queries to find all translation calls
2. **`findTranslationDefinitions(tree: Parser.Tree)`** - Uses TreeSitter queries to find all translation definitions
3. **`isTranslationCall(node: Parser.SyntaxNode)`** - Checks if a node is within a translation call
4. **`getTranslationKeyAtPosition(tree, row, column)`** - Extracts translation key at cursor position
5. **`findTranslationDefinitionByKey(tree, key)`** - Finds definition node for a given translation key
6. **`extractTranslationDefinitionContent(node)`** - Extracts default text from definition node
7. **`extractTranslationKey(stringNode)`** - Removes quotes from string literals

#### HoverHandler Integration

Enhanced `src/hoverHandler.ts` to:

1. Check if hover position is on a translation call
2. Extract the translation key from the position
3. Search for matching translation definition
4. Display formatted hover information with translation key and definition

#### DefinitionHandler Implementation

New `src/definitionHandler.ts` provides:

1. **Translation Call Detection** - Identifies when "Go to Definition" is triggered on a translation call
2. **Definition Location Mapping** - Finds the precise location of translation definitions
3. **LSP Location Response** - Returns proper Location objects with URI and Range information
4. **Precise Positioning** - Navigates to the translation key within the definition for better UX

## TreeSitter Query Patterns

### Translation Calls

```
(translation_expression
  key: (string) @translation_key
)
```

### Translation Definitions

```
(translation_statement
  key: (string) @translation_key
)
```

## Usage Examples

### Translation Call

```liquid
<h1>{% t 'welcome_message' %}</h1>
```

When hovering over `'welcome_message'`, the LSP will:

1. Detect it's a translation call
2. Extract the key "welcome_message"
3. Search for matching definition
4. Display hover information

### Translation Definition

```liquid
{% t= 'welcome_message' default:'Welcome to our site' nl:'Welkom op onze site' fr:'Bienvenue sur notre site' %}
```

The LSP will:

1. Parse the translation_statement node
2. Find all locale_declaration nodes (default, nl, fr)
3. Extract all key:value pairs
4. Filter out empty translations
5. Display all locales in a formatted list

## Hover Response Format

When hovering over a translation call:

**Found definition with multiple locales:**

```
**Translation:** `t_current_period`

**Locales:**
nl: "Huidige periode"
fr: "Période actuelle"
default: "Current period"
```

**Found definition with single locale:**

```
**Translation:** `t_code`

**Locales:**
default: "Code"
nl: "Code"
fr: "Code"
```

**Definition not found:**

```
**Translation:** `missing_key`

**Status:** Definition not found
```

Translation: "welcome_message"
Definition: Welcome to our site

```

**Definition not found:**

```

Translation: "welcome_message"
Definition: Not found

````

## Testing

Comprehensive test suite with 900+ lines of tests across all components:

### Test Files and Coverage

- **`test/treeSitterLiquidProvider.test.ts`** (289 lines): TreeSitter parsing, querying, and translation extraction
- **`test/hoverHandler.test.ts`** (200 lines): Hover request processing and response formatting
- **`test/definitionHandler.test.ts`** (177 lines): Go-to-definition functionality and location mapping
- **`test/server.test.ts`** (144 lines): LSP server initialization and request handling
- **`test/logger.test.ts`** (93 lines): Logging system functionality

### Test Coverage Areas

- TreeSitter query functionality and node traversal
- Translation key extraction from various quote styles
- Position-based translation detection and validation
- Definition matching logic across different syntax patterns
- Content extraction from multi-locale definitions
- Error handling for missing definitions and malformed syntax
- LSP protocol compliance for hover and definition responses
- Server initialization and capability registration
- Logging system with different log levels

## Technical Notes

### TreeSitter Node Structure

Based on testing with the custom Liquid parser:

- `{% t 'key' %}` → `(translation_expression key: (string))`
- `{% t= 'key' default:'text' %}` → `(translation_statement key: (string) (locale_declaration key: (identifier) value: (string)))`
- `{% t= 'key' default:'text' nl:'tekst' fr:'texte' %}` → `(translation_statement key: (string) (locale_declaration key: (identifier) value: (string)) (locale_declaration key: (identifier) value: (string)) (locale_declaration key: (identifier) value: (string)))`

### Multi-Locale Support

The implementation now supports:
- Multiple locales in a single translation definition
- Automatic filtering of empty translations (e.g., `fr:""`)
- Formatted display showing all available translations
- Proper handling of different quote styles (single and double quotes)

### Error Handling

The implementation gracefully handles:

- Invalid TreeSitter parsing
- Missing translation definitions
- Malformed translation syntax
- File system errors
- Position outside translation calls

### Performance Considerations

- TreeSitter queries are efficient for large files
- Parsing is done once per hover request
- No caching implemented (could be added for optimization)

## Current Features

✅ **Hover Information** - Shows all locale translations when hovering over translation calls
✅ **Go to Definition** - Navigate from translation calls to their definitions
✅ **Multi-locale Support** - Displays all available language translations
✅ **Precise Navigation** - Jumps to the exact translation key location
✅ **Empty Translation Filtering** - Excludes empty locale values
✅ **Comprehensive Testing** - Full test coverage with 900+ lines of tests
✅ **Error Handling** - Graceful handling of parsing errors and missing definitions
✅ **LSP Compliance** - Follows official Language Server Protocol specifications

## Future Enhancements

Potential improvements:
1. **Cross-file translation lookup** - Search definitions in separate translation files
2. **Translation validation** - Warn about missing translations
3. **Auto-completion** - Suggest available translation keys
4. **Rename refactoring** - Rename translation keys across files
5. **Translation file format support** - Support YAML/JSON translation files
6. **Find all references** - Show all usages of a translation key

## Dependencies

### Runtime Dependencies
- `tree-sitter` (^0.25.0): Core parsing library for syntax tree generation
- `tree-sitter-liquid` (github:rufex/tree-sitter-liquid): Custom Liquid parser for Silverfin templates
- `vscode-languageserver` (^9.0.1): LSP implementation and protocol handling
- `vscode-languageserver-textdocument` (^1.0.12): Text document utilities for LSP
- `vscode-uri` (^3.1.0): URI handling and file path conversion

### Development Dependencies
- `typescript` (^5.8.3): TypeScript compiler and type checking
- `jest` (^30.0.4): Testing framework with comprehensive test runner
- `ts-jest` (^29.4.0): TypeScript integration for Jest
- `eslint` (^9.30.1): Code linting with TypeScript support
- `prettier` (^3.6.2): Code formatting and style consistency
- `@types/node` (^24.0.10): Node.js type definitions
- `@types/jest` (^30.0.0): Jest type definitions

## Compatibility

- Works with existing hover functionality
- Backward compatible with non-translation content
- Follows LSP specification for hover and definition responses
- Integrates with existing logging and error handling
- Compatible with all LSP clients (VS Code, Neovim, etc.)

## Usage in Editors

### Visual Studio Code
- **Hover**: Hover over `{% t 'key' %}` to see all translations
- **Go to Definition**: `F12` or `Ctrl+Click` on translation calls to navigate to definitions

### Neovim (with LSP)
- **Hover**: `:lua vim.lsp.buf.hover()` over translation calls
- **Go to Definition**: `:lua vim.lsp.buf.definition()` or `gd` on translation calls

### Other LSP Clients
- Standard LSP `textDocument/hover` and `textDocument/definition` requests are supported

## Development Workflow

### Build and Development Commands

```bash
# Build the project
npm run build

# Start the language server
npm run start

# Run tests
npm run test
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report

# Code quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format with Prettier
npm run format:check   # Check formatting
````

### Project Structure

```
liquid-ls/
├── src/
│   ├── index.ts                     # Entry point and process management
│   ├── server.ts                    # Main LSP server implementation
│   ├── treeSitterLiquidProvider.ts  # TreeSitter parsing and querying
│   ├── hoverHandler.ts              # Hover request handling
│   ├── definitionHandler.ts         # Definition request handling
│   └── logger.ts                    # Logging utilities
├── test/
│   ├── server.test.ts               # Server functionality tests
│   ├── treeSitterLiquidProvider.test.ts # TreeSitter provider tests
│   ├── hoverHandler.test.ts         # Hover handler tests
│   ├── definitionHandler.test.ts    # Definition handler tests
│   └── logger.test.ts               # Logger tests
├── claude/
│   └── translation-functionality.md # This documentation
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
├── jest.config.js                   # Jest testing configuration
├── eslint.config.mjs                # ESLint configuration
└── .prettierrc.json                 # Prettier configuration
```

### Code Quality Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Comprehensive linting rules with TypeScript support
- **Prettier**: Consistent code formatting
- **Jest**: 100% test coverage requirement for new features
- **LSP Compliance**: All responses follow official LSP specifications
