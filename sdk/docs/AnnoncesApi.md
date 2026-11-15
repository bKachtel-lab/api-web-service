# AnnoncesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**creerAnnonce**](AnnoncesApi.md#creerannonce) | **POST** /annonces | Créer une annonce (Agent / Admin) |
| [**listerAnnonces**](AnnoncesApi.md#listerannonces) | **GET** /annonces | Lister les annonces |
| [**modifierAnnonce**](AnnoncesApi.md#modifierannonce) | **PATCH** /annonces/{id} | Modifier une annonce |
| [**obtenirAnnonce**](AnnoncesApi.md#obtenirannonce) | **GET** /annonces/{id} | Détail d\&#39;une annonce |
| [**supprimerAnnonce**](AnnoncesApi.md#supprimerannonce) | **DELETE** /annonces/{id} | Supprimer une annonce |



## creerAnnonce

> Annonce creerAnnonce(createAnnonceInput)

Créer une annonce (Agent / Admin)

### Example

```ts
import {
  Configuration,
  AnnoncesApi,
} from '';
import type { CreerAnnonceRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnnoncesApi(config);

  const body = {
    // CreateAnnonceInput (optional)
    createAnnonceInput: ...,
  } satisfies CreerAnnonceRequest;

  try {
    const data = await api.creerAnnonce(body);
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
| **createAnnonceInput** | [CreateAnnonceInput](CreateAnnonceInput.md) |  | [Optional] |

### Return type

[**Annonce**](Annonce.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Annonce créée |  -  |
| **400** | Données invalides |  -  |
| **401** | Non authentifié |  -  |
| **403** | Réservé aux agents et admins |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listerAnnonces

> AnnoncePage listerAnnonces(page, limit, ville, type, prixMax)

Lister les annonces

Récupère les annonces publiées avec pagination et filtres. Les brouillons ne sont visibles que par leur auteur ou un admin.

### Example

```ts
import {
  Configuration,
  AnnoncesApi,
} from '';
import type { ListerAnnoncesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnnoncesApi(config);

  const body = {
    // number (optional)
    page: 1,
    // number (optional)
    limit: 10,
    // string (optional)
    ville: Le Havre,
    // 'VENTE' | 'LOCATION' (optional)
    type: VENTE,
    // number (optional)
    prixMax: 300000,
  } satisfies ListerAnnoncesRequest;

  try {
    const data = await api.listerAnnonces(body);
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
| **page** | `number` |  | [Optional] [Defaults to `1`] |
| **limit** | `number` |  | [Optional] [Defaults to `10`] |
| **ville** | `string` |  | [Optional] [Defaults to `undefined`] |
| **type** | `VENTE`, `LOCATION` |  | [Optional] [Defaults to `undefined`] [Enum: VENTE, LOCATION] |
| **prixMax** | `number` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AnnoncePage**](AnnoncePage.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Liste paginée des annonces |  -  |
| **400** | Paramètres de requête invalides |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## modifierAnnonce

> Annonce modifierAnnonce(id, updateAnnonceInput)

Modifier une annonce

### Example

```ts
import {
  Configuration,
  AnnoncesApi,
} from '';
import type { ModifierAnnonceRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnnoncesApi(config);

  const body = {
    // string
    id: clx123456789,
    // UpdateAnnonceInput (optional)
    updateAnnonceInput: ...,
  } satisfies ModifierAnnonceRequest;

  try {
    const data = await api.modifierAnnonce(body);
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
| **updateAnnonceInput** | [UpdateAnnonceInput](UpdateAnnonceInput.md) |  | [Optional] |

### Return type

[**Annonce**](Annonce.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Annonce modifiée |  -  |
| **400** | Données invalides |  -  |
| **401** | Non authentifié |  -  |
| **403** | Accès interdit (Anti-IDOR) |  -  |
| **404** | Annonce introuvable |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## obtenirAnnonce

> Annonce obtenirAnnonce(id)

Détail d\&#39;une annonce

### Example

```ts
import {
  Configuration,
  AnnoncesApi,
} from '';
import type { ObtenirAnnonceRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnnoncesApi(config);

  const body = {
    // string
    id: clx123456789,
  } satisfies ObtenirAnnonceRequest;

  try {
    const data = await api.obtenirAnnonce(body);
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

### Return type

[**Annonce**](Annonce.md)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Détail de l\&#39;annonce |  -  |
| **404** | Annonce introuvable ou brouillon non accessible |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## supprimerAnnonce

> supprimerAnnonce(id)

Supprimer une annonce

### Example

```ts
import {
  Configuration,
  AnnoncesApi,
} from '';
import type { SupprimerAnnonceRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: bearerAuth
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AnnoncesApi(config);

  const body = {
    // string
    id: clx123456789,
  } satisfies SupprimerAnnonceRequest;

  try {
    const data = await api.supprimerAnnonce(body);
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

### Return type

`void` (Empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Annonce supprimée |  -  |
| **401** | Non authentifié |  -  |
| **403** | Accès interdit (Anti-IDOR) |  -  |
| **404** | Annonce introuvable |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

