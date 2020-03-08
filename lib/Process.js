const child_process = require("child_process");
const ProcessError = require("./ProcessError");

module.exports = class Process {
    /**
     * @param {Command} command
     * @param {string} word
     */
    constructor(command, word) {
        this._command = command;
        this._word = word;
        this._process = null;
    }

    kill() {
        if (!this._process) return;
        this._process.kill();
        this._process = null;
    }

    /**
     * @returns {Promise<string>}
     */
    run() {
        return new Promise((resolve, reject) => {
            // Run command
            const program = this._command.getProgram();
            const args = this._command.getArgs(this._word);
            this._process = child_process.spawn(program, args).on('error', () => {
                reject(new ProcessError(
                    `Failed to launch '${program}'. Make sure it is installed and in your path.`,
                    ProcessError.errorTypes.spawnProcessFailed
                ));
            });

            // Capture output
            let content = "";
            this._process.stdout.on('data', (buffer) =>
                content += buffer.toString()
            );
            this._process.stderr.on('data', (buffer) =>
                content += buffer.toString()
            );

            // Check exit code
            this._process.on('close', (exitCode) => {
                if (exitCode === 0) {
                    resolve(content);
                } else {
                    reject(new ProcessError(
                        `Process '${program} ${args.join(" ")}' failed with exit code ${exitCode}`,
                        ProcessError.errorTypes.exitCodeNonZero
                    ));
                }
            });
        });
    }
};
