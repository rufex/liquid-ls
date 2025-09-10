# Capture

With this function you capture the string inside of the opening and closing tags and assigns it to a variable. Variables that you create using capture are stored as strings.

```liquid
{% assign profit = 100 %}
{% capture profit_sentence %}
  Your profit is {{ profit }}.
{% endcapture %}

{{ profit_sentence }}
```

For more information, see [Capture](https://developer.silverfin.com/docs/variables#capture).
