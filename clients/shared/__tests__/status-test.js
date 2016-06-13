import { fromJS } from 'immutable';
import { expect } from 'chai';
import status from '../status';

describe('Clients::status', () => {
  
  it('deals with initial state', () => {
    const nextState = status.reducer(undefined, {});
    expect(nextState).to.equal(fromJS({}));
  });
  
  it('can set connection status', () => {
    const connected = false;
    
    const initialState = fromJS({ connected: true });
    const action = status.actions.setConnected(connected);
    const nextState = status.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({ connected }));
  });
  
  it('can set reconnection status', () => {
    const reconnecting = false;
    
    const initialState = fromJS({ reconnecting: true });
    const action = status.actions.setConnected(reconnecting);
    const nextState = status.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({ reconnecting }));
  });

});
