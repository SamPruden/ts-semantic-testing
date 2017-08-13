import * as ts from "typescript";
import {DescribeItFileTransformer} from "./DescribeItFileTransformer"; 

export function makeTransformer(program: ts.Program, options?: Options) {
    const factory: ts.TransformerFactory<ts.SourceFile> = context => {
        const diagnosticTransformer = new DescribeItFileTransformer(context, program, options);

        return sourceFile => {
            return  diagnosticTransformer.visitSourceFile(sourceFile);
        };
    };

    return factory;
}

export interface Options {
    fileFilter?: (fileName: string) => boolean;
}