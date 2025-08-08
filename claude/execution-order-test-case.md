# Execution Order Test Case

## Complex Include Scenario

This test case demonstrates why proper execution timeline modeling is critical for variable precedence.

### File Structure

```
template/
├── main.liquid
├── text_parts/
│   └── part_1.liquid
└── shared_parts/
    └── shared_part_1.liquid
```

### File Contents

**main.liquid**:

```liquid
{% assign foo = 'main_foo' %}        <!-- Step 1 -->
{% assign bar = 'main_bar' %}        <!-- Step 2 -->
{% for item in items %}              <!-- Step 3 -->
  {{ bar }}                          <!-- Step 4: Should find 'main_bar' -->
{% endfor %}
{% include 'parts/part_1' %}         <!-- Step 5: Enter part_1 -->
{% include 'shared/shared_part_1' %} <!-- Step 7: Enter shared_part_1 -->
{% include 'parts/part_1' %}         <!-- Step 9: Enter part_1 AGAIN -->
{{ bar }}                            <!-- Step 11: Should find 'part1_bar' (most recent) -->
```

**text_parts/part_1.liquid**:

```liquid
{% assign bar = 'part1_bar' %}       <!-- Step 6 and Step 10 -->
{% assign foo = 'part1_foo' %}       <!-- Overrides foo each time -->
```

**shared_parts/shared_part_1.liquid**:

```liquid
{% assign bar = 'shared_bar' %}      <!-- Step 8 -->
{% assign baz = 'shared_baz' %}      <!-- New variable -->
```

## Expected Execution Timeline

```
Step 1:  main.liquid:1     | assign foo = 'main_foo'
Step 2:  main.liquid:2     | assign bar = 'main_bar'
Step 3:  main.liquid:3     | for loop starts
Step 4:  main.liquid:4     | {{ bar }} → should find 'main_bar' (Step 2)
Step 5:  main.liquid:6     | include 'parts/part_1' (first time)
Step 6:    part_1.liquid:1 | assign bar = 'part1_bar' (OVERRIDES Step 2)
Step 7:  main.liquid:7     | include 'shared/shared_part_1'
Step 8:    shared_part_1:1 | assign bar = 'shared_bar' (OVERRIDES Step 6)
Step 9:  main.liquid:8     | include 'parts/part_1' (second time)
Step 10:   part_1.liquid:1 | assign bar = 'part1_bar' (OVERRIDES Step 8)
Step 11: main.liquid:9     | {{ bar }} → should find 'part1_bar' (Step 10)
```

## Variable State at Each Step

| Step | foo         | bar          | baz          |
| ---- | ----------- | ------------ | ------------ |
| 1    | 'main_foo'  | undefined    | undefined    |
| 2    | 'main_foo'  | 'main_bar'   | undefined    |
| 4    | 'main_foo'  | 'main_bar'   | undefined    |
| 6    | 'part1_foo' | 'part1_bar'  | undefined    |
| 8    | 'part1_foo' | 'shared_bar' | 'shared_baz' |
| 10   | 'part1_foo' | 'part1_bar'  | 'shared_baz' |
| 11   | 'part1_foo' | 'part1_bar'  | 'shared_baz' |

## Test Cases

### Test Case 1: Early Reference

- **Position**: `{{ bar }}` at Step 4 (main.liquid line 4)
- **Expected**: Should find definition from Step 2 (main.liquid line 2)
- **Current Issue**: May find later definition incorrectly

### Test Case 2: Final Reference

- **Position**: `{{ bar }}` at Step 11 (main.liquid line 9)
- **Expected**: Should find definition from Step 10 (part_1.liquid line 1, second execution)
- **Current Issue**: May find wrong definition or first execution of part_1

### Test Case 3: Repeated Include Handling

- **Position**: Any reference to variables defined in `part_1.liquid`
- **Expected**: Should find definition from most recent execution
- **Current Issue**: Doesn't distinguish between multiple executions of same file

## Why Current Implementation Fails

1. **No Execution Timeline**: Treats all includes as static, doesn't model temporal execution
2. **No Repeated Include Support**: Doesn't handle same file included multiple times
3. **Incorrect Precedence**: Uses file-based precedence instead of execution-order precedence
4. **No Step Tracking**: Can't determine which execution of a file produced a definition

## Required ExecutionTimelineBuilder Features

1. **Global Step Counter**: Assign unique step numbers to every statement execution
2. **Include Stack Tracking**: Track nested include calls and returns
3. **Repeated Execution Support**: Handle same file included multiple times
4. **Variable Definition History**: Track all assignments with step numbers
5. **Scope Resolution**: For any position, determine which definitions are in scope
6. **Most Recent Lookup**: Find most recent definition by step number, not file order

## Implementation Priority

**CRITICAL** - This scenario is common in real Silverfin templates where:

- Parts are reused multiple times
- Variables are overridden in different contexts
- Execution order determines final variable values
- Developers need accurate go-to-definition for debugging
