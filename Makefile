OPENAI_DIR=gen/openai/

.PHONY: openai
openai:
	rm -rf $(OPENAI_DIR)
	openapi-generator generate -i https://raw.githubusercontent.com/openai/openai-openapi/master/openapi.yaml -g typescript-fetch -o $(OPENAI_DIR) --skip-validate-spec --additional-properties=typescriptThreePlus=true,modelPropertyNaming=original,nullSafeAdditionalProps=true,enumPropertyNaming=original,supportsES6=true,useSingleRequestParameter=false,withoutRuntimeChecks=true

PINECONE_DIR=gen/pinecone/

.PHONY: pinecone
pinecone:
	rm -rf $(PINECONE_DIR)
	openapi-generator generate -i https://raw.githubusercontent.com/sigpwned/pinecone-openapi-spec/main/openapi.yml -g typescript-fetch -o $(PINECONE_DIR) --skip-validate-spec --additional-properties=typescriptThreePlus=true,modelPropertyNaming=original,nullSafeAdditionalProps=true,enumPropertyNaming=original,supportsES6=true,useSingleRequestParameter=false,withoutRuntimeChecks=true
