import { minifyContractRouter } from "@orpc/contract";
import fs from "node:fs";
import path from "node:path";
import { router } from "../src/lib/orpc/router";

const outFile = path.resolve(
  import.meta.dirname,
  "../src/lib/orpc/contract.generated.json",
);

fs.writeFileSync(
  outFile,
  `${JSON.stringify(minifyContractRouter(router), null, 2)}\n`,
);
