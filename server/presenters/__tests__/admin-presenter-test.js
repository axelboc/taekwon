import { Map } from 'immutable';
import { expect } from 'chai';

import adminPresenter from '../../presenters/admin-presenter';

describe ('Presenter::admin', () => {
  
  it('presents the entire server state', () => {
    const state = Map();
    const presentedState = adminPresenter(state);
    
    expect(presentedState).to.equal(state);
  });
  
});
