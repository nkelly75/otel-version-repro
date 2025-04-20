import { Logger, SeverityNumber } from "@opentelemetry/api-logs";

export class DummyLogger {
    private otelLogger: Logger;

    constructor(otelLogger: Logger) {
        this.otelLogger = otelLogger;
    }

    info(message: string, attributes: Record<string, any> = {}) {
        this.otelLogger.emit({
            severityNumber: SeverityNumber.INFO,
            body: message,
            attributes: attributes
        });
    }

    errorMsg(message: string, attributes: Record<string, any> = {}) {
        this.otelLogger.emit({
            severityNumber: SeverityNumber.ERROR,
            body: `Error: ${message}`,
            attributes: attributes
        });
    }

    errorObject(error: Error, attributes: Record<string, any> = {}) {
        this.otelLogger.emit({
            severityNumber: SeverityNumber.ERROR,
            body: `Error: ${error.name}: ${error.message}`,
            attributes: attributes
        });
    }

    error(e: string | Error | any, attributes: Record<string, any> = {}) {
        if (typeof e === 'string') {
            this.errorMsg(e, attributes);
        } else if (e instanceof Error) {
            this.errorObject(e, attributes);
        } else {
            let msg = 'Unkown error';
            if (e?.message) {
                msg += `: ${e?.message}`;
            }
            this.errorMsg(msg, attributes);
        }
    }
}
