# Variable Assignment Go-to-Definition Functionality

This document describes the comprehensive variable assignment go-to-definition functionality implemented in the Liquid Language Server.

## Overview

The language server provides intelligent go-to-definition support for all variable reference contexts in Liquid templates, enabling developers to navigate from variable usage to their definitions across files.

## Variable Reference Support Table

The language server supports go-to-definition for all variable reference contexts:

| Context           | Example                                               | Status | Test Coverage |
| ----------------- | ----------------------------------------------------- | ------ | ------------- |
| Assignment        | `{% assign foo = 'value' %}` → `{{ foo }}`            | ✅     | ✅            |
| Capture           | `{% capture bar %}Text{% endcapture %}` → `{{ bar }}` | ✅     | ✅            |
| For Loop Variable | `{% for i in items %}` → `{{ i }}`                    | ✅     | ✅            |
| Output Statement  | `{{ variable }}`                                      | ✅     | ✅            |
| Filter Body       | `variable \| filter`                                  | ✅     | ✅            |
| Assignment Value  | `assign x = variable`                                 | ✅     | ✅            |
| For Loop Iterator | `{% for i in variable %}`                             | ✅     | ✅            |
| Bracket Notation  | `{% assign [variable] = value %}`                     | ✅     | ✅            |

## Implementation Details

### Core Components

1. **TreeSitterLiquidProvider**: Enhanced with variable detection methods
   - `findVariableDefinitions()`: Finds all variable definitions using TreeSitter queries
   - `findVariableReferences()`: Identifies standalone variable references
   - `getVariableAtPosition()`: Detects variable references at cursor position
   - `findVariableDefinitionByName()`: Locates definition by variable name
   - `getVariableNameLocation()`: Gets precise location of variable name in definitions

2. **DefinitionHandler**: Updated to handle variable definitions
   - Priority order: Include statements → Variable references → Translation calls
   - Precise navigation to exact variable name location in definitions
   - Fallback support for full definition node if precise location unavailable

3. **Bracket Notation Support**: Special handling for `[variable]` syntax
   - `isBracketNotation()`: Detects bracket notation pattern
   - `extractVariableFromBracketNotation()`: Extracts variable name from brackets
   - Semantic understanding: treats `[complex]` as reference to `complex` variable

### Variable Definition Types

#### 1. Assignment Statements

```liquid
{% assign simple_var = 'Hello World' %}  -- Definition
{{ simple_var }}                         -- Reference
```

#### 2. Capture Statements

```liquid
{% capture complex_var %}Content{% endcapture %}  -- Definition
{{ complex_var }}                                 -- Reference
```

#### 3. For Loop Variables

```liquid
{% for loop_item in items %}  -- Definition of loop_item
  {{ loop_item }}             -- Reference
{% endfor %}
```

#### 4. For Loop Iterators

```liquid
{% assign items = "a,b,c" | split: "," %}  -- Definition of items
{% for i in items %}                       -- Reference to items
  {{ i }}
{% endfor %}
```

#### 5. Filter Body References

```liquid
{% assign data = 'hello' %}  -- Definition
{{ data | upcase }}          -- Reference in filter body
```

#### 6. Assignment Value References

```liquid
{% assign original = 'value' %}      -- Definition
{% assign copy = original %}         -- Reference in assignment value
```

#### 7. Bracket Notation References

```liquid
{% capture complex %}key{% endcapture %}     -- Definition
{% assign [complex] = 'Complex value' %}     -- Reference via bracket notation
```

## Test Coverage

### Unit Tests

- **41 TreeSitter Provider Tests**: Variable detection, parsing, and position handling
- **16 Definition Handler Tests**: Variable definition navigation and error handling

### Integration Tests

- **9 Integration Tests**: End-to-end testing with real fixture files
- **Comprehensive Context Test**: Single test validating all 8 variable reference contexts
- **Error Handling Tests**: Undefined variables and malformed references

### Test Fixtures

```
fixtures/market-repo/reconciliation_texts/variable_test/
├── main.liquid              # All 8 variable reference contexts
├── config.json              # Template configuration
└── text_parts/
    ├── variables.liquid      # Additional variable definitions
    ├── assignments.liquid    # Complex assignment scenarios
    └── loops.liquid          # For loop variable scenarios
```

## Usage Examples

### Basic Assignment and Reference

```liquid
{% assign greeting = 'Hello World' %}
{{ greeting }}  <!-- Go-to-definition navigates to assignment -->
```

### Complex Filter Chain

```liquid
{% assign name = 'john' %}
{{ name | capitalize | append: ' Doe' }}  <!-- Navigate from name to assignment -->
```

### For Loop with Iterator Reference

```liquid
{% assign colors = 'red,green,blue' | split: ',' %}
{% for color in colors %}  <!-- Navigate from colors to assignment -->
  {{ color }}              <!-- Navigate from color to for loop -->
{% endfor %}
```

### Bracket Notation

```liquid
{% capture dynamic_key %}user_name{% endcapture %}
{% assign [dynamic_key] = 'John' %}  <!-- Navigate from dynamic_key to capture -->
```

### Cross-File References

```liquid
<!-- main.liquid -->
{% assign shared_data = 'important' %}
{% include 'parts/processor' %}

<!-- text_parts/processor.liquid -->
{{ shared_data | upcase }}  <!-- Navigate to main.liquid assignment -->
```

## Error Handling

The implementation gracefully handles:

- **Undefined Variables**: Returns `null` for non-existent variable references
- **Malformed Syntax**: Handles parsing errors without crashing
- **Missing Files**: Proper error handling for file system issues
- **Circular References**: Protection against infinite loops in include processing

## Performance Considerations

- **TreeSitter Parsing**: Efficient syntax tree traversal for variable detection
- **Scope-Aware Lookup**: Only searches relevant files and scope contexts
- **Precise Navigation**: Direct navigation to variable name, not entire statement
- **Caching**: Leverages existing file caching mechanisms

## Future Enhancements

Potential improvements:

1. **Variable Renaming**: Rename variables across all references
2. **Find All References**: Show all usages of a variable
3. **Variable Validation**: Warn about undefined variable usage
4. **Auto-completion**: Suggest available variables in scope
5. **Variable Hover**: Show variable value and type information

## Development Notes

- **TreeSitter Constraint**: All parsing uses TreeSitter queries, no regex parsing
- **Scope Awareness**: Respects Liquid execution flow and include order
- **Type Safety**: Full TypeScript coverage with strict type checking
- **Test-Driven**: Comprehensive test coverage ensures reliability
- **Code Quality**: Passes ESLint and Prettier formatting standards

This functionality significantly enhances the developer experience when working with Liquid templates by providing intelligent navigation between variable definitions and their usage across template files.
