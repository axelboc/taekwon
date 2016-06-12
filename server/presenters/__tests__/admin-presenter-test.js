import { Map } from 'immutable';
import { expect } from 'chai';
import createPresenter from '../../presenters';

describe ('Presenter::admin', () => {

  const presenter = createPresenter('admin', 'id');
  
  it('presents the entire server state', () => {
    const state = Map();
    expect(presenter(state)).to.equal(state);
  });
  
});
