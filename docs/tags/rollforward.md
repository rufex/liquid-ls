# Rollforward

The rollforward tag is used to copy data from one period to another.

Rollforward is used to copy data from a chosen period to a database variable in the current period. This is done by pressing the `copy data` option under the `action button` in the Silverfin platform.

```liquid
{% rollforward custom.depreciation.passed+custom.depreciation.current custom.depreciation.passed %}
{% rollforward nil custom.depreciation.current %}
```

When copying data from 2017 to 2018, the code above will add the depreciations of 2017 with the depreciations of the past and put them in the depreciations of the past field of 2018. Meanwhile, the depreciation value of 2018 is set to nil. This way, the current value of 2017 is not taken over.

For more information, see [Rollforward](https://developer.silverfin.com/docs/rollforward).
