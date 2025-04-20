// OpenTelemetry setup needs to happen before instrumented libraries are loaded. Furthermore AzureMonitorPre.js needs to be loaded
// before AzureMonitor.js. The call to ensureOpenTelemetryApiMatches() is a crucial step to ensure our tracing data flows to Application
// Insights as expected.
import { ensureOpenTelemetryApiMatches } from "./AzureMonitorPre";

// Comment out this line to reproduce the OTel Version mismatch error
// ensureOpenTelemetryApiMatches();

// This is the connection string for your Application Insights instance
const APPINS_TEST = '<connection-string-placeholder>';

import { initializeOTelLogging, initializeTelemetry, verifyExpectedTracerProvider } from "./AzureMonitor";
initializeTelemetry(APPINS_TEST);

// Now we can load the rest of the extension
import {
    commands,
    window,
    ExtensionContext,
} from 'vscode';

let extensionVersion = 'unknown';

export function activate(context: ExtensionContext) {
    if (context.extension.packageJSON && context.extension.packageJSON.version) {
        extensionVersion = context.extension.packageJSON.version;
    }

    let expectedTracerProvider = verifyExpectedTracerProvider();
    if (!expectedTracerProvider) {
        window.showWarningMessage('Tracing did not initialize as expected. Telemetry may be missing.');
    }

    // This is the logger we should use to get general-purpose traces in the configured App Insights instance
    let redAIOtelLogger = initializeOTelLogging(APPINS_TEST);
    redAIOtelLogger.info(`Extension activating`);

    // Register additional commands
    context.subscriptions.push(commands.registerCommand(`otel-version-repro.fetch-example`, fetchExampleOrg));
}

export function deactivate() {
}

async function fetchExampleOrg() {
    const startTime = Date.now();
    try {
        const response = await fetch('https://example.org/');
        const responseBody = await response.text();
        const responseTime = Date.now() - startTime;
        const responseSize = Buffer.byteLength(responseBody, 'utf-8');
        window.showInformationMessage(`Fetched ${responseSize} bytes in ${responseTime}ms from https://example.org/`);
    } catch (error) {
        window.showErrorMessage('Failed to fetch https://example.org/');
    }
}