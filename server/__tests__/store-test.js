import { Map } from 'immutable';
import { expect } from 'chai';

import makeStore from '../store';

describe('Server::store', () => {

  it('creates a Redux store', () => {
    const store = makeStore();
    expect(store.getState()).to.be.an('object');
  });

});