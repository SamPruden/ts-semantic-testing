#!/usr/bin/env node

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import * as minimatch from "minimatch";
import * as commandpost from "commandpost";
import {makeTransformer} from "./";

function build(glob: string, project?: string) {
    const projectPath = project || "./";
    const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists);
    const basePath = path.resolve(path.dirname(configPath)); /*?*/
    const configReadResult = ts.readConfigFile(configPath, ts.sys.readFile);

    if (configReadResult.error) throw new Error("Error reading tsconfig.json");

    const config = ts.parseJsonConfigFileContent(configReadResult.config, ts.sys, basePath);
    const program = ts.createProgram(config.fileNames, config.options);
    const transformer = makeTransformer(program);

    program.getSourceFiles()
        .filter(file => minimatch(file.fileName, glob))
        .forEach(file => program.emit(file, undefined, undefined, undefined, {
            before: [transformer]
        }));
}

const post = commandpost
    .create<{project: string}, {glob: string}>("tsst <glob>")
    .option("-p, --project <path>", "Specify a project directory")
    .action((opts, args) => {
        build(args.glob, opts.project[0]);
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
