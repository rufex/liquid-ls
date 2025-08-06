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
3. **HoverHandler** (`src/hoverHandler.ts`): Handles LSP hover requests
4. **DefinitionHandler** (`src/definitionHandler.ts`): Handles LSP go-to-definition requests
5. **Logger** (`src/logger.ts`): Centralized logging system

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
✅ **Multi-locale Support**: Displays all available language translations in formatted lists
✅ **Precise Navigation**: Jumps to exact translation key location in definitions
✅ **Empty Translation Filtering**: Excludes empty locale values from hover information
✅ **Comprehensive Testing**: Full test coverage for all components
✅ **Error Handling**: Graceful handling of parsing errors and missing definitions

## File Structure

```
src/
├── index.ts                     # Entry point and process management
├── server.ts                    # Main LSP server implementation
├── treeSitterLiquidProvider.ts  # TreeSitter parsing and querying
├── hoverHandler.ts              # Hover request handling
├── definitionHandler.ts         # Definition request handling
└── logger.ts                    # Logging utilities

test/
├── server.test.ts               # Server functionality tests
├── treeSitterLiquidProvider.test.ts # TreeSitter provider tests
├── hoverHandler.test.ts         # Hover handler tests
├── definitionHandler.test.ts    # Definition handler tests
└── logger.test.ts               # Logger tests

claude/
└── translation-functionality.md # Detailed implementation documentation
```

## Usage Examples

### Translation Call

```liquid
<h1>{% t 'welcome_message' %}</h1>
```

### Translation Definition

```liquid
{% t= 'welcome_message' default:'Welcome to our site' nl:'Welkom op onze site' fr:'Bienvenue sur notre site' %}
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

The project has comprehensive test coverage with 900+ lines of tests across all components:

- **Server Tests** (144 lines): LSP server initialization and request handling
- **TreeSitter Provider Tests** (289 lines): Parsing, querying, and translation extraction
- **Hover Handler Tests** (200 lines): Hover request processing and response formatting
- **Definition Handler Tests** (177 lines): Go-to-definition functionality
- **Logger Tests** (93 lines): Logging system functionality

## Future Enhancements

Potential improvements identified:

1. **Cross-file translation lookup**: Search definitions in separate translation files
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
