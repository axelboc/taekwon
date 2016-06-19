import { Map } from 'immutable';
import { expect } from 'chai';
import presenter from '../adminPresenter';

describe ('Presenters::admin', () => {

  it('presents the entire server state', () => {
    const state = Map();
    expect(presenter(state)).to.equal(state);
  });
  
});
