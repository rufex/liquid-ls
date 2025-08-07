# Shared Parts Implementation

This document describes the implementation of shared parts functionality in the Liquid Language Server.

## Overview

Shared parts are reusable Liquid template components that can be shared across multiple templates with controlled access based on configuration. The implementation provides:

1. **Discovery and Mapping**: Automatic discovery of shared parts from `shared_parts/` directories
2. **Usage Validation**: Access control based on `used_in` configuration in shared part configs
3. **Go-to-Definition**: Navigation from `{% include 'shared/name' %}` to shared part files
4. **Translation Scope**: Shared part translations are included in scope-aware lookup

## Architecture

### Core Components

1. **SharedPartsProvider** (`src/sharedPartsProvider.ts`)
   - Discovers and maps shared parts from filesystem
   - Validates usage permissions based on config
   - Provides template handle extraction from URIs

2. **ScopeAwareProvider** (extended)
   - Enhanced `resolveIncludePath()` to handle `shared/` prefix
   - Integrates with SharedPartsProvider for validation
   - Includes shared parts in translation scope resolution

3. **DefinitionHandler** (enhanced)
   - Uses existing include resolution logic
   - Automatically validates shared part access through ScopeAwareProvider

4. **Server** (enhanced)
   - Passes workspace root to handlers for shared parts initialization
   - Maintains backward compatibility with existing functionality

## File Structure

```
shared_parts/
├── shared_part_1/
│   ├── config.json              # Configuration with used_in mapping
│   └── shared_part_1.liquid     # Shared part content
├── shared_part_2/
│   ├── config.json
│   └── shared_part_2.liquid
└── shared_part_3/
    ├── config.json
    └── shared_part_3.liquid
```

## Configuration Format

### Shared Part Config (`shared_parts/*/config.json`)

```json
{
  "name": "shared_part_1",
  "text": "shared_part_1.liquid",
  "used_in": [
    {
      "type": "reconciliationText",
      "handle": "reconciliation_text_1",
      "id": { "1001": 768001, "1002": 888001 },
      "partner_id": { "25": 4561, "26": 7891 }
    },
    {
      "type": "reconciliationText",
      "handle": "reconciliation_text_2",
      "id": { "1001": 768002, "1002": 888002 },
      "partner_id": { "25": 4562, "26": 7892 }
    }
  ],
  "externally_managed": true
}
```

**Key Fields:**

- `name`: Shared part identifier
- `text`: Liquid file name within the shared part directory
- `used_in`: Array of templates allowed to use this shared part
  - `type`: Template type (reconciliationText, accountTemplate, exportFile)
  - `handle`: Template handle/name
  - `id`, `partner_id`: Additional Silverfin-specific identifiers

## Usage Patterns

### Include Syntax

```liquid
<!-- Standard parts (maps to text_parts/) -->
{% include 'parts/header' %}

<!-- Shared parts (maps to shared_parts/) -->
{% include 'shared/shared_part_1' %}
```

### Validation Rules

1. **Shared Part Exists**: The shared part must exist in `shared_parts/`
2. **Config Valid**: The shared part must have a valid `config.json`
3. **Usage Allowed**: The current template must be listed in the shared part's `used_in` array
4. **Handle Match**: The template handle must match exactly

### Translation Scope

Shared parts are included in scope-aware translation lookup:

```liquid
{% include 'shared/shared_part_1' %}  ← Line 0: includes shared part
{% t 'shared_translation' %}          ← Line 1: finds translation from shared part
```

## Implementation Details

### SharedPartsProvider

**Key Methods:**

- `discoverSharedParts()`: Scans filesystem for shared parts
- `getSharedPart(name)`: Returns shared part mapping
- `isSharedPartAllowedForTemplate(sharedPartName, templateHandle)`: Validates usage
- `getTemplateHandleFromUri(uri)`: Extracts template handle from file URI

**Data Structures:**

- `sharedPartsMap`: Maps shared part names to file paths and usage info
- `templateToSharedParts`: Maps template handles to allowed shared parts

### ScopeAwareProvider Integration

**Enhanced `resolveIncludePath()`:**

```typescript
if (includePath.startsWith("shared/") && this.sharedPartsProvider) {
  const sharedPartName = includePath.substring(7); // Remove "shared/" prefix
  const sharedPart = this.sharedPartsProvider.getSharedPart(sharedPartName);

  if (sharedPart) {
    const templateHandle = this.getTemplateHandleFromPath(templateDir);
    if (
      templateHandle &&
      this.sharedPartsProvider.isSharedPartAllowedForTemplate(
        sharedPartName,
        templateHandle,
      )
    ) {
      return sharedPart.filePath;
    }
  }
}
```

### Error Handling

1. **Missing Shared Parts Directory**: Gracefully handled, no shared parts available
2. **Invalid Config**: Logged as warning, shared part skipped
3. **Missing Liquid File**: Logged as warning, shared part skipped
4. **Access Denied**: Returns null, no navigation allowed
5. **Circular Includes**: Protected by existing circular include detection

## Testing

### Test Coverage

1. **SharedPartsProvider Tests** (`test/sharedPartsProvider.test.ts`)
   - Discovery and mapping functionality
   - Usage validation logic
   - Template handle extraction
   - Error handling scenarios

2. **ScopeAwareProvider Tests** (extended)
   - Shared parts resolution
   - Usage validation integration
   - Translation scope inclusion

3. **Integration Tests** (`test/fixtures-integration.test.ts`)
   - End-to-end shared parts navigation
   - Translation scope with shared parts
   - Validation scenarios
   - Error handling

### Test Fixtures

Enhanced fixtures in `fixtures/market-repo/`:

- `shared_parts/shared_part_1/`: Used by RT1 and RT2
- `shared_parts/shared_part_2/`: Used by RT2 only
- `shared_parts/shared_part_3/`: Empty used_in (not accessible)
- Updated RT templates with shared part includes

## Performance Considerations

1. **Startup Discovery**: Shared parts are discovered once on initialization
2. **Caching**: Shared parts mapping is cached in memory
3. **Lazy Loading**: Only processes shared parts when workspace root is available
4. **Validation Caching**: Template-to-shared-parts mapping is pre-computed

## Future Enhancements

1. **Dynamic Config Monitoring**: Watch for shared part config changes
2. **Shared Parts Hover**: Show shared part usage information on hover
3. **Shared Parts Auto-completion**: Suggest available shared parts
4. **Usage Analytics**: Track shared part usage across templates
5. **Validation Warnings**: Warn about invalid shared part references

## Backward Compatibility

The shared parts implementation maintains full backward compatibility:

- Existing `parts/` includes continue to work unchanged
- No breaking changes to existing APIs
- Optional workspace root parameter (graceful degradation)
- Existing tests continue to pass

## Error Messages

Common error scenarios and their handling:

1. **Shared part not found**: Returns null, no navigation
2. **Access denied**: Returns null, logs warning about usage restriction
3. **Invalid config**: Logs warning, shared part skipped during discovery
4. **Missing workspace root**: Shared parts functionality disabled, no errors

## Integration Points

The shared parts implementation integrates with:

1. **Language Server**: Receives workspace root during initialization
2. **Hover Handler**: Uses shared parts for translation scope
3. **Definition Handler**: Uses shared parts for navigation
4. **TreeSitter Provider**: Existing include parsing (no changes needed)
5. **Related Files Provider**: Existing template discovery (no changes needed)

This implementation provides a solid foundation for shared parts functionality while maintaining the existing architecture and ensuring robust error handling and validation.
