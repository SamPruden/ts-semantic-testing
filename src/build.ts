#!/usr/bin/env node

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as minimatch from "minimatch";
import * as commandpost from "commandpost";
import { makeTransformer, makeBlockTransformer } from "./";

function build(glob: string, project?: string, useBlock?: boolean, outDir?: string) {
    const projectPath = project || "./";
    const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists);
    const basePath = path.resolve(path.dirname(configPath)); /*?*/
    const configReadResult = ts.readConfigFile(configPath, ts.sys.readFile);

    if (configReadResult.error) throw new Error("Error reading tsconfig.json");

    const config = ts.parseJsonConfigFileContent(configReadResult.config, ts.sys, basePath);

    if (outDir) config.options.outDir = outDir;

    const program = ts.createProgram(config.fileNames, config.options);
    const transformer = useBlock ? makeBlockTransformer(program) : makeTransformer(program);

    program.getSourceFiles()
        .filter(file => minimatch(file.fileName, glob))
        .forEach(file => {
            console.log(file.fileName);
            return program.emit(file, undefined, undefined, undefined, {
                before: [transformer]
            });
        });
}

const post = commandpost
    .create<CommandPostOptions, { glob: string }>("tsst <glob>")
    .option("-p, --project <path>", "Specify a project directory")
    .option("-d, --directory <path>", "Specify an output directory")
    .option("-b, --block", "Use the experimental block transformer")
    .action((opts, args) => {
        build(args.glob, opts.project[0], opts.block, opts.directory[0]);
    });

commandpost
    .exec(post, process.argv)
    .catch(err => {
        if (err instanceof Error) {
            console.log(err.message);
        } else {
            console.log(err);
        }
        process.exit(1);
    });

interface CommandPostOptions {
    project: string[];
    block: boolean;
    directory: string[];
}
