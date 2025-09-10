# Unreconciled

The unreconciled tag is used to indicate when a template is (un)reconciled.

Unreconciled tags are used to indicate whether or not a template (account or reconciliation template) is reconciled; this is used quite often and has a direct impact on the progress of the workflow.

When all unreconciled tags have zero as an outcome (not to be mistaken for empty), the template will be fully reconciled and a green dot will be visible at the template level.

```liquid
{% assign income_accounts_total = period.accounts | range:"70" %}
{% unreconciled -income_accounts_total-table_total %}
```

For more information, see [Unreconciled](https://developer.silverfin.com/docs/unreconciled).
