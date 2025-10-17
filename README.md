# Liquid Language Server

Language Server Protocol (LSP) implementation for Silverfin Liquid templates.

## Features

**Hover Information**
- Tag documentation (assign, capture, result, etc.)
- Translation keys and values (`{% t= %}`)

**Go to Definition**
- Navigate to shared parts and text parts
- Translations and variables

**Context-Aware**
- Identify template structure and relationships (parts and shared parts)
- Creates a map of relationships between main templates, text parts, and shared parts
- Tracks line ranges for accurate navigation
- Parses liquid using Tree-sitter

