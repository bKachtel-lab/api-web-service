
# UpdateAnnonceInput


## Properties

Name | Type
------------ | -------------
`titre` | string
`description` | string
`ville` | string
`type` | string
`prix` | number
`dateDisponibilite` | string
`photos` | [Array&lt;CreateAnnonceInputPhotosInner&gt;](CreateAnnonceInputPhotosInner.md)
`statusPublication` | string
`statusBien` | string

## Example

```typescript
import type { UpdateAnnonceInput } from ''

// TODO: Update the object below with actual values
const example = {
  "titre": Appartement T3 lumineux,
  "description": Très bel appartement proche centre-ville,
  "ville": Le Havre,
  "type": VENTE,
  "prix": 185000,
  "dateDisponibilite": 2026-10-01T00:00:00.000+00:00,
  "photos": null,
  "statusPublication": null,
  "statusBien": null,
} satisfies UpdateAnnonceInput

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateAnnonceInput
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


