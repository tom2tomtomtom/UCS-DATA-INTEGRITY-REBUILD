import type { SourceName, SourceTraceRef } from "../canon/types";
import type {
  SkippedSourceRow,
  SourceArchiveMode,
  SourceArchivePayload,
  SourcePullMetadata,
  SourceRowIdentity
} from "./types";

export type SourcePullProvider = "google_sheets" | "float" | "legacy_db_import" | "fixture";

export type SourcePullRequestTarget = SourcePullMetadata["request"];

export type RawSourceCandidateRow = {
  readonly kind: "raw_source_candidate_row";
  readonly source: SourceName;
  readonly identity: SourceRowIdentity;
  readonly raw: SourceArchivePayload;
  readonly observedAt: string;
  readonly sourceRefs: readonly SourceTraceRef[];
};

export type SourcePullResult = {
  readonly metadata: SourcePullMetadata;
  readonly rawCandidateRows: readonly RawSourceCandidateRow[];
  readonly skippedRows: readonly SkippedSourceRow[];
  readonly warnings: readonly string[];
};

export type SourcePullDescriptor = {
  readonly id: string;
  readonly provider: SourcePullProvider;
  readonly source: SourceName;
  readonly mode: SourceArchiveMode;
  readonly readOnly: true;
  readonly request: SourcePullRequestTarget;
};

export type SourcePullReadRequest = {
  readonly source: SourceName;
  readonly request?: SourcePullRequestTarget;
};

export type SourcePullListRequest = {
  readonly provider?: SourcePullProvider;
  readonly source?: SourceName;
};

export type SourcePullFetchRequest = {
  readonly id: string;
};

export type SourcePullAdapter = {
  readonly read: (request: SourcePullReadRequest) => Promise<SourcePullResult>;
  readonly list: (request?: SourcePullListRequest) => Promise<readonly SourcePullDescriptor[]>;
  readonly fetch: (request: SourcePullFetchRequest) => Promise<SourcePullResult>;
};

export type FixturePullResultInput = {
  readonly source: SourceName;
  readonly requestedAt: string;
  readonly completedAt?: string;
  readonly request: SourcePullRequestTarget;
  readonly rawCandidateRows?: readonly RawSourceCandidateRow[];
  readonly skippedRows?: readonly SkippedSourceRow[];
  readonly warnings?: readonly string[];
};

export type FixtureSourcePullDefinition = FixturePullResultInput & {
  readonly id: string;
};

const REQUEST_KEYS = [
  "sourceDocumentId",
  "sourceTab",
  "sourceObjectId",
  "description"
] as const satisfies readonly (keyof SourcePullRequestTarget)[];

export function createFixturePullResult(input: FixturePullResultInput): SourcePullResult {
  const warnings = input.warnings ?? [];
  const metadata: SourcePullMetadata = {
    source: input.source,
    mode: "fixture",
    requestedAt: input.requestedAt,
    ...(input.completedAt === undefined ? {} : { completedAt: input.completedAt }),
    readOnly: true,
    request: input.request,
    warnings
  };

  return {
    metadata,
    rawCandidateRows: input.rawCandidateRows ?? [],
    skippedRows: input.skippedRows ?? [],
    warnings
  };
}

export function createFixtureSourcePullAdapter(
  definitions: readonly FixtureSourcePullDefinition[]
): SourcePullAdapter {
  const fixtures = [...definitions];

  return Object.freeze({
    async read(request: SourcePullReadRequest): Promise<SourcePullResult> {
      const fixture = fixtures.find(
        (candidate) =>
          candidate.source === request.source &&
          requestTargetMatches(candidate.request, request.request)
      );

      if (fixture === undefined) {
        throw new Error(`No fixture source pull found for source ${request.source}.`);
      }

      return createFixturePullResult(fixture);
    },

    async list(request?: SourcePullListRequest): Promise<readonly SourcePullDescriptor[]> {
      return fixtures
        .map(toFixtureDescriptor)
        .filter(
          (descriptor) =>
            (request?.provider === undefined || descriptor.provider === request.provider) &&
            (request?.source === undefined || descriptor.source === request.source)
        );
    },

    async fetch(request: SourcePullFetchRequest): Promise<SourcePullResult> {
      const fixture = fixtures.find((candidate) => candidate.id === request.id);

      if (fixture === undefined) {
        throw new Error(`No fixture source pull found for id ${request.id}.`);
      }

      return createFixturePullResult(fixture);
    }
  });
}

function toFixtureDescriptor(definition: FixtureSourcePullDefinition): SourcePullDescriptor {
  return {
    id: definition.id,
    provider: "fixture",
    source: definition.source,
    mode: "fixture",
    readOnly: true,
    request: definition.request
  };
}

function requestTargetMatches(
  candidate: SourcePullRequestTarget,
  requested: SourcePullRequestTarget | undefined
): boolean {
  if (requested === undefined) {
    return true;
  }

  return REQUEST_KEYS.every((key) => {
    const requestedValue = requested[key];

    return requestedValue === undefined || candidate[key] === requestedValue;
  });
}
