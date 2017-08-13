import * as ts from "typescript";
import { Options } from "./index";
import { TestTransformer } from "./TestTransformer";

/**
 * Transforms test files in the describe/it format, delegating test transformation to TestTransformer
 */
export class DescribeItFileTransformer {
    private readonly context: ts.TransformationContext;
    private readonly program: ts.Program;
    private readonly options: Options;
    private readonly testTransformer: TestTransformer;

    constructor(context: ts.TransformationContext, program: ts.Program, options?: Options) {
        this.context = context;
        this.program = program;
        this.options = options || {};
        this.testTransformer = new TestTransformer(context, program);
    }

    public visitSourceFile(node: ts.SourceFile): ts.SourceFile {
        // Skip filtered files
        if (this.options.fileFilter && !this.options.fileFilter(node.fileName)) return node;

        return ts.visitEachChild(node, child => this.visitBodyChild(child), this.context);
    }

    private visitBodyChild<T extends ts.Node>(node: T): T {
        if (!ts.isExpressionStatement(node)) return node;
        if (!ts.isCallExpression(node.expression)) return node;

        return ts.updateStatement(node, this.visitBodyChildExpression(node.expression)) as any as T;
    }

    private visitBodyChildExpression(node: ts.CallExpression): ts.CallExpression {
        if (!ts.isIdentifier(node.expression)) return node;
        if (node.arguments.length !== 2) return node;

        const args = node.arguments.slice();
        const func = args[1];
        
        if (!(ts.isArrowFunction(func) || ts.isFunctionExpression(func))) return node;

        switch(node.expression.getText()) {
            case "describe":
                args[1] = this.visitDescribeFunction(func);
                break;
            case "it":
                args[1] = this.visitItFunction(func);
                break;
        }

        return ts.updateCall(
            node,
            node.expression,
            node.typeArguments,
            args
        );
    }

    private visitDescribeFunction<T extends ts.FunctionExpression | ts.ArrowFunction>(node: T): T {
        if (!ts.isBlock(node.body)) return node;

        if (ts.isFunctionExpression(node)) {
            return ts.updateFunctionExpression (
                node,
                node.modifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                this.visitDescribeBody(node.body)
            ) as T;
        } else {
            if (!ts.isBlock(node.body)) return node;

            return ts.updateArrowFunction(
                node as ts.ArrowFunction,
                node.modifiers,
                node.typeParameters,
                node.parameters,
                node.type,
                this.visitDescribeBody(node.body)
            ) as T;
        }
    }

    private visitDescribeBody(node: ts.Block): ts.Block {
        return ts.visitEachChild(node, child => this.visitBodyChild(child), this.context);
    }

    private visitItFunction(node: ts.FunctionExpression | ts.ArrowFunction): ts.FunctionExpression | ts.ArrowFunction {
        if (!ts.isBlock(node.body)) return node;
        if (ts.isExpressionStatement(node.body)) return node;

        if (ts.isFunctionExpression(node)) {
            return ts.updateFunctionExpression(
                node,
                node.modifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                this.testTransformer.visitTestBody(node.body)
            );
        } else {
            return ts.updateArrowFunction(
                node,
                node.modifiers,
                node.typeParameters,
                node.parameters,
                node.type,
                this.testTransformer.visitTestBody(node.body)
            );
        }
    }
}