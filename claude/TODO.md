# TODO - Liquid Language Server

## 🚨 CRITICAL PRIORITY

### **Execution Timeline & Variable Precedence System**

**Status**: ❌ **PENDING IMPLEMENTATION**  
**Priority**: **HIGH**  
**Affects**: Core language server functionality

**Problem**: Current variable precedence logic doesn't correctly model Liquid template execution order.

**Example Issue**:

```liquid
<!-- main.liquid -->
{% include 'parts/shared_vars' %}    <!-- Executes FIRST -->
{% assign override_var = 'local' %}  <!-- Executes SECOND -->
{{ override_var }}                   <!-- Should find 'local', may find shared_vars -->
```

**Required Implementation**:

- [ ] **ExecutionTimelineBuilder** class
- [ ] Complete execution timeline for all template files
- [ ] Proper temporal ordering of Liquid statements
- [ ] Variable precedence based on execution order
- [ ] Template-centric context with correct scope resolution

**Documentation**: See `claude/liquid-execution-order-specification.md`

---

## HIGH PRIORITY

### **Multiple Definition Support**

- [ ] Show all places where a variable/translation is defined
- [ ] Let developers choose which definition to navigate to
- [ ] Display execution order context for each definition

### **Variable Lifecycle Visualization**

- [ ] Show variable assignment history
- [ ] Debug variable overrides and precedence
- [ ] Execution flow visualization

---

## MEDIUM PRIORITY

### **Language Server Features**

- [ ] Auto-completion for translation keys and variables
- [ ] Rename refactoring across files
- [ ] Find all references functionality
- [ ] Translation validation (missing translations)

### **File Format Support**

- [ ] YAML/JSON translation files
- [ ] External translation file integration

### **Shared Parts Integration**

- [ ] Complete shared_parts directory support
- [ ] Shared parts validation and navigation

---

## LOW PRIORITY

### **Developer Experience**

- [ ] Better error messages and diagnostics
- [ ] Performance optimization for large template hierarchies
- [ ] Template debugging tools
- [ ] LSP client integration guides

---

## COMPLETED ✅

- ✅ Cross-file variable navigation (basic implementation)
- ✅ Template-centric context building
- ✅ Scope-aware translation lookup
- ✅ Include statement go-to-definition
- ✅ Nested include support
- ✅ TreeSitter integration for parsing
- ✅ Comprehensive test coverage
- ✅ Multi-locale translation support
- ✅ Config.json path resolution
