import * as ts from "typescript";
import {DescribeItFileTransformer} from "./DescribeItFileTransformer";
import { BlockTransformer } from "./BlockTransformer";

export function makeTransformer(program: ts.Program, options?: Options) {
    const factory: ts.TransformerFactory<ts.SourceFile> = context => {
        const diagnosticTransformer = new DescribeItFileTransformer(context, program, options);

        return sourceFile => {
            return  diagnosticTransformer.visitSourceFile(sourceFile);
        };
    };

    return factory;
}

export function makeBlockTransformer(program: ts.Program, options?: Options) {
    const factory: ts.TransformerFactory<ts.SourceFile> = context => {
        const transformer = new BlockTransformer(context, program);

        return sourceFile => {
            return  transformer.visitSourceFile(sourceFile);
        };
    };

    return factory;
}

export interface Options {
    fileFilter?: (fileName: string) => boolean;
}

export function tsst(scope: () => void | ReadonlyArray<Error>): TsstResult {
    const output = scope();

    return {
        errors: output || [],
        expectToCompile() {
            if (this.errors.length) throw this.errors[0].message;
        },
        expectToFail() {
            if (!this.errors.length) {
                `No semantic failures`;
            }
        },
        expectToFailWith(msg: string | RegExp) {
            if (!this.errors.length) {
                `No matching semantic failures, expected "${msg}"!`;
            } else if (this.errors.filter(e => RegExp(msg).test(e.message)).length === 0) {
                `Expected failure "${msg}", got failure "${this.errors[0]}"!`;
            }
        }
    };
}

export interface TsstResult {
    readonly errors: ReadonlyArray<Error>;
    // These are just placeholders, full set of proper expectations coming
    expectToCompile(): void;
    expectToFail(): void;
    expectToFailWith(msg: string | RegExp): void;
}

export function the<T, V extends T>() {}
