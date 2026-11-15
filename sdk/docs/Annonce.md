
# Annonce


## Properties

Name | Type
------------ | -------------
`id` | string
`titre` | string
`description` | string
`ville` | string
`type` | string
`statusPublication` | string
`statusBien` | string
`prix` | number
`dateDisponibilite` | string
`createdAt` | string
`updatedAt` | string
`agentId` | string
`photos` | [Array&lt;AnnoncePhotosInner&gt;](AnnoncePhotosInner.md)
`agent` | [AnnonceAgent](AnnonceAgent.md)
`questions` | [Array&lt;Question&gt;](Question.md)

## Example

```typescript
import type { Annonce } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "titre": null,
  "description": null,
  "ville": null,
  "type": null,
  "statusPublication": null,
  "statusBien": null,
  "prix": null,
  "dateDisponibilite": null,
  "createdAt": null,
  "updatedAt": null,
  "agentId": null,
  "photos": null,
  "agent": null,
  "questions": null,
} satisfies Annonce

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Annonce
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


