# Locale

The locale tag forces the content of a template in a certain language.

When printed with print tags, the locale tag returns the chosen language of the current user.

Liquid:

```liquid
user locale: {{ locale }}
```

Output:

```html
user locale: en
```

When using locale with logic tags, you can force the content to follow this language and ignore the chosen user language.

Liquid:

```liquid
{% t="Hello" nl:"Hallo" fr:"Bonjour" %}

{% locale "nl" %}
  {% t "Hello" %}
{% endlocale %}
```

Output:

```html
Hallo
```

For more information, see [Locale](https://developer.silverfin.com/docs/locale).
