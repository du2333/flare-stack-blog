import { unlazyRouter } from "@orpc/server";
import fs from "node:fs";
import path from "node:path";
import { router } from "../src/lib/orpc/router";
import { browserContractRouter } from "./browser-contract";

const outFile = path.resolve(
  import.meta.dirname,
  "../src/lib/orpc/contract.generated.json",
);

// The server router loads Admin procedures lazily; the contract lists them all.
fs.writeFileSync(
  outFile,
  `${JSON.stringify(browserContractRouter(await unlazyRouter(router)), null, 2)}\n`,
);
