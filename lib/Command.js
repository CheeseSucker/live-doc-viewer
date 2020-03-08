const stringArgv = require("string-argv").default;

class Command {
    /**
     * @param {string} grammar
     * @param {string} program
     * @param {string} args
     */
    constructor(grammar, program, args) {
        this._grammar = grammar;
        this._program = program;
        this._arguments = args;
    }

    isValid() {
        return [
            typeof this._grammar === "string",
            typeof this._program === "string",
            typeof this._arguments === "string"
        ].every(x => x === true);
    }

    getGrammar() {
        return this._grammar;
    }

    supportsGrammar(grammar) {
        if (!grammar) return false;
        return this._grammar.toLowerCase() === grammar.toLowerCase();
    }

    getProgram() {
        return this._program;
    }

    getArgs(word) {
        return stringArgv(this._arguments)
            .map(x => x.replace("{WORD}", word));
    }

    toString() {
        return `${this.isValid() ? "" : "INVALID "}${this.getGrammar()}: ${this._program} ${this.getArgs("{WORD}").join(" ")}`;
    }
};

/**
 * @returns {Array<Command>}
 */
Command.loadCommandsFromConfig = () => {
    const MAX_COMMANDS = 10;

    const commands = [];
    for (let num = 0; num < MAX_COMMANDS; num++) {
        const command = atom.config.get(`live-doc-viewer.command${num}`);
        if (!command) continue;
        if (!command.grammar && !command.program && !command.program_arguments) continue;

        commands.push(new Command(
            command.grammar,
            command.program,
            command.program_arguments,
        ));
    }
    return commands;
};

/**
 * Get command to run based on selected word and grammar.
 * Will default to "man"
 *
 * @return {Command}
 */
Command.getCommandForGrammar = (grammar, commands) => {
    const fallbackCommand = new Command("Any", "man", "--pager=cat --sections=3,2,1,8 {WORD}");
    const validCommands = commands.filter(x => x.isValid());

    // Select command from configuration
    return (
        validCommands.find(x => x.supportsGrammar(grammar))
        || validCommands.find(x => x.supportsGrammar("Any"))
        || fallbackCommand
    );
};

module.exports = Command;
