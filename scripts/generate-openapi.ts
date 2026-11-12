// scripts/generate-openapi.ts
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { stringify } from "yaml";
import { app } from "../src/app.js";
import { openApiConfig } from "../src/docs.js";

const doc = app.getOpenAPI31Document(openApiConfig);
writeFileSync("openapi.yaml", stringify(doc));
console.log("openapi.yaml généré");