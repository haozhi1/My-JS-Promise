import { MyPromise } from "../lib/promise"

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