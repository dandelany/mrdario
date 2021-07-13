"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const scbroker_1 = __importDefault(require("socketcluster/scbroker"));
const scc_broker_client_1 = __importDefault(require("scc-broker-client"));
class Broker extends scbroker_1.default {
    run() {
        console.log("   >> Broker PID:", process.pid);
        // This is defined in server.js (taken from environment variable SC_CLUSTER_STATE_SERVER_HOST).
        // If this property is defined, the broker will try to attach itself to the SC cluster for
        // automatic horizontal scalability.
        // This is mostly intended for the Kubernetes deployment of SocketCluster - In this case,
        // The clustering/sharding all happens automatically.
        if (this.options.clusterStateServerHost) {
            scc_broker_client_1.default.attach(this, {
                stateServerHost: this.options.clusterStateServerHost,
                stateServerPort: this.options.clusterStateServerPort,
                mappingEngine: this.options.clusterMappingEngine,
                clientPoolSize: this.options.clusterClientPoolSize,
                authKey: this.options.clusterAuthKey,
                stateServerConnectTimeout: this.options.clusterStateServerConnectTimeout,
                stateServerAckTimeout: this.options.clusterStateServerAckTimeout,
                stateServerReconnectRandomness: this.options.clusterStateServerReconnectRandomness
            });
        }
    }
}
new Broker();
//# sourceMappingURL=broker.js.map