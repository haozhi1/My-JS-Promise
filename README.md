# My-Promise

## Intro
A minimalist implementation of `Promise` conforming to Promises/A+ (https://promisesaplus.com)

## Build
```
    npm install

    npm run build
```


## Usage
Just like regular JS `Promise`.

Supports `resolve`, `reject`, and `allSettled` static methods.

```javascript

const rejectPromise = MyPromise.reject(1);

const resolvePromise = MyPromise.resolve(1);

const promise1 = new MyPromise<number>((resolve) => {
    setTimeout(() => { resolve(1); });
});

const promise2 = new MyPromise<number>((resolve) => {
    setTimeout(() => { resolve(2); });
});

const promise3 = new MyPromise<number>((_, reject) => {
    setTimeout(() => { reject(3); });
});

MyPromise.allSettled([promise1, promise2, promise3]).then(values => { console.log(values) });
```
