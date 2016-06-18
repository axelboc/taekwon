import { fromJS } from 'immutable';
import { expect } from 'chai';
import socket from '../socket';

describe('Clients::socket', () => {
  
  it('deals with initial state', () => {
    const nextState = socket.reducer(undefined, {});
    expect(nextState).to.equal(fromJS({
      isConnected: false,
      isReconnecting: false
    }));
  });
  
  it('can set connected state', () => {
    const isConnected = false;
    
    const initialState = fromJS({ isConnected: true });
    const action = socket.actions.setConnected(isConnected);
    const nextState = socket.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({ isConnected }));
  });
  
  it('can set reconnecting state', () => {
    const isReconnecting = false;
    
    const initialState = fromJS({ isReconnecting: true });
    const action = socket.actions.setReconnecting(isReconnecting);
    const nextState = socket.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({ isReconnecting }));
  });

});
