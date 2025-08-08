# Liquid Execution Order and Scope Specification

## Current Problem

The current variable precedence implementation doesn't correctly model Liquid template execution order. We need a proper representation of:

1. **Execution Flow**: The temporal order in which Liquid statements are processed
2. **Variable Scope**: Which variables are accessible at any given point
3. **Include Processing**: How `{% include %}` statements affect execution flow
4. **Variable Precedence**: Which definition "wins" when a variable is defined multiple times

## Current Issues

### Issue 1: Incorrect Precedence Logic

```liquid
<!-- main.liquid -->
{% include 'parts/shared_vars' %}                <!-- Line 19: Executes FIRST -->
{% assign override_var = 'Local override' %}     <!-- Line 20: Executes SECOND -->
{{ override_var }}                               <!-- Line 25: Should find Line 20 definition -->
```

**Expected**: Should find definition on Line 20 (most recent in execution order)
**Current**: May find definition in shared_vars.liquid (incorrect)

### Issue 2: Complex Execution Flow Not Modeled

```liquid
<!-- main.liquid -->
{% assign var1 = 'main_1' %}                     <!-- Step 1 -->
{% include 'parts/part1' %}                      <!-- Step 2: Enter part1 -->
  <!-- part1.liquid -->
  {% assign var1 = 'part1_1' %}                  <!-- Step 3: Override var1 -->
  {% include 'parts/part2' %}                    <!-- Step 4: Enter part2 -->
    <!-- part2.liquid -->
    {% assign var1 = 'part2_1' %}                <!-- Step 5: Override var1 again -->
  <!-- Back to part1.liquid -->
  {% assign var2 = var1 %}                       <!-- Step 6: var1 = 'part2_1' -->
<!-- Back to main.liquid -->
{% assign var3 = var1 %}                         <!-- Step 7: var1 = 'part2_1' -->
{{ var1 }}                                       <!-- Step 8: Should be 'part2_1' -->
```

## Required Solution: Execution Tree/Timeline

We need to build a **complete execution timeline** that represents the exact order in which Liquid statements are processed.

### Proposed Data Structure

```typescript
interface ExecutionStep {
  stepNumber: number; // Global execution order (1, 2, 3, ...)
  file: string; // File path where this step occurs
  line: number; // Line number in the file (0-based)
  type: "assignment" | "capture" | "for_loop" | "include" | "reference";
  variableName?: string; // For variable operations
  includePath?: string; // For include operations
  nestedSteps?: ExecutionStep[]; // For include operations
}

interface ExecutionTimeline {
  steps: ExecutionStep[];
  variableDefinitions: Map<string, ExecutionStep[]>; // All definitions per variable
  scopeAtPosition: (file: string, line: number) => VariableScope;
}

interface VariableScope {
  availableVariables: Map<string, ExecutionStep>; // Most recent definition per variable
  executionContext: ExecutionStep[]; // All steps up to this point
}
```

### Example Execution Timeline

For the complex example above:

```typescript
const timeline: ExecutionTimeline = {
  steps: [
    {
      stepNumber: 1,
      file: "main.liquid",
      line: 0,
      type: "assignment",
      variableName: "var1",
    },
    {
      stepNumber: 2,
      file: "main.liquid",
      line: 1,
      type: "include",
      includePath: "parts/part1",
      nestedSteps: [
        {
          stepNumber: 3,
          file: "part1.liquid",
          line: 0,
          type: "assignment",
          variableName: "var1",
        },
        {
          stepNumber: 4,
          file: "part1.liquid",
          line: 1,
          type: "include",
          includePath: "parts/part2",
          nestedSteps: [
            {
              stepNumber: 5,
              file: "part2.liquid",
              line: 0,
              type: "assignment",
              variableName: "var1",
            },
          ],
        },
        {
          stepNumber: 6,
          file: "part1.liquid",
          line: 2,
          type: "assignment",
          variableName: "var2",
        },
      ],
    },
    {
      stepNumber: 7,
      file: "main.liquid",
      line: 2,
      type: "assignment",
      variableName: "var3",
    },
    {
      stepNumber: 8,
      file: "main.liquid",
      line: 3,
      type: "reference",
      variableName: "var1",
    },
  ],
  variableDefinitions: new Map([
    ["var1", [step1, step3, step5]], // All definitions of var1
    ["var2", [step6]],
    ["var3", [step7]],
  ]),
};
```

## Implementation Plan

### Phase 1: Execution Timeline Builder

- [ ] Create `ExecutionTimelineBuilder` class
- [ ] Parse all files in template and build complete execution timeline
- [ ] Handle include statements recursively
- [ ] Assign global step numbers in execution order
- [ ] Handle circular includes (prevent infinite loops)

### Phase 2: Scope-Aware Variable Resolution

- [ ] Implement `scopeAtPosition(file, line)` method
- [ ] For any cursor position, determine which variables are in scope
- [ ] For each variable, find the most recent definition in execution order
- [ ] Handle template-centric context (part files accessing main template variables)

### Phase 3: Integration with Language Server

- [ ] Update `ScopeAwareProvider` to use execution timeline
- [ ] Update variable definition lookup to use timeline-based precedence
- [ ] Update hover information to show execution order context
- [ ] Add debugging/visualization tools for execution timeline

### Phase 4: Advanced Features

- [ ] Show all definitions of a variable (with execution order)
- [ ] Variable lifecycle visualization
- [ ] Execution flow debugging
- [ ] Performance optimization for large template hierarchies

## Test Cases to Implement

### Basic Precedence

```liquid
{% assign var = 'first' %}
{% include 'parts/override' %}  <!-- {% assign var = 'second' %} -->
{{ var }}  <!-- Should be 'second' -->
```

### Reverse Precedence

```liquid
{% include 'parts/define' %}    <!-- {% assign var = 'first' %} -->
{% assign var = 'second' %}
{{ var }}  <!-- Should be 'second' -->
```

### Nested Includes

```liquid
{% assign var = 'main' %}
{% include 'parts/level1' %}
  <!-- level1: {% assign var = 'level1' %} -->
  <!-- level1: {% include 'parts/level2' %} -->
    <!-- level2: {% assign var = 'level2' %} -->
{{ var }}  <!-- Should be 'level2' -->
```

### Template-Centric Context

```liquid
<!-- main.liquid -->
{% assign main_var = 'from_main' %}
{% include 'parts/consumer' %}

<!-- parts/consumer.liquid -->
{{ main_var }}  <!-- Should find 'from_main' -->
{% assign main_var = 'overridden' %}
{{ main_var }}  <!-- Should be 'overridden' -->
```

## Test Cases

See `claude/execution-order-test-case.md` for a comprehensive example demonstrating:

- Multiple includes of the same file
- Variable overrides across execution steps
- Proper timeline modeling requirements
- Expected vs. current behavior

## Current Status

- ❌ **PENDING**: Execution timeline builder implementation
- ❌ **PENDING**: Scope-aware variable resolution using timeline
- ❌ **PENDING**: Integration with existing language server
- ❌ **PENDING**: Comprehensive test suite for execution order scenarios

## Priority

**HIGH** - This is fundamental to correct Liquid template processing and affects:

- Variable go-to-definition accuracy
- Hover information correctness
- Template debugging capabilities
- Developer experience with complex template hierarchies

The current implementation is a temporary workaround that doesn't handle complex execution scenarios correctly.
