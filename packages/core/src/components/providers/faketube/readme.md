# vime-faketube

Fake media provider that is used for testing.

## Example

```html {2}
<vime-player>
  <vime-faketube></vime-faketube>
  <!-- ... -->
</vime-player>
```

<!-- Auto Generated Below -->

## Methods

### `dispatchLoadStart() => Promise<void>`

Dispatches the `vLoadStart` event.

#### Returns

Type: `Promise<void>`

### `dispatchStateChange(prop: PlayerProp, value: any) => Promise<void>`

Dispatches a state change event.

#### Returns

Type: `Promise<void>`

### `getAdapter() => Promise<MockMediaProviderAdapter>`

Returns a mock adapter.

#### Returns

Type: `Promise<MockMediaProviderAdapter>`

---

_Built with [StencilJS](https://stenciljs.com/)_