'use strict';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { envDetector } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { IncomingMessage } from 'http';
import { KafkaJsInstrumentation } from 'opentelemetry-instrumentation-kafkajs';


const httpInstrumentConfig = {
    ignoreIncomingRequestHook: (req: IncomingMessage) => req.url == '/health',
};

const exporterOptions = {
    url: "exporter",
};

const traceExporter = new OTLPTraceExporter(exporterOptions);
const metricExporter = new OTLPMetricExporter({
    url: '<your-otlp-endpoint>/v1/metrics', // url is optional and can be omitted - default is http://localhost:4318/v1/metrics
    headers: {}, // an optional object containing custom headers to be sent with each request
});

const sdk = new NodeSDK({
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
    }),
    instrumentations: [
        getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-http': httpInstrumentConfig }),
        new KafkaJsInstrumentation(),
    ],
    resourceDetectors: [envDetector],
});

export const start = () => sdk.start();

['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
        sdk
            .shutdown()
            .then(() => console.info('Tracing terminated'))
            .catch((error) => console.error('Error terminating tracing', error))
            .finally(() => process.exit(0));
    });
});