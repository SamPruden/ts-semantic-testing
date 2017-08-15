## Installation
```
# global
npm install -g tsst
# local
npm install tsst --save-dev
```

## What is it?
Uhh. This is an experimental library/tool/utility/thing to aid testing of TypeScript _semantics_.

## What does it do?
At its core, this is a TypeScript transformer that takes semantic build errors and turns them into runtime errors. Here's the show-don't-tell explanation.

### Your tests
```ts
type ZeroOneToBoolean<T extends "0" | "1">
    = {"0": false, "1": true}[T];

describe("ZeroOneToBoolean", () => {
    it("works with '0'", () => {
        type A = ZeroOneToBoolean<"0">;
    });

    it("works with '1'", () => {
        type A = ZeroOneToBoolean<"1">;
    });

    // This test should fail for demonstration purposes
    it("works with the number 0", () => {
        type A = ZeroOneToBoolean<0>;
    });
});
```
### What your tests become
```ts
describe("ZeroOneToBoolean", () => {
    it("works with 0", () => {
    });

    it("works with 1", () => {
    });

    // This test should fail for demonstration purposes
    it("works with the number 0", () => {
        throw new Error("​​Type '0' does not satisfy the constraint '\"0\" | \"1\"'.​​");
    });
});
```

In this early form, this only tests for successful compilation.

## What might it do soon?
- [ ] Negative tests that let you expect specific errors
- [x] Have some form of cli that makes it more usable
- [ ] Have its own tests. This project is currently horrendously untested because I'm not sure what the best way to test this is.
- [ ] Have a better name?
- [ ] Change completely in any number of ways
- [ ] Stop parsing full tests and become a block-local transformation

## How does one use this?
If you install this package globally, you can use `tsst` to transform the tests. This is a very basic builder. It uses the local `tsconfig.json` and takes a single argument for a test glob.

```
# global install
tsst "**/*.test.ts"
# local install
node_modules/.bin/tsst "**/*.test.ts"
```

The TypeScript compiler provides hooks for specifying custom transformers, but `tsc` does not expose these. While many common tools like ts-loader are starting to support transformers, most don't yet provide transformers with access to the `ts.Program` object that this requires.

I've been messing about with [Wallaby.js](https://wallabyjs.com/) a bit recently, and tried to get it working with that, to partial success. They were absolutely fantastic about adding support for transformers for me with a [feature-request](https://github.com/wallabyjs/public/issues/1261)-to-release turn-around time of about 2 hours. Wallaby.js runs and reports the transformed tests correctly, but there are some problems with line numbers and error positions not lining up. I haven't fully pinned these down yet, and am not sure to what degree these issues are solvable by this tool.
