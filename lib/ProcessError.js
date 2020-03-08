class ProcessError extends Error {
    /**
     * @param {string} message
     * @param {string} errorCode
     */
    constructor(message, errorCode) {
        super(message);
        this.errorCode = errorCode;
    }
};

ProcessError.errorTypes = {
    spawnProcessFailed: "spawnProcessFailed",
    exitCodeNonZero: "exitCodeNonZero",
};

module.exports = ProcessError;
