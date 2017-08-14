import * as ts from "typescript";
import { Options } from "./index";

export class DescribeItFileTransformer {
    private readonly context: ts.TransformationContext;
    private readonly program: ts.Program;
    private readonly options: Options;

    constructor(context: ts.TransformationContext, program: ts.Program, options?: Options) {
        this.context = context;
        this.program = program;
        this.options = options || {};
    }

    public visitSourceFile(node: ts.SourceFile): ts.SourceFile {
        return this.visitNode(node);
    }

    private visitNode<T extends ts.Node>(node: T): T {
        ts.visitEachChild(node, child => this.visitNode(child), this.context);

        if (!ts.isCallExpression(node)) return node;
        if (!ts.isIdentifier(node.expression)) return node;
        if (node.expression.text !== "tsst") return node;
        if (node.arguments.length !== 1) return node;

        const arg = node.arguments[0];

        if (ts.isFunctionExpression(arg)) {
            return ts.updateFunctionExpression(
                arg,
                arg.modifiers,
                arg.asteriskToken,
                arg.name,
                arg.typeParameters,
                arg.parameters,
                arg.type,
                this.visitTsst(arg.body)
            ) as ts.Node as T;
        }

        if (ts.isArrowFunction(arg)) {
            return ts.updateArrowFunction(
                arg,
                arg.modifiers,
                arg.typeParameters,
                arg.parameters,
                arg.type,
                this.visitTsst(arg.body)
            ) as ts.Node as T;
        }

        return node;
    }

    private visitTsst(node: ts.ConciseBody): ts.Block {
        const diagnostics = this.program.getSemanticDiagnostics(node.getSourceFile());
        const containedDiagnostics = diagnostics.filter(diagnostic => {
            // I'm not sure when this location info might be undefined, just ignoring for now
            if (diagnostic.start === undefined) return false;
            if (diagnostic.length === undefined) return false;
            if (diagnostic.start < node.getStart()) return false;
            if (diagnostic.start + diagnostic.length! > node.getEnd()) return false;
            return true;
        });

        const returnStatement = ts.createReturn(
            ts.createArrayLiteral(containedDiagnostics.map(diagnostic => {
                const errorExpression = ts.createNew(
                    ts.createIdentifier("Error"),
                    [],
                    [ts.createLiteral(diagnostic.messageText.toString())]
                );

                ts.setSourceMapRange(errorExpression, {
                    pos: diagnostic.start!,
                    end: diagnostic.start! + diagnostic.length!
                });

                return errorExpression;
            }), true)
        );

        return ts.createBlock([returnStatement], true);
    }
}
