import type { AppRouter } from "./router";
import generatedContract from "./contract.generated.json";

export const contract = generatedContract as unknown as AppRouter;
