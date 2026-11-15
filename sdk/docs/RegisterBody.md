
# RegisterBody


## Properties

Name | Type
------------ | -------------
`name` | string
`email` | string
`password` | string

## Example

```typescript
import type { RegisterBody } from ''

// TODO: Update the object below with actual values
const example = {
  "name": Jean Dupont,
  "email": jean@exemple.fr,
  "password": motdepasse123,
} satisfies RegisterBody

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RegisterBody
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


