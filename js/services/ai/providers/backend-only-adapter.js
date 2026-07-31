/**
 * Shared stub for providers that must never receive a credential from the
 * browser (AWS Bedrock, Google Vertex AI): the front-end has no request-
 * building logic for them at all. Their only "capability" from the client's
 * point of view is asking the serverless relay whether it has been
 * configured with the right backend credentials (IAM role / service
 * account) -- see ai-gateway-service.js's checkBackendOnlyStatus(). Actually
 * generating a response for these providers happens entirely server-side.
 */
export const backendOnlyAdapter = {
  supportsListModels: false,
  requiresBackendCredentials: true,
};
