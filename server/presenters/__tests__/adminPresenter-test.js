import { Map } from 'immutable';
import { expect } from 'chai';
import presenter from '../../presenters/adminPresenter';

describe ('Presenter::admin', () => {

  it('presents the entire server state', () => {
    const state = Map();
    expect(presenter(state)).to.equal(state);
  });
  
});
