import { Map } from 'immutable';
import { expect } from 'chai';

import makeStore from '../../server/store';

describe('store', () => {

  it('creates a Redux store', () => {
    const store = makeStore();
    expect(store.getState()).to.be.an('object');
  });

});