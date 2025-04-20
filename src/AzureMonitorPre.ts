// Background: This file was introduced to work around an issue with using the OpenTelemetry API together with the Azure Monitor
// OpenTelemetry package. It may be that this issue only presents itself when using those two in the context of a VS Code Extension where
// the code is running in a "VS Code Extension Host" process rather than a standalone Node.js process.
//
// Without running the code below the symptoms we see are as follows:
// - Code in node_modules\@opentelemetry\api\build\src\internal\global-utils.js is used to work out the version of the OpenTelemetry API
// - That code is invoked during initialization that takes place in AzureMonitor.ts in the initializeTelemetry function
// - For some unknown reason the version of the OpenTelemetry API gets initialized to 1.6.0 instead of 1.9.0
// - The impact of this is that the OpenTelmetry APIs will provide Noop implmentations of tracers, tracer providers etc. This is well-intentioned
//   because the OpenTelemetry API is trying to protect users from compatibility issues between different versions of the API. See
//   node_modules\@opentelemetry\api\README.md for the Version Compatibility section.
// - As a result, our attempts to generate traces and spans destined for Application Insights fail silently
//
// The workaround below works as follows:
// - The code below is run before the Azure Monitor OpenTelemetry package is loaded
// - The code below sets the version of the OpenTelemetry API to 1.9.0 in the global object
// - Logic in the OpenTelemetry API that runs later in node_modules\@opentelemetry\api\build\src\internal\global-utils.js will
//   use similar code but will find that the version is already set to 1.9.0 and will not override it
// - As a result, the OpenTelemetry API will be initialized with the correct version and we will get the correct implementations of tracers etc.
export function ensureOpenTelemetryApiMatches() {
    const DESIRED_OTEL_API_VERSION = "1.9.0";
    const OPEN_TELEMETRY_MAJOR_VERSION = 1;
    // Symbol.for is used to create a unique key for the OpenTelemetry API in the global object. This is the convention used by
    // OpenTelemetry internally so it gives us an opportunity to set the correct version early in the process before the Azure Monitor
    // OpenTelemetry package is loaded and the OpenTelemetry API is initialized.
    const GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for(`opentelemetry.js.api.${OPEN_TELEMETRY_MAJOR_VERSION}`);

    // Type representing the structure of the OpenTelemetry API object that is stored in the global object under the GLOBAL_OPENTELEMETRY_API_KEY.
    type OTelGlobalAPI = {
        version: string;
        diag?: any;
        trace?: any;
        context?: any;
        metrics?: any;
        propagation?: any;
    };

    // Type representing the global object (globalThis) with an optional property keyed by GLOBAL_OPENTELEMETRY_API_KEY.
    type OTelGlobal = {
        [GLOBAL_OPENTELEMETRY_API_KEY]?: OTelGlobalAPI;
    };

    // globalThis is a standard global object in JavaScript environments that provides access to global variables and functions.
    // In Node.js, globalThis is equivalent to the global object. In browsers, it is equivalent to the window object. Here we are
    // using _global to refer to the global object in a type-safe way that allows us to index into it using the Symbol key.
    const _global = globalThis as OTelGlobal;

    // In the OpenTelmetry API internals they use a check to see if the version is already set in the global object. In our case
    // we want to explicitly set the version to the desired version. Because we call it early in the process its reasonable to
    // assume that the version is not set yet.
    _global[GLOBAL_OPENTELEMETRY_API_KEY] = {
        version: DESIRED_OTEL_API_VERSION
    };

    console.log('_global[GLOBAL_OPENTELEMETRY_API_KEY]:', _global[GLOBAL_OPENTELEMETRY_API_KEY]);
}
