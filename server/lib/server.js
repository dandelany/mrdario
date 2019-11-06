"use strict";
/*
  This is the SocketCluster master controller file.
  It is responsible for bootstrapping the SocketCluster master process.
  Be careful when modifying the options object below.
  If you plan to run SCC on Kubernetes or another orchestrator at some point
  in the future, avoid changing the environment variable names below as
  each one has a specific meaning within the SC ecosystem.
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const minimist_1 = __importDefault(require("minimist"));
const sc_hot_reboot_1 = __importDefault(require("sc-hot-reboot"));
const argv = minimist_1.default(process.argv.slice(2));
const fsutil_1 = __importDefault(require("socketcluster/fsutil"));
var waitForFile = fsutil_1.default.waitForFile;
const socketcluster_1 = __importDefault(require("socketcluster"));
var workerControllerPath = argv.wc || process.env.SOCKETCLUSTER_WORKER_CONTROLLER;
var brokerControllerPath = argv.bc || process.env.SOCKETCLUSTER_BROKER_CONTROLLER;
var workerClusterControllerPath = argv.wcc || process.env.SOCKETCLUSTER_WORKERCLUSTER_CONTROLLER;
var environment = process.env.ENV || "dev";
var options = {
    workers: Number(argv.w) || Number(process.env.SOCKETCLUSTER_WORKERS) || 1,
    brokers: Number(argv.b) || Number(process.env.SOCKETCLUSTER_BROKERS) || 1,
    port: Number(argv.p) || Number(process.env.SOCKETCLUSTER_PORT) || 8000,
    // You can switch to 'sc-uws' for improved performance.
    wsEngine: process.env.SOCKETCLUSTER_WS_ENGINE || "ws",
    appName: argv.n || process.env.SOCKETCLUSTER_APP_NAME || null,
    workerController: workerControllerPath || path_1.default.join(__dirname, "worker.ts"),
    brokerController: brokerControllerPath || path_1.default.join(__dirname, "broker.ts"),
    workerClusterController: workerClusterControllerPath || null,
    socketChannelLimit: Number(process.env.SOCKETCLUSTER_SOCKET_CHANNEL_LIMIT) || 1000,
    clusterStateServerHost: argv.cssh || process.env.SCC_STATE_SERVER_HOST || null,
    clusterStateServerPort: process.env.SCC_STATE_SERVER_PORT || null,
    clusterMappingEngine: process.env.SCC_MAPPING_ENGINE || null,
    clusterClientPoolSize: process.env.SCC_CLIENT_POOL_SIZE || null,
    clusterAuthKey: process.env.SCC_AUTH_KEY || null,
    clusterInstanceIp: process.env.SCC_INSTANCE_IP || null,
    clusterInstanceIpFamily: process.env.SCC_INSTANCE_IP_FAMILY || null,
    clusterStateServerConnectTimeout: Number(process.env.SCC_STATE_SERVER_CONNECT_TIMEOUT) || null,
    clusterStateServerAckTimeout: Number(process.env.SCC_STATE_SERVER_ACK_TIMEOUT) || null,
    clusterStateServerReconnectRandomness: Number(process.env.SCC_STATE_SERVER_RECONNECT_RANDOMNESS) || null,
    crashWorkerOnError: argv["auto-reboot"] != false,
    // If using nodemon, set this to true, and make sure that environment is 'dev'.
    // killMasterOnSignal: false,
    killMasterOnSignal: environment === "dev",
    environment: environment
};
var bootTimeout = Number(process.env.SOCKETCLUSTER_CONTROLLER_BOOT_TIMEOUT) || 10000;
let SOCKETCLUSTER_OPTIONS;
if (process.env.SOCKETCLUSTER_OPTIONS) {
    SOCKETCLUSTER_OPTIONS = JSON.parse(process.env.SOCKETCLUSTER_OPTIONS);
}
for (var i in SOCKETCLUSTER_OPTIONS) {
    if (SOCKETCLUSTER_OPTIONS.hasOwnProperty(i)) {
        options[i] = SOCKETCLUSTER_OPTIONS[i];
    }
}
const start = function start() {
    var socketCluster = new socketcluster_1.default(options);
    socketCluster.on(socketCluster.EVENT_WORKER_CLUSTER_START, function (workerClusterInfo) {
        console.log("   >> WorkerCluster PID:", workerClusterInfo.pid);
    });
    if (socketCluster.options.environment === "dev") {
        // This will cause SC workers to reboot when code changes anywhere in the app directory.
        // The second options argument here is passed directly to chokidar.
        // See https://github.com/paulmillr/chokidar#api for details.
        console.log(`   !! The sc-hot-reboot plugin is watching for code changes in the ${__dirname} directory`);
        sc_hot_reboot_1.default.attach(socketCluster, {
            cwd: __dirname,
            ignored: [
                "public",
                "node_modules",
                "README.md",
                "Dockerfile",
                "server.ts",
                "broker.ts",
                /[\/\\]\./,
                "*.log"
            ]
        });
    }
};
var bootCheckInterval = Number(process.env.SOCKETCLUSTER_BOOT_CHECK_INTERVAL) || 200;
var bootStartTime = Date.now();
// Detect when Docker volumes are ready.
var startWhenFileIsReady = (filePath) => {
    var errorMessage = `Failed to locate a controller file at path ${filePath} ` +
        `before SOCKETCLUSTER_CONTROLLER_BOOT_TIMEOUT`;
    return waitForFile(filePath, bootCheckInterval, bootStartTime, bootTimeout, errorMessage);
};
var filesReadyPromises = [
    startWhenFileIsReady(workerControllerPath),
    startWhenFileIsReady(brokerControllerPath),
    startWhenFileIsReady(workerClusterControllerPath)
];
Promise.all(filesReadyPromises)
    .then(() => {
    start();
})
    .catch(err => {
    console.error(err.stack);
    process.exit(1);
});
//# sourceMappingURL=server.js.map