# Result

The result tag is used to reference values across templates.

## Defining a result

If you want to reference a certain value from reconciliation template A in another template, it can be done with the so-called result tags.

The result name can be freely chosen, but should be unique for that template A. The content is the value or variable you want to reference to.

```liquid
{% result "name" content %}
```

For more information, see [Result](https://developer.silverfin.com/docs/result).
