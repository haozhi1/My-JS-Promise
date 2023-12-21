type Executor<T> = (resolve: (value: T) => void, reject: (reason: any) => void) => void

type DependentPromise<T> = {
    promise: MyPromise<any>;
    fulfilledTransformFn?: (value: T | null) => any;
    rejectedTransformFn?: (reason: any) => any;
}

type FinallyPromise = {
    promise: MyPromise<any>;
    sideEffectFn: () => void;
}

const isThenable = (obj: any) => obj && typeof obj.then === "function";

const enum PROMISE_STATE {
    PENDING,
    REJECTED,
    FULFILLED,
}

/* This implements https://promisesaplus.com */
export default class MyPromise<T> {
    private state_: PROMISE_STATE;
    private value_: T | null;
    private reason_: any;
    private chainedPromises_: DependentPromise<T>[];
    private finallyPromises_: FinallyPromise[];

    /**
     * Returns a promise fulfilled with a given value.
     * @param value 
     * @returns {MyPromise}
     */
    static resolve(value: any): MyPromise<any> {
        return new MyPromise((resolve) => { resolve(value); });
    }

    /**
     * Returns a promise rejected with a given reason.
     * @param reason 
     * @returns {MyPromise}
     */
    static reject(reason: any): MyPromise<any> {
        return new MyPromise((_, reject) => { reject(reason); });
    }

    /**
     * Returns a promose that resolve when all input promises are either
     * fulfilled or rejected.
     * @param promises 
     * @returns {MyPromise}
     */
    static allSettled(promises: MyPromise<any>[]): MyPromise<any[]> {
        const promise = new MyPromise<any[]>();
        let results: MyPromise<any>[] = [];
        const saveResult = (value: any) => {
            results.push(value);
            if (results.length === promises.length) {
                promise.onFulfilled_(results);
            }
        }
        for (const inputPromise of promises) {
            inputPromise.then(saveResult).catch(saveResult);
        }
        return promise;
    }

    /**
     * Create a new promise object.
     * @constructor
     * @param {function} executor 
     */
    constructor(executor?: Executor<T>) {
        this.state_ = PROMISE_STATE.PENDING;
        this.reason_ = null;
        this.value_ = null;
        this.chainedPromises_ = [];
        this.finallyPromises_ = [];

        if (typeof executor === "function") {
            // Defer execution to next event loop run
            try {
                setImmediate(() => {
                    executor(
                        this.onFulfilled_.bind(this),
                        this.onRejected_.bind(this)
                    );
                })
            } catch (exception) {
                this.onRejected_(exception);
            }
        }
    }

    /**
     * Handle fulfilled promise.
     * @param {function} [fulfilledTransformFn]
     * @param {function} [rejectedTransformFn]
     * @returns {MyPromise}
     */
    then(fulfilledTransformFn?: (value: T | null) => any, rejectedTransformFn?: (reason: any) => any): MyPromise<any> {
        const promise = new MyPromise();
        this.chainedPromises_.push({ promise, fulfilledTransformFn, rejectedTransformFn });
        if (this.state_ === PROMISE_STATE.FULFILLED) {
            this.propagateFulfilled_();
        } else if (this.state_ === PROMISE_STATE.REJECTED) {
            this.propagateRejected_();
        }
        return promise;
    }

    /**
     * Handle rejected promise.
     * @param {function} rejectedTransformFn
     * @returns {MyPromise}
     */
    catch(rejectedTransformFn: (reason: any) => any): MyPromise<any> {
        return this.then(undefined, rejectedTransformFn);
    }

    /**
     * Run after the promise is either fulfilled or rejected
     * @param sideEffectFn 
     * @returns {MyPromise} 
     */
    finally(sideEffectFn: () => void): MyPromise<any> {
        if (this.state_ !== PROMISE_STATE.PENDING) {
            sideEffectFn()
            return this.state_ === PROMISE_STATE.FULFILLED ?
                MyPromise.resolve(this.value_) :
                MyPromise.reject(this.reason_);
        }

        const promise = new MyPromise<any>();
        this.finallyPromises_.push({ promise, sideEffectFn });
        return promise;
    }

    /* internal helpers */

    private onFulfilled_(value: T) {
        // We can only ever resolve a promise once
        if (this.state_ === PROMISE_STATE.PENDING) {
            this.state_ = PROMISE_STATE.FULFILLED;
            this.value_ = value;
            this.propagateFulfilled_();
        }
    }

    private onRejected_(reason: any) {
        if (this.state_ === PROMISE_STATE.PENDING) {
            this.state_ = PROMISE_STATE.REJECTED;
            this.reason_ = reason;
            this.propagateRejected_();
        }
    }

    private propagateFulfilled_() {
        for (const { promise, fulfilledTransformFn } of this.chainedPromises_) {
            if (typeof fulfilledTransformFn === "function") {
                const val = fulfilledTransformFn(this.value_);
                // If val is promise, wait for its result then call the appropriate method
                // of the chained promise.
                if (isThenable(val)) {
                    val.then(
                        (value: any) => promise.onFulfilled_(value),
                        (reason: any) => promise.onRejected_(reason),
                    );
                } else {
                    promise.onFulfilled_(val);
                }
            } else {
                promise.onFulfilled_(this.value_);
            }
        }

        for (const { promise, sideEffectFn } of this.finallyPromises_) {
            sideEffectFn();
            promise.onFulfilled_(this.value_);
        }

        this.chainedPromises_ = [];
        this.finallyPromises_ = [];
    }

    private propagateRejected_() {
        for (const { promise, rejectedTransformFn } of this.chainedPromises_) {
            if (typeof rejectedTransformFn === "function") {
                const val = rejectedTransformFn(this.reason_);
                if (isThenable(val)) {
                    val.then(
                        (value: any) => promise.onFulfilled_(value),
                        (reason: any) => promise.onRejected_(reason),
                    );
                } else {
                    promise.onFulfilled_(val);
                }
            } else {
                promise.onRejected_(this.reason_);
            }
        }

        for (const { promise, sideEffectFn } of this.finallyPromises_) {
            sideEffectFn();
            promise.onFulfilled_(this.value_);
        }

        this.chainedPromises_ = [];
        this.finallyPromises_ = [];
    }
}