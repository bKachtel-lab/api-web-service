# QuestionsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**poserQuestion**](QuestionsApi.md#poserquestion) | **POST** /annonces/{id}/questions | Poser une question sur une annonce |
| [**repondreQuestion**](QuestionsApi.md#repondrequestion) | **POST** /questions/{id}/reponse | Répondre à une question (Agent propriétaire) |



## poserQuestion

> Question poserQuestion(id, createQuestionInput)

Poser une question sur une annonce

### Example

```ts
import {
  Configuration,
  QuestionsApi,
} from '';
import type { PoserQuestionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new QuestionsApi(config);

  const body = {
    // string
    id: id_example,
    // CreateQuestionInput (optional)
    createQuestionInput: ...,
  } satisfies PoserQuestionRequest;

  try {
    const data = await api.poserQuestion(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **createQuestionInput** | [CreateQuestionInput](CreateQuestionInput.md) |  | [Optional] |

### Return type

[**Question**](Question.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Question enregistrée |  -  |
| **400** | Données invalides |  -  |
| **401** | Non authentifié |  -  |
| **404** | Annonce introuvable |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## repondreQuestion

> Question repondreQuestion(id, createReponseInput)

Répondre à une question (Agent propriétaire)

### Example

```ts
import {
  Configuration,
  QuestionsApi,
} from '';
import type { RepondreQuestionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new QuestionsApi(config);

  const body = {
    // string
    id: id_example,
    // CreateReponseInput (optional)
    createReponseInput: ...,
  } satisfies RepondreQuestionRequest;

  try {
    const data = await api.repondreQuestion(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **createReponseInput** | [CreateReponseInput](CreateReponseInput.md) |  | [Optional] |

### Return type

[**Question**](Question.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Réponse enregistrée |  -  |
| **400** | Données invalides |  -  |
| **401** | Non authentifié |  -  |
| **403** | Vous n\&#39;êtes pas l\&#39;agent propriétaire de cette annonce |  -  |
| **404** | Question introuvable |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

