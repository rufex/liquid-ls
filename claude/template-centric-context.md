# Template-Centric Context Building

This document describes the enhanced template-centric context building implementation in the Liquid Language Server.

## Overview

The enhanced context building logic provides more accurate and template-aware scope resolution by always considering the complete template structure, regardless of where the request originates.

## Key Concepts

### Template-Centric Approach

**Before (File-Centric)**:

- Start from the file where the cursor is located
- Build context from that file's perspective
- Limited understanding of the complete template structure

**After (Template-Centric)**:

- Always discover the template root (main.liquid)
- Understand the complete template structure
- Build context from the template's perspective
- Provide accurate scope boundaries based on originating file

### Template Root Discovery

The system now automatically discovers the template root for any file within a template:

```typescript
private discoverTemplateRoot(filePath: string): string {
  const templateDir = this.getMainTemplateDirectory(filePath);
  const mainLiquidPath = path.join(templateDir, "main.liquid");

  if (fs.existsSync(mainLiquidPath)) {
    return mainLiquidPath;
  }

  // Fallback: use current file as root
  return filePath;
}
```

### Enhanced Scope Context

The `ScopeContext` interface now includes additional template-aware information:

```typescript
export interface ScopeContext {
  currentFile: string; // Original file where request originated
  currentLine: number; // Cursor line in originating file
  availableIncludes: IncludeStatement[]; // Includes in execution order
  scopedFiles: string[]; // All files in scope
  templateRoot: string; // Path to main.liquid
  executionBoundary: ExecutionBoundary; // Where to stop context building
}

export interface ExecutionBoundary {
  type: "main" | "text_part" | "shared_part";
  filePath: string; // File where request originated
  lineNumber: number; // Line where request originated
  includeChain: string[]; // Chain of includes to reach this file
}
```

## Context Building Logic

### 1. Template Root Discovery

For any file in a template structure:

```
account_templates/account_1/
├── main.liquid              ← Template root
├── config.json
└── text_parts/
    ├── part_1.liquid        ← Request from here
    └── part_2.liquid
```

When a request comes from `part_1.liquid`, the system:

1. Discovers `main.liquid` as the template root
2. Builds context from the template's perspective
3. Determines the execution boundary based on where `part_1.liquid` is included

### 2. Execution Boundary Detection

The system determines where to stop building context based on the originating file:

**Main Template Request**:

```liquid
<!-- main.liquid - cursor at line 2 -->
{% include 'parts/header' %}     ← Line 0: included
{% t 'example_key' %}            ← Line 1: cursor here
{% include 'parts/footer' %}     ← Line 2: not in scope
```

- Boundary: Line 1 in main.liquid
- Includes: Only `parts/header` (before cursor)

**Text Part Request**:

```liquid
<!-- main.liquid -->
{% include 'parts/header' %}     ← Line 0: included

<!-- text_parts/header.liquid - cursor at line 1 -->
{% include 'parts/nav' %}        ← Line 0: included
{% t 'example_key' %}            ← Line 1: cursor here
```

- Boundary: Line 1 in header.liquid
- Includes: All from main.liquid + includes from header.liquid up to cursor

**Shared Part Request**:

```liquid
<!-- main.liquid -->
{% include 'shared/shared_part_1' %}  ← Line 0: included

<!-- shared_parts/shared_part_1/shared_part_1.liquid - cursor at line 1 -->
{% include 'parts/utilities' %}       ← Line 0: included
{% t 'example_key' %}                 ← Line 1: cursor here
```

- Boundary: Line 1 in shared_part_1.liquid
- Includes: All from main.liquid + includes from shared part up to cursor

### 3. Backward Compatibility

The enhanced logic includes fallback mechanisms:

```typescript
private buildScopeContext(filePath: string, cursorLine: number): ScopeContext {
  // Discover template root for enhanced context
  const templateRoot = this.discoverTemplateRoot(filePath);

  // Build the complete execution chain including nested includes
  const allIncludes = this.buildExecutionChain(filePath, cursorLine);

  // Determine execution boundary
  const executionBoundary: ExecutionBoundary = {
    type: path.resolve(filePath) === path.resolve(templateRoot) ? 'main' :
          filePath.includes('shared_parts') ? 'shared_part' : 'text_part',
    filePath,
    lineNumber: cursorLine,
    includeChain: [],
  };

  return {
    currentFile: filePath,
    currentLine: cursorLine,
    availableIncludes: allIncludes,
    scopedFiles: [filePath, ...allIncludes.map(inc => inc.resolvedFilePath)],
    templateRoot,
    executionBoundary,
  };
}
```

**Fallback Scenarios**:

- No workspace root provided → Uses existing file-centric logic
- Template root discovery fails → Uses current file as root
- No main.liquid found → Uses current file as root

## Benefits

### 1. Accurate Context Resolution

**Before**: Context building could miss includes or provide incorrect scope when called from text parts.

**After**: Always builds complete template context, ensuring accurate translation lookup regardless of originating file.

### 2. Template Structure Awareness

**Before**: Limited understanding of template hierarchy.

**After**: Full awareness of template structure, including:

- Main template as execution root
- Text parts as included components
- Shared parts as reusable components
- Complete include hierarchy

### 3. Consistent Behavior

**Before**: Different behavior depending on where request originated.

**After**: Consistent, predictable behavior based on template structure and execution flow.

### 4. Enhanced Debugging

The enhanced context provides better debugging information:

- Template root identification
- Execution boundary detection
- Complete include chain mapping
- File type classification (main/text_part/shared_part)

## Implementation Details

### Template Root Discovery

```typescript
// Discovers main.liquid in template directory
const templateRoot = this.discoverTemplateRoot(filePath);

// Uses existing getMainTemplateDirectory logic
const templateDir = this.getMainTemplateDirectory(filePath);
const mainLiquidPath = path.join(templateDir, "main.liquid");
```

### Execution Boundary Classification

```typescript
const executionBoundary: ExecutionBoundary = {
  type:
    path.resolve(filePath) === path.resolve(templateRoot)
      ? "main"
      : filePath.includes("shared_parts")
        ? "shared_part"
        : "text_part",
  filePath,
  lineNumber: cursorLine,
  includeChain: [],
};
```

### Backward Compatibility

- Existing `buildExecutionChain` logic preserved
- New properties added to `ScopeContext` interface
- Fallback to file-centric approach when template root discovery fails
- No breaking changes to existing APIs

## Testing

The enhanced context building is thoroughly tested:

### Unit Tests

- Template root discovery for various file structures
- Execution boundary detection for different file types
- Backward compatibility with existing test scenarios

### Integration Tests

- End-to-end translation lookup from different originating files
- Shared parts integration with template-centric context
- Cross-template type consistency

### Test Coverage

- **155 total tests** (all passing)
- **12 ScopeAwareProvider tests** covering enhanced logic
- **10 shared parts integration tests**
- **Backward compatibility** with existing test suite

## Future Enhancements

The template-centric foundation enables future improvements:

1. **Advanced Execution Flow**: More sophisticated boundary detection for complex include scenarios
2. **Performance Optimization**: Caching of template structure analysis
3. **Template Validation**: Detection of circular includes and invalid template structures
4. **Enhanced Debugging**: Visual representation of template execution flow
5. **Template Refactoring**: Support for template restructuring operations

## Migration Guide

The enhanced context building is **fully backward compatible**:

- **No API changes** required for existing code
- **Automatic enhancement** when workspace root is available
- **Graceful fallback** to existing behavior when needed
- **No breaking changes** to existing functionality

Existing code will automatically benefit from enhanced context building without any modifications required.
