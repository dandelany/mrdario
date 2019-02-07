"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var SCBroker = require("socketcluster/scbroker");
var scClusterBrokerClient = require("scc-broker-client");
var Broker = /** @class */ (function (_super) {
    __extends(Broker, _super);
    function Broker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Broker.prototype.run = function () {
        console.log("   >> Broker PID:", process.pid);
        // This is defined in server.js (taken from environment variable SC_CLUSTER_STATE_SERVER_HOST).
        // If this property is defined, the broker will try to attach itself to the SC cluster for
        // automatic horizontal scalability.
        // This is mostly intended for the Kubernetes deployment of SocketCluster - In this case,
        // The clustering/sharding all happens automatically.
        if (this.options.clusterStateServerHost) {
            scClusterBrokerClient.attach(this, {
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
    };
    return Broker;
}(SCBroker));
new Broker();
