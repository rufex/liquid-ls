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

## Supported Template Types

- **Account Templates (AT)**: `account_templates/`
- **Reconciliation Texts (RT)**: `reconciliation_texts/`
- **Export Files (EF)**: `export_files/`
- **Shared Parts (SP)**: `shared_parts/` _(coming soon)_

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

