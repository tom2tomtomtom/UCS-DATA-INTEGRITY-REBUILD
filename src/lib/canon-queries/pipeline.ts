import type { PipelineFact } from "../canon/types";
import { createCanonQueryResult } from "./index";
import type { CanonQueryInput, CanonQueryResult } from "./types";

export type SelectPipelineFactsInput = Omit<CanonQueryInput<PipelineFact>, "source">;

export function selectPipelineFacts(input: SelectPipelineFactsInput): CanonQueryResult<PipelineFact> {
  return createCanonQueryResult({
    ...input,
    source: "pipeline"
  });
}
