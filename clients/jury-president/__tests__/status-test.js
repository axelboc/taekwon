import { fromJS } from 'immutable';
import { expect } from 'chai';
import status from '../status';

describe('JuryPresident::status', () => {
  
  it('deals with initial state', () => {
    const nextState = status.reducer(undefined, {});
    expect(nextState).to.equal(fromJS({}));
  });

});
