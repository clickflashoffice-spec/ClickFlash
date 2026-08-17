import assert from 'node:assert/strict';

if (typeof (globalThis as any).expect === 'undefined') {
  (globalThis as any).expect = (arg1: any, arg2?: any) => {
    const isErrorExpectation =
      arg2 instanceof RegExp ||
      typeof arg2 === 'function' ||
      arg2 === TypeError ||
      arg2 === Error;

    if (arg1 && typeof arg1.then === 'function') {
      if (isErrorExpectation) {
        return assert.rejects(arg1, arg2);
      }
      return arg1;
    }

    if (typeof arg1 === 'function') {
      if (isErrorExpectation) {
        let threw = false;
        try {
          const res = arg1();
          if (res && typeof res.then === 'function') {
            return assert.rejects(res, arg2);
          }
        } catch (err) {
          threw = true;
          if (arg2 instanceof RegExp) {
            assert.match(String(err), arg2);
          } else if (typeof arg2 === 'function') {
            if (arg2.prototype instanceof Error || arg2 === Error || arg2 === TypeError) {
              assert.ok(err instanceof arg2);
            } else {
              assert.ok(arg2(err));
            }
          }
        }
        if (!threw) {
          assert.throws(arg1, arg2);
        }
        return;
      }
      assert.ok(arg1, typeof arg2 === 'string' ? arg2 : undefined);
      return;
    }

    assert.ok(arg1, typeof arg2 === 'string' ? arg2 : undefined);
  };
}
