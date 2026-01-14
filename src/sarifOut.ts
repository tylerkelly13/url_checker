import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as URL from './urlFunctions';

/**
 * SARIF v2.1.0 output module for URL checker results.
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 */

/**
 * Get version from package.json.
 *
 * @param packageJsonPath Optional path to package.json. Defaults to './package.json' from current working directory.
 * @returns Version string from package.json or '0.0.0' as fallback.
 */
export const getPackageVersion = (
  packageJsonPath: string = './package.json'
): string => {
  try {
    const resolvedPath = resolve(packageJsonPath);
    const packageJson = JSON.parse(readFileSync(resolvedPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
};

export type SarifLog = {
  version: '2.1.0';
  $schema: string;
  runs: SarifRun[];
};

export type SarifRun = {
  tool: SarifTool;
  results: SarifResult[];
  invocations?: SarifInvocation[];
  artifacts?: SarifArtifact[];
};

export type SarifTool = {
  driver: SarifToolComponent;
};

export type SarifToolComponent = {
  name: string;
  version?: string;
  informationUri?: string;
  rules?: SarifReportingDescriptor[];
};

export type SarifReportingDescriptor = {
  id: string;
  name?: string;
  shortDescription?: SarifMultiformatMessageString;
  fullDescription?: SarifMultiformatMessageString;
  defaultConfiguration?: SarifReportingConfiguration;
  helpUri?: string;
};

export type SarifReportingConfiguration = {
  level?: 'none' | 'note' | 'warning' | 'error';
};

export type SarifMultiformatMessageString = {
  text: string;
  markdown?: string;
};

export type SarifResult = {
  ruleId?: string;
  level?: 'none' | 'note' | 'warning' | 'error';
  message: SarifMessage;
  locations?: SarifLocation[];
  properties?: { [key: string]: any };
};

export type SarifMessage = {
  text: string;
  markdown?: string;
};

export type SarifLocation = {
  physicalLocation?: SarifPhysicalLocation;
  logicalLocations?: SarifLogicalLocation[];
};

export type SarifPhysicalLocation = {
  artifactLocation: SarifArtifactLocation;
  region?: SarifRegion;
};

export type SarifArtifactLocation = {
  uri: string;
  uriBaseId?: string;
};

export type SarifRegion = {
  startLine?: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
  snippet?: SarifArtifactContent;
};

export type SarifArtifactContent = {
  text?: string;
  rendered?: SarifMultiformatMessageString;
};

export type SarifLogicalLocation = {
  fullyQualifiedName?: string;
  kind?: string;
};

export type SarifInvocation = {
  executionSuccessful: boolean;
  endTimeUtc?: string;
  workingDirectory?: SarifArtifactLocation;
};

export type SarifArtifact = {
  location: SarifArtifactLocation;
  length?: number;
  mimeType?: string;
};

/**
 * Map HTTP status code to SARIF severity level.
 *
 * @param status HTTP status code as string.
 * @param anchored Whether the URL contains an anchor.
 * @param anchorExists Whether the anchor exists (if applicable).
 * @returns SARIF level: 'error', 'warning', 'note', or 'none'.
 */
export const mapStatusToLevel = (
  status: string,
  anchored: boolean,
  anchorExists?: boolean
): 'error' | 'warning' | 'note' | 'none' => {
  const statusCode = parseInt(status, 10);

  // Handle anchor-specific cases
  if (anchored && anchorExists === false) {
    return 'error';
  }

  // HTTP status code mapping (valid HTTP status codes are 100-599)
  if (statusCode >= 500 && statusCode < 600) {
    return 'error'; // Server errors
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'error'; // Client errors (404, etc.)
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'warning'; // Redirects
  } else if (statusCode >= 200 && statusCode < 300) {
    return 'none'; // Success
  } else if (statusCode === 0) {
    return 'note'; // Anchor-only (no HTTP request)
  }

  return 'warning'; // Unknown status
};

/**
 * Determine rule ID based on the type of issue.
 *
 * @param status HTTP status code as string.
 * @param anchored Whether the URL contains an anchor.
 * @param anchorExists Whether the anchor exists (if applicable).
 * @returns Rule ID string.
 */
export const determineRuleId = (
  status: string,
  anchored: boolean,
  anchorExists?: boolean
): string => {
  const statusCode = parseInt(status, 10);

  if (anchored && anchorExists === false) {
    return 'URL001'; // Missing anchor
  } else if (statusCode >= 500 && statusCode < 600) {
    return 'URL002'; // Server error
  } else if (statusCode === 404) {
    return 'URL003'; // Not found
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'URL004'; // Client error
  } else if (statusCode >= 300 && statusCode < 400) {
    return 'URL005'; // Redirect
  } else if (statusCode >= 200 && statusCode < 300) {
    return 'URL006'; // Success
  }

  return 'URL007'; // Unknown status
};

/**
 * Get all unique rule IDs used in results.
 *
 * @param results Array of URL check results.
 * @returns Array of unique rule IDs.
 */
export const getUniqueRuleIds = (results: URL.results[]): string[] => {
  const ruleIds = new Set<string>();
  results.forEach((result) => {
    const ruleId = determineRuleId(
      result.status,
      result.anchored,
      result.anchorExists
    );
    ruleIds.add(ruleId);
  });
  return Array.from(ruleIds);
};

/**
 * Create SARIF rule definitions for all rules used in results.
 *
 * @returns Array of SARIF reporting descriptors (rules).
 */
export const createRules = (): SarifReportingDescriptor[] => {
  return [
    {
      id: 'URL001',
      name: 'MissingAnchor',
      shortDescription: {
        text: 'Anchor target not found in page'
      },
      fullDescription: {
        text: 'The URL contains an anchor (fragment identifier) that does not exist in the target page.'
      },
      defaultConfiguration: {
        level: 'error'
      }
    },
    {
      id: 'URL002',
      name: 'ServerError',
      shortDescription: {
        text: 'Server error (5xx)'
      },
      fullDescription: {
        text: 'The URL returned a server error status code (500-599).'
      },
      defaultConfiguration: {
        level: 'error'
      }
    },
    {
      id: 'URL003',
      name: 'NotFound',
      shortDescription: {
        text: 'Resource not found (404)'
      },
      fullDescription: {
        text: 'The URL returned a 404 Not Found status code.'
      },
      defaultConfiguration: {
        level: 'error'
      }
    },
    {
      id: 'URL004',
      name: 'ClientError',
      shortDescription: {
        text: 'Client error (4xx)'
      },
      fullDescription: {
        text: 'The URL returned a client error status code (400-499).'
      },
      defaultConfiguration: {
        level: 'error'
      }
    },
    {
      id: 'URL005',
      name: 'Redirect',
      shortDescription: {
        text: 'URL redirects (3xx)'
      },
      fullDescription: {
        text: 'The URL returned a redirect status code (300-399).'
      },
      defaultConfiguration: {
        level: 'warning'
      }
    },
    {
      id: 'URL006',
      name: 'Success',
      shortDescription: {
        text: 'URL accessible (2xx)'
      },
      fullDescription: {
        text: 'The URL returned a success status code (200-299).'
      },
      defaultConfiguration: {
        level: 'none'
      }
    },
    {
      id: 'URL007',
      name: 'UnknownStatus',
      shortDescription: {
        text: 'Unknown status code'
      },
      fullDescription: {
        text: 'The URL returned an unexpected or unknown status code.'
      },
      defaultConfiguration: {
        level: 'warning'
      }
    }
  ];
};

/**
 * Convert URL checker result to SARIF result.
 *
 * @param result URL check result object.
 * @returns SARIF result object.
 */
export const convertToSarifResult = (result: URL.results): SarifResult => {
  const ruleId = determineRuleId(
    result.status,
    result.anchored,
    result.anchorExists
  );
  const level = mapStatusToLevel(
    result.status,
    result.anchored,
    result.anchorExists
  );

  let messageText = `URL '${result.url}' in element '${result.elem}'`;

  if (result.anchored && result.anchorExists === false) {
    messageText += ` has anchor that does not exist in the target page`;
  } else {
    messageText += ` returned status ${result.status} (${result.statusMsg})`;
  }

  const physicalLocation: SarifPhysicalLocation = {
    artifactLocation: {
      uri: result.parentURL
    }
  };

  // Add region information if line/column are available
  if (result.line !== undefined) {
    physicalLocation.region = {
      startLine: result.line,
      startColumn: result.column
    };
  }

  const sarifResult: SarifResult = {
    ruleId,
    level,
    message: {
      text: messageText
    },
    locations: [
      {
        physicalLocation,
        logicalLocations: [
          {
            fullyQualifiedName: result.url,
            kind: 'url'
          }
        ]
      }
    ],
    properties: {
      parentURL: result.parentURL,
      url: result.url,
      status: result.status,
      statusMsg: result.statusMsg,
      anchored: result.anchored,
      anchorExists: result.anchorExists,
      elem: result.elem,
      line: result.line,
      column: result.column
    }
  };

  return sarifResult;
};

/**
 * Get unique artifacts (parent URLs) from results.
 *
 * @param results Array of URL check results.
 * @returns Array of SARIF artifacts.
 */
export const getArtifacts = (results: URL.results[]): SarifArtifact[] => {
  const uniqueUrls = new Set<string>();
  results.forEach((result) => {
    uniqueUrls.add(result.parentURL);
  });

  return Array.from(uniqueUrls).map((url) => ({
    location: {
      uri: url
    },
    mimeType: 'text/html'
  }));
};

/**
 * Convert URL checker results to SARIF format.
 *
 * @param results Array of URL check results.
 * @param packageJsonPath Optional path to package.json for version info.
 * @returns SARIF log object.
 */
export const convertToSarif = (
  results: URL.results[],
  packageJsonPath?: string
): SarifLog => {
  const sarifResults = results.map(convertToSarifResult);
  const rules = createRules();
  const artifacts = getArtifacts(results);
  const version = getPackageVersion(packageJsonPath);

  const sarifLog: SarifLog = {
    version: '2.1.0',
    $schema:
      'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'url_checker',
            version,
            informationUri: 'https://github.com/tylerkelly13/url_checker',
            rules
          }
        },
        results: sarifResults,
        artifacts,
        invocations: [
          {
            executionSuccessful: true,
            endTimeUtc: new Date().toISOString()
          }
        ]
      }
    ]
  };

  return sarifLog;
};

/**
 * Output results as SARIF file.
 *
 * @param finalResults Promise resolving to array of results.
 * @param outputFileName Path to output SARIF file.
 */
export const linkCheckerSARIF = async (
  finalResults: Promise<URL.results[]>,
  outputFileName: string
): Promise<void> => {
  const results = await finalResults;
  const sarifLog = convertToSarif(results);
  const sarifOutput = JSON.stringify(sarifLog, null, 2);
  writeFileSync(outputFileName, sarifOutput);
};
