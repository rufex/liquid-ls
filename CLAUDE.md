# Language Server for Silverfin Liquid

This project implements a Language Server Protocol (LSP) server for Silverfin Liquid, a variant of the Liquid templating language used in Silverfin. The language server provides intelligent code assistance including hover information and go-to-definition capabilities for Liquid templates.

## Project Overview

The language server is implemented in TypeScript and provides:

- **Hover Information**: Display translation definitions when hovering over translation calls (`{% t 'key' %}`)
- **Go to Definition**: Navigate from translation calls to their definitions (`{% t= 'key' default:'Text' %}`)
- **Multi-locale Support**: Show all available language translations in hover information
- **TreeSitter Integration**: Efficient parsing and querying of Liquid template syntax

## Architecture

### Core Components

1. **LiquidLanguageServer** (`src/server.ts`): Main LSP server implementation
2. **TreeSitterLiquidProvider** (`src/treeSitterLiquidProvider.ts`): TreeSitter integration for parsing Liquid templates
3. **ScopeAwareProvider** (`src/scopeAwareProvider.ts`): Scope-aware translation lookup with include statement processing
4. **HoverHandler** (`src/hoverHandler.ts`): Handles LSP hover requests
5. **DefinitionHandler** (`src/definitionHandler.ts`): Handles LSP go-to-definition requests
6. **RelatedFilesProvider** (`src/relatedFilesProvider.ts`): Template file discovery and config.json parsing
7. **Logger** (`src/logger.ts`): Centralized logging system

### Dependencies

- `tree-sitter`: Core parsing library
- `tree-sitter-liquid`: Custom Liquid parser from GitHub (rufex/tree-sitter-liquid)
- `vscode-languageserver`: LSP implementation
- `vscode-languageserver-textdocument`: Text document utilities
- `vscode-uri`: URI handling utilities

### Development Tools

- **TypeScript**: Primary language with strict type checking
- **Jest**: Testing framework with comprehensive test coverage (900+ lines of tests)
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Code formatting
- **npm scripts**: Build, test, lint, and format automation

## Current Features

✅ **Translation Hover Information**: Shows all locale translations when hovering over `{% t 'key' %}` calls
✅ **Translation Go-to-Definition**: Navigate from translation calls to their definitions
✅ **Scope-Aware Translation Lookup**: Only shows translations that are "in scope" at cursor position
✅ **Cross-File Translation Search**: Searches across all related template files (main + text_parts)
✅ **Include Statement Processing**: Handles `{% include "parts/name" %}` statements and nested includes
✅ **Multi-locale Support**: Displays all available language translations in formatted lists
✅ **Precise Navigation**: Jumps to exact translation key location in definitions
✅ **Empty Translation Filtering**: Excludes empty locale values from hover information
✅ **Dynamic Template Structure**: Supports any template directory name with flexible config.json format
✅ **Parts/ Directory Mapping**: Maps `{% include "parts/name" %}` to `text_parts/name.liquid`
✅ **Comprehensive Testing**: Full test coverage for all components (1000+ lines of tests)
✅ **Error Handling**: Graceful handling of parsing errors and missing definitions

## File Structure

```
src/
├── index.ts                     # Entry point and process management
├── server.ts                    # Main LSP server implementation
├── treeSitterLiquidProvider.ts  # TreeSitter parsing and querying
├── scopeAwareProvider.ts        # Scope-aware translation lookup with include processing
├── hoverHandler.ts              # Hover request handling
├── definitionHandler.ts         # Definition request handling
├── relatedFilesProvider.ts      # Template file discovery and config.json parsing
└── logger.ts                    # Logging utilities

test/
├── server.test.ts               # Server functionality tests
├── treeSitterLiquidProvider.test.ts # TreeSitter provider tests
├── scopeAwareProvider.test.ts   # Scope-aware provider tests
├── hoverHandler.test.ts         # Hover handler tests
├── definitionHandler.test.ts    # Definition handler tests
├── relatedFilesProvider.test.ts # Related files provider tests
└── logger.test.ts               # Logger tests

claude/
└── translation-functionality.md # Detailed implementation documentation
```

## Usage Examples

### Template Structure

```
template_name/
├── main.liquid                  # Main template file
├── config.json                  # Template configuration
└── text_parts/                  # Text parts directory
    ├── part_1.liquid
    ├── part_2.liquid
    └── translations.liquid
```

### Config.json Format

```json
{
  "text_parts": {
    "part_1": "text_parts/part_1.liquid",
    "part_2": "text_parts/part_2.liquid",
    "translations": "text_parts/translations.liquid"
  }
}
```

### Translation Call

```liquid
<h1>{% t 'welcome_message' %}</h1>
```

### Translation Definition

```liquid
{% t= 'welcome_message' default:'Welcome to our site' nl:'Welkom op onze site' fr:'Bienvenue sur notre site' %}
```

### Include Statements

```liquid
{% include "parts/translations" %}  <!-- Maps to text_parts/translations.liquid -->
{% include "parts/utilities" %}     <!-- Maps to text_parts/utilities.liquid -->
```

### Scope-Aware Behavior

```liquid
{% include "parts/translations" %}  ← Line 0: includes translations.liquid
{% t= "local_def" default:"Local" %} ← Line 1: local definition
{% t "example_translation" %}        ← Line 2: CURSOR HERE (finds both)
{% t= "late_def" default:"Late" %}   ← Line 3: not in scope!
```

## Development Workflow

### Available Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run start`: Start the language server
- `npm run test`: Run all tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage report
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Run ESLint with auto-fix
- `npm run format`: Format code with Prettier
- `npm run format:check`: Check code formatting

### Development Instructions

ALWAYS write specs for your code, as this will help us ensure the language server works correctly and efficiently.
ALWAYS run your tests before deciding if your code is ready or not. Tests must always pass.
ALWAYS run the linter (`npm run lint`) and formatter (`npm run format`) before completing any task.
ALWAYS compile TypeScript (`npm run build`) after making any code changes to ensure compilation succeeds.
STORE tests in the `test` directory, and use the `jest` testing framework to write your tests.
SUMMARIZE any relevant information that can help yourself in future iterations of this project, or help other developers understand the codebase. Store this information in `claude/` directory.
ALWAYS read the documentation you have in `claude/` directory before starting to work on the codebase, as it contains important information about the project and its structure.
DEFINE types following the TypeScript conventions and the official LSP specifications.
ALWAYS write test, run tests, run linter, run formatter, compile typescript before committing or submitting code.

### Parsing Constraints

**CRITICAL**: This language server uses TreeSitter for ALL parsing operations. NEVER use regular expressions or string manipulation for parsing Liquid syntax. All parsing must go through the TreeSitter provider using proper queries and node traversal. This ensures:

- Accurate syntax tree representation
- Proper handling of nested structures
- Consistent parsing behavior
- Better error handling and recovery

When implementing new parsing features:

1. Use TreeSitter queries with proper node type matching
2. Traverse the syntax tree using node relationships (parent, children, siblings)
3. Extract text content only from identified nodes, never from raw strings
4. Test parsing with various edge cases and malformed input

## Testing

The project has comprehensive test coverage with 1000+ lines of tests across all components:

- **Server Tests**: LSP server initialization and request handling
- **TreeSitter Provider Tests**: Parsing, querying, and translation extraction
- **Scope-Aware Provider Tests**: Include processing, nested includes, and scope-aware lookup
- **Hover Handler Tests**: Hover request processing and response formatting
- **Definition Handler Tests**: Go-to-definition functionality
- **Related Files Provider Tests**: Config.json parsing and file discovery
- **Logger Tests**: Logging system functionality

## Scope-Aware Translation Lookup

The language server implements sophisticated scope-aware translation lookup that respects Liquid execution flow:

### How It Works

1. **Include Statement Parsing**: Detects `{% include "parts/name" %}` statements using TreeSitter
2. **Execution Order**: Processes includes in the order they appear in the template
3. **Nested Includes**: Recursively processes includes within included files
4. **Line-Based Scope**: Only considers translations defined before the cursor position
5. **Path Resolution**: Maps `parts/` includes to `text_parts/` directory

### Scope Rules

- **Current File**: Searches lines 1 to cursor position
- **Included Files**: Searches all lines in files included before cursor position
- **Priority**: Current file definitions override included file definitions
- **Circular Protection**: Prevents infinite loops in circular includes

### Template Structure Support

- **Dynamic Directory Names**: Works with any template directory name
- **Flexible Config Format**: Supports both array and object formats for text_parts
- **Future-Ready**: Prepared for shared_parts implementation

## Future Enhancements

Potential improvements identified:

1. **Shared Parts Support**: Add support for shared_parts directory and config
2. **Translation validation**: Warn about missing translations
3. **Auto-completion**: Suggest available translation keys
4. **Rename refactoring**: Rename translation keys across files
5. **Translation file format support**: Support YAML/JSON translation files
6. **Find all references**: Show all usages of a translation key

## Resources

- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [TreeSitter Documentation](https://tree-sitter.github.io/tree-sitter/)
- [Liquid Template Language](https://shopify.github.io/liquid/)
- [Silverfin Documentation](https://silverfin.com/)
