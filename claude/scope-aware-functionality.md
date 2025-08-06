# Scope-Aware Translation Lookup

This document describes the scope-aware translation lookup system implemented in the Silverfin Liquid Language Server.

## Overview

The scope-aware system ensures that translation lookups respect the actual execution flow of Liquid templates, only showing translations that are truly "in scope" at the cursor position.

## Key Concepts

### Execution Scope

The language server follows Liquid's execution model:

1. **Sequential Processing**: Templates are processed line by line from top to bottom
2. **Include Processing**: `{% include %}` statements bring external content into scope
3. **Definition Precedence**: Later definitions override earlier ones
4. **Line-Based Scope**: Only content before the cursor position is considered

### Template Structure

```
template_name/
├── main.liquid                  # Main template file
├── config.json                  # Template configuration
└── text_parts/                  # Text parts directory
    ├── part_1.liquid            # Individual text parts
    ├── part_2.liquid
    └── translations.liquid      # Translation definitions
```

## Implementation Details

### ScopeAwareProvider Class

The `ScopeAwareProvider` is the core component that handles scope-aware translation lookup:

```typescript
export class ScopeAwareProvider {
  public findScopedTranslationDefinition(
    fileUri: string,
    translationKey: string,
    cursorLine: number,
  ): TranslationDefinitionResult | null;
}
```

### Include Statement Processing

1. **TreeSitter Parsing**: Uses TreeSitter queries to find include statements
2. **Path Resolution**: Maps include paths to actual file paths
3. **Recursive Processing**: Handles nested includes within included files
4. **Circular Protection**: Prevents infinite loops in circular includes

### Path Resolution Logic

The system handles various include path formats:

```liquid
{% include "parts/translations" %}  → text_parts/translations.liquid
{% include "parts/utilities" %}     → text_parts/utilities.liquid
{% include "shared_component" %}    → text_parts/shared_component.liquid
```

**Resolution Priority:**

1. `text_parts/name.liquid` (for `parts/` prefixed includes)
2. `template_dir/name.liquid` (direct paths)
3. `parts/name.liquid` (future shared_parts support)

### Scope Context Building

For each translation lookup, the system builds a scope context:

```typescript
interface ScopeContext {
  currentFile: string; // File where cursor is located
  currentLine: number; // Cursor line position
  availableIncludes: IncludeStatement[]; // Includes before cursor
  scopedFiles: string[]; // All files in scope
}
```

## Usage Examples

### Basic Scope Behavior

```liquid
{% t= "early_def" default:"Early" %}  ← Line 0: in scope
{% t "test_key" %}                    ← Line 1: CURSOR HERE
{% t= "late_def" default:"Late" %}    ← Line 2: NOT in scope
```

**Result**: Only finds `early_def`, not `late_def`

### Include-Based Scope

```liquid
{% include "parts/translations" %}    ← Line 0: brings translations into scope
{% t "example_translation" %}         ← Line 1: CURSOR HERE
```

**Result**: Finds `example_translation` from `text_parts/translations.liquid`

### Nested Includes

```liquid
// main.liquid
{% include "parts/part1" %}           ← Line 0

// text_parts/part1.liquid
{% include "parts/translations" %}    ← Line 0: nested include
{% t "nested_translation" %}          ← Line 1: CURSOR HERE
```

**Result**: Finds `nested_translation` from `text_parts/translations.liquid`

### Override Behavior

```liquid
{% include "parts/translations" %}    ← Line 0: includes base definitions
{% t= "override" default:"Local" %}   ← Line 1: local override
{% t "override" %}                    ← Line 2: CURSOR HERE
```

**Result**: Shows "Local" (current file overrides included file)

## Configuration Support

### Config.json Formats

**Object Format (Current):**

```json
{
  "text_parts": {
    "part_1": "text_parts/part_1.liquid",
    "translations": "text_parts/translations.liquid"
  }
}
```

**Array Format (Legacy Support):**

```json
{
  "text_parts": ["text_parts/part_1.liquid", "text_parts/translations.liquid"]
}
```

### Dynamic Template Names

The system works with any template directory name:

- `recon_handle/` ✅
- `recon_hardadas/` ✅
- `my_template/` ✅
- `any_name/` ✅

## Error Handling

### Graceful Degradation

1. **Missing Files**: Warns about missing includes but continues processing
2. **Parse Errors**: Logs errors but doesn't crash the language server
3. **Circular Includes**: Detects and prevents infinite loops
4. **Malformed Config**: Falls back to single-file processing

### Debug Logging

Comprehensive logging helps troubleshoot issues:

```
[ScopeAwareProvider] Finding scoped translation 'key' at line 2
[ScopeAwareProvider] Found include: "parts/translations" -> /path/to/text_parts/translations.liquid
[ScopeAwareProvider] Scope context: 2 files in scope
[ScopeAwareProvider] Found translation definition in: /path/to/text_parts/translations.liquid
```

## Testing

The scope-aware functionality has comprehensive test coverage:

- **Basic Scope Tests**: Line-based scope filtering
- **Include Processing**: Single and nested includes
- **Path Resolution**: Various include path formats
- **Error Handling**: Missing files, circular includes
- **Config Formats**: Object and array text_parts formats
- **Edge Cases**: Empty files, malformed syntax

## Future Enhancements

### Shared Parts Support

The system is designed to support `shared_parts` when implemented:

```liquid
{% include "shared/component" %}  → parts/component.liquid (shared across templates)
{% include "parts/local" %}       → text_parts/local.liquid (template-specific)
```

### Performance Optimizations

- **Caching**: Cache parsed trees and include resolution
- **Incremental Updates**: Only re-parse changed files
- **Lazy Loading**: Load includes only when needed

## Integration

### LSP Handlers

Both hover and definition handlers use the scope-aware provider:

```typescript
// HoverHandler
const scopedDefinition =
  this.scopeAwareProvider.findScopedTranslationDefinition(
    this.textDocumentUri,
    translationKey,
    this.position.line,
  );

// DefinitionHandler
const definitionResult =
  this.scopeAwareProvider.findScopedTranslationDefinition(
    this.textDocumentUri,
    translationKey,
    this.position.line,
  );
```

### TreeSitter Integration

All parsing operations use TreeSitter queries:

```typescript
// Find include statements
const queryString = `
  (include_statement
    (string) @include_path
  )
`;

// Find translation definitions
const queryString = `
  (translation_statement
    key: (string) @translation_key
  )
`;
```

This ensures consistent, accurate parsing without regex dependencies.
