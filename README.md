# Liquid Language Server

A Language Server Protocol (LSP) implementation for Silverfin Liquid templates, providing intelligent code assistance and navigation features.

## Features

### **Translation Hover Information**

Hover over translation calls to see all available locale translations:

```liquid
{% t 'welcome_message' %}
```

**Hover shows:**

- Translation key: `welcome_message`
- All available locales (default, nl, fr, es, etc.)
- Formatted translation content

### **Translation Go-to-Definition**

Navigate from translation calls to their definitions:

```liquid
<!-- Ctrl+Click or F12 on translation call -->
{% t 'welcome_message' %}

<!-- Navigates to definition -->
{% t= 'welcome_message' default:'Welcome!' nl:'Welkom!' fr:'Bienvenue!' %}
```

### **Include Statement Go-to-Definition**

Navigate from include statements to the included files:

```liquid
<!-- Ctrl+Click or F12 on include statement -->
{% include 'parts/header' %}

<!-- Navigates to text_parts/header.liquid -->
```

### **Shared Parts Support**

Access shared parts across templates with validation:

```liquid
<!-- Include shared parts with validation -->
{% include 'shared/shared_part_name' %}

<!-- Navigates to shared_parts/shared_part_name/shared_part_name.liquid -->
<!-- Only works if template is in shared part's used_in configuration -->
```

**Features:**

- **Usage Validation**: Only allows access to shared parts configured for the current template
- **Go-to-Definition**: Navigate from shared includes to shared part files
- **Translation Scope**: Shared part translations are included in scope-aware lookup
- **Config-Based**: Uses `shared_parts/*/config.json` for usage permissions

## Supported Template Types

- **Account Templates (AT)**: `account_templates/`
- **Reconciliation Texts (RT)**: `reconciliation_texts/`
- **Export Files (EF)**: `export_files/`
- **Shared Parts (SP)**: `shared_parts/`

## Template Structure Support

### Standard Structure

```
template_name/
├── main.liquid              # Main template file
├── config.json              # Template configuration
└── text_parts/              # Text parts directory
    ├── header.liquid
    ├── footer.liquid
    └── navigation.liquid
```

### Shared Parts Structure

```
shared_parts/
└── shared_part_name/
    ├── config.json          # Shared part configuration
    └── shared_part_name.liquid
```

**Shared Part Config Example:**

```json
{
  "name": "shared_part_name",
  "text": "shared_part_name.liquid",
  "used_in": [
    {
      "type": "reconciliationText",
      "handle": "reconciliation_text_1"
    },
    {
      "type": "reconciliationText",
      "handle": "reconciliation_text_2"
    }
  ]
}
```

### Config.json Integration

The language server automatically detects Silverfin template structures and reads `config.json` files for path resolution. No additional configuration is required.

```json
{
  "text_parts": {
    "header": "text_parts/header.liquid",
    "footer": "text_parts/footer.liquid",
    "custom_part": "custom_directory/my_part.liquid"
  }
}
```

## Intelligent Features

### 🧠 **Scope-Aware Translation Lookup**

Only shows translations that are "in scope" based on include order:

```liquid
{% include 'parts/translations' %}  ← Includes translation definitions
{% t 'example_key' %}               ← Found (in scope)

{% t 'future_key' %}                ← Not found (out of scope)
{% include 'parts/future_defs' %}   ← Includes come after usage
```

### **Nested Include Support**

Handles complex include hierarchies:

```liquid
<!-- main.liquid -->
{% include 'parts/header' %}

<!-- text_parts/header.liquid -->
{% include 'parts/navigation' %}    ← Nested include support

<!-- text_parts/navigation.liquid -->
{% t= 'nav_home' default:'Home' %}  ← Available in main.liquid
```

## Implementation Status

### ✅ **Completed Features**

- **Translation Hover Information**: Shows all locale translations when hovering over `{% t 'key' %}` calls
- **Translation Go-to-Definition**: Navigate from translation calls to their definitions
- **Include Go-to-Definition**: Navigate from `{% include 'parts/name' %}` statements to included files
- **Shared Parts Support**: Navigate from `{% include 'shared/name' %}` with usage validation
- **Scope-Aware Translation Lookup**: Only shows translations that are "in scope" at cursor position
- **Cross-File Translation Search**: Searches across all related template files (main + text_parts + shared_parts)
- **Include Statement Processing**: Handles `{% include "parts/name" %}` and `{% include "shared/name" %}` statements
- **Multi-locale Support**: Displays all available language translations in formatted lists
- **Precise Navigation**: Jumps to exact translation key location in definitions
- **Dynamic Template Structure**: Supports any template directory name with flexible config.json format
- **Config.json Path Resolution**: Uses config.json mappings for accurate file path resolution
- **Shared Parts Validation**: Only allows access to shared parts configured for the current template
- **Comprehensive Testing**: Full test coverage for all components (155+ tests, 100% passing)

### 🔄 **Template Type Support**

- **Account Templates (AT)**: ✅ Full support
- **Reconciliation Texts (RT)**: ✅ Full support
- **Export Files (EF)**: ✅ Full support
- **Shared Parts (SP)**: ✅ Full support with validation

### 🚀 **Future Enhancements**

- **Translation validation**: Warn about missing translations
- **Auto-completion**: Suggest available translation keys
- **Rename refactoring**: Rename translation keys across files
- **Translation file format support**: Support YAML/JSON translation files
- **Find all references**: Show all usages of a translation key
