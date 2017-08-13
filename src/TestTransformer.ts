import * as ts from "typescript";
import { Options } from "./index";

/**
 * Transforms test bodies, independent of testing framework / file structure
 */
export class TestTransformer {
    private readonly program: ts.Program;
    private readonly context: ts.TransformationContext;

    constructor(context: ts.TransformationContext, program: ts.Program, options?: Options) {
        this.program = program;
        this.context = context;
    }

    public visitTestBody(node: ts.ConciseBody): ts.Block {
        const diagnostics = this.program.getSemanticDiagnostics(node.getSourceFile());
        const containedDiagnostics = diagnostics.filter(diagnostic => {
            // I'm not sure when this location info might be undefined, just ignoring for now
            if (diagnostic.start === undefined) return false;
            if (diagnostic.length === undefined) return false;
            if (diagnostic.start < node.getStart()) return false;
            if (diagnostic.start + diagnostic.length! > node.getEnd()) return false;
            return true;
        });
    
        const throwStatements = containedDiagnostics.map(diagnostic => {
            const throwStatement = ts.createThrow(
                ts.createNew(
                    ts.createIdentifier("Error"),
                    [],
                    [ts.createLiteral(diagnostic.messageText.toString())]
                )
            );
    
            ts.setSourceMapRange(throwStatement, {
                pos: diagnostic.start!,
                end: diagnostic.start! + diagnostic.length!
            });
    
            return throwStatement;
        });
    
        return ts.createBlock(throwStatements, true);
    }
}