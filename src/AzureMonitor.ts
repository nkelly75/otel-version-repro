import { useAzureMonitor, AzureMonitorOpenTelemetryOptions } from "@azure/monitor-opentelemetry";
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { trace, metrics, ProxyTracerProvider } from '@opentelemetry/api';
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { logs } from "@opentelemetry/api-logs";
import { ConsoleLogRecordExporter, LoggerProvider, LogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { IncomingMessage } from "http";
import { RequestOptions } from "https";
import { DummyLogger } from "./DummyLogger";

// These could be imported from @opentelemetry/semantic-conventions/incubating but docs at this
// site https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv
// recommend copying relevant definitions to your own codebase for now.
const ATTR_SERVICE_INSTANCE_ID = "service.instance.id";
const ATTR_SERVICE_NAMESPACE = "service.namespace";

export function initializeTelemetry(appInsightsConnectionStr: string) {
    // If we have an Application Insights connection string, set it in the environment
    if (appInsightsConnectionStr) {
        process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = appInsightsConnectionStr;
    }

    // Filter using HTTP instrumentation configuration
    const httpInstrumentationConfig: HttpInstrumentationConfig = {
        enabled: true,
        ignoreIncomingRequestHook: (request: IncomingMessage) => {
            // Ignore OPTIONS incoming requests
            if (request.method === 'OPTIONS') {
                return true;
            }
            return false;
        },
        ignoreOutgoingRequestHook: (options: RequestOptions) => {
            // Ignore outgoing requests with /test path
            if (options.path === '/test') {
                return true;
            }
            return false;
        }
    };

    // Setting role name and role instance for component in OTEL distributed traces
    const customResource = Resource.default().merge(
        new Resource({
            [ATTR_SERVICE_NAME]: "DummyExtension",
            [ATTR_SERVICE_NAMESPACE]: "OrgPlaceholder",
            [ATTR_SERVICE_INSTANCE_ID]: "instance1"
        })
    );

    const options: AzureMonitorOpenTelemetryOptions = {
        // Sampling could be configured here
        samplingRatio: 1,
        // Use custom Resource
        resource: customResource as any,
        instrumentationOptions: {
            // Custom HTTP Instrumentation Configuration
            http: httpInstrumentationConfig,
            azureSdk: { enabled: true },
            mongoDb: { enabled: false },
            mySql: { enabled: false },
            postgreSql: { enabled: false },
            redis: { enabled: false },
            redis4: { enabled: false },
            bunyan: { enabled: false },
            winston: { enabled: false },
        },
    };

    useAzureMonitor(options);
    addOpenTelemetryInstrumentation();
}


export function initializeOTelLogging(appInsightsConnectionStr: string): DummyLogger {
    let logExporter : LogRecordExporter;
    if (appInsightsConnectionStr) {
         logExporter = new AzureMonitorLogExporter({
            connectionString: appInsightsConnectionStr
        });
    } else {
        logExporter = new ConsoleLogRecordExporter();
    }

    const logRecordProcessor = new SimpleLogRecordProcessor(logExporter);
    const loggerProvider = new LoggerProvider();
    loggerProvider.addLogRecordProcessor(logRecordProcessor);
    logs.setGlobalLoggerProvider(loggerProvider);

    const logger = logs.getLogger('default');
    return new DummyLogger(logger);
}

export function verifyExpectedTracerProvider() {
    const prefix = 'verifyExpectedTracerProvider: ';
    let tracerProvider = trace.getTracerProvider();
    if (tracerProvider instanceof ProxyTracerProvider) {
        // This should return either a NoopTracerProvider or a NodeTracerProvider. We want it to be a NodeTracerProvider.
        // We can't easily check the type of the delegate but we can check that it has the getActiveSpanProcessor method
        // and that that method returns a value.
        const delegate = tracerProvider.getDelegate() as any;
        if (delegate.getActiveSpanProcessor) {
            const activeSpanProcessor = delegate.getActiveSpanProcessor();
            if (activeSpanProcessor) {
                console.log(`${prefix} Got Active span processor`);
                return true;
            } else {
                console.log(`${prefix} No active span processor found`);
            }
        } else {
            // If delegate is a NoopTracerProvider we will output this message
            console.log(`${prefix} Unexpected delegate tracer provider`);
        }
    }
    return false;
}

function addOpenTelemetryInstrumentation() {
    const tracerProvider = (trace.getTracerProvider() as ProxyTracerProvider).getDelegate();
    const meterProvider = metrics.getMeterProvider();
    registerInstrumentations({
        instrumentations: [
            new UndiciInstrumentation()
        ],
        tracerProvider: tracerProvider,
        meterProvider: meterProvider
    });
}