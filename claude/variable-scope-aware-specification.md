# Variable Scope-Aware Navigation Specification

## Current Limitation

The variable assignment go-to-definition functionality currently only works within single files. Variables defined in included parts or shared parts are not accessible from other files, even though they should be according to Liquid execution semantics.

## Problem Statement

Currently, this scenario **does not work**:

```liquid
<!-- main.liquid -->
{% include 'parts/definitions' %}
{{ part_var }}  <!-- ❌ Cannot navigate to definition -->

<!-- text_parts/definitions.liquid -->
{% assign part_var = 'value' %}  <!-- Definition not found -->
```

But this **should work** just like translations do:

```liquid
<!-- main.liquid -->
{% include 'parts/definitions' %}
{% t 'some_key' %}  <!-- ✅ Can navigate to definition -->

<!-- text_parts/definitions.liquid -->
{% t= 'some_key' default:'value' %}  <!-- Definition found! -->
```

## Required Implementation

### 1. Extend ScopeAwareProvider for Variables

The `ScopeAwareProvider` already handles scope-aware translation lookup. It needs to be extended to handle variable definitions using the same execution order and include processing logic.

#### New Methods Needed:

```typescript
// Add to ScopeAwareProvider
export interface VariableDefinitionResult {
  definition: Parser.SyntaxNode;
  filePath: string;
  variableName: string;
  definitionType: "assignment" | "capture" | "for_loop";
}

public findScopedVariableDefinition(
  fileUri: string,
  variableName: string,
  cursorLine: number,
): VariableDefinitionResult | null

private searchVariableInCurrentFileScope(
  filePath: string,
  variableName: string,
  maxLine: number,
): VariableDefinitionResult | null

private searchVariableInIncludedFile(
  filePath: string,
  variableName: string,
): VariableDefinitionResult | null
```

### 2. Update DefinitionHandler

The `DefinitionHandler` needs to use scope-aware variable lookup instead of single-file lookup.

#### Current Implementation:

```typescript
// In handleVariableDefinition() - SINGLE FILE ONLY
const definitionNode = this.provider.findVariableDefinitionByName(
  parsedTree,
  variableName,
);
```

#### Required Implementation:

```typescript
// Should use scope-aware lookup like translations do
const definitionResult = this.scopeAwareProvider.findScopedVariableDefinition(
  this.textDocumentUri,
  variableName,
  this.position.line,
);
```

### 3. Variable Scope Rules

Variables should follow the same scope rules as translations:

#### Execution Order:

1. **Current file** (up to cursor line)
2. **Included files** (in inclusion order, all lines)
3. **Nested includes** (processed recursively)

#### Precedence Rules:

1. **Local definitions** override included definitions
2. **Later includes** override earlier includes
3. **Nested includes** are processed in depth-first order

#### Template-Centric Context:

- When editing a part file, variables from main template should be accessible
- Include chain should be built from template root, not current file

## Test Scenarios

### Cross-File Navigation

```liquid
<!-- main.liquid -->
{% assign main_var = 'main' %}
{% include 'parts/definitions' %}
{{ part_var }}  <!-- Should navigate to definitions.liquid -->

<!-- text_parts/definitions.liquid -->
{% assign part_var = 'part' %}
{{ main_var }}  <!-- Should navigate to main.liquid -->
```

### Nested Includes

```liquid
<!-- main.liquid -->
{% include 'parts/level1' %}
{{ deep_var }}  <!-- Should navigate to level2.liquid -->

<!-- text_parts/level1.liquid -->
{% include 'parts/level2' %}

<!-- text_parts/level2.liquid -->
{% assign deep_var = 'deep' %}
```

### Variable Precedence

```liquid
<!-- main.liquid -->
{% assign shared_var = 'main_value' %}
{% include 'parts/override' %}
{{ shared_var }}  <!-- Should navigate to main.liquid (local precedence) -->

<!-- text_parts/override.liquid -->
{% assign shared_var = 'part_value' %}  <!-- This is overridden -->
```

### Shared Parts Integration

```liquid
<!-- main.liquid -->
{% include 'shared/shared_part_1' %}
{{ shared_var }}  <!-- Should navigate to shared part -->

<!-- shared_parts/shared_part_1/shared_part_1.liquid -->
{% assign shared_var = 'shared_value' %}
```

## Implementation Strategy

### Phase 1: Extend ScopeAwareProvider

1. Add `VariableDefinitionResult` interface
2. Implement `findScopedVariableDefinition()` method
3. Add variable search methods mirroring translation search methods
4. Reuse existing scope context building logic

### Phase 2: Update DefinitionHandler

1. Modify `handleVariableDefinition()` to use scope-aware lookup
2. Maintain fallback to single-file lookup for compatibility
3. Ensure proper error handling and logging

### Phase 3: Testing and Validation

1. Update existing integration tests to expect cross-file navigation
2. Add comprehensive scope precedence tests
3. Test shared parts integration
4. Validate performance with complex include hierarchies

## Expected Behavior After Implementation

### ✅ What Should Work:

| Scenario              | Example                                 | Expected Result                    |
| --------------------- | --------------------------------------- | ---------------------------------- |
| Cross-file navigation | `main.liquid` → `{{ part_var }}`        | Navigate to `definitions.liquid`   |
| Reverse navigation    | `definitions.liquid` → `{{ main_var }}` | Navigate to `main.liquid`          |
| Nested includes       | `main.liquid` → `{{ deep_var }}`        | Navigate through multiple includes |
| Variable precedence   | Local vs included definitions           | Local definition takes precedence  |
| Shared parts          | `{{ shared_var }}`                      | Navigate to shared part definition |
| Template-centric      | Part file accessing main variables      | Access main template scope         |

### 🔄 Scope Execution Order:

```
main.liquid (lines 1-5)
  ↓ include 'parts/definitions'
    definitions.liquid (all lines)
      ↓ include 'parts/nested'
        nested.liquid (all lines)
      ↑ return to definitions.liquid
    ↑ return to main.liquid
main.liquid (lines 6-end)
```

Variables defined in any of these files should be accessible according to this execution order.

## Integration with Existing Features

### Reuse Translation Infrastructure:

- ✅ Scope context building (`buildScopeContext`)
- ✅ Include statement processing (`findIncludeStatements`)
- ✅ Template-centric execution chain (`buildTemplatecentricExecutionChain`)
- ✅ Shared parts integration (`SharedPartsProvider`)
- ✅ File resolution and caching

### Maintain Consistency:

- Variable scope rules should match translation scope rules
- Error handling should be consistent
- Logging and debugging should follow same patterns
- Performance characteristics should be similar

## Success Criteria

1. **Cross-file navigation works**: Variables defined in included files are findable
2. **Scope precedence respected**: Local definitions override included ones
3. **Nested includes supported**: Deep include hierarchies work correctly
4. **Shared parts integration**: Variables from shared parts are accessible
5. **Performance maintained**: No significant performance degradation
6. **Backward compatibility**: Existing single-file functionality still works
7. **Test coverage**: All scenarios covered by integration tests

## Current Test Results

The integration tests demonstrate the current limitation:

```
❌ Cross-file variable navigation not yet implemented
❌ Nested include variable navigation not yet implemented
❌ part_var from included file: Not found (expected: definitions.liquid)
❌ nested_var from nested include: Not found (expected: nested.liquid)
```

After implementation, these should all show:

```
✅ Cross-file variable navigation working
✅ Nested include variable navigation working
✅ part_var from included file: Found (definitions.liquid)
✅ nested_var from nested include: Found (nested.liquid)
```

This specification provides a clear roadmap for implementing scope-aware variable navigation that matches the existing translation functionality.
