import { List, Map, fromJS } from 'immutable';
import { expect } from 'chai';

import clients from '../../server/clients';

describe('Clients', () => {
  
  it('deals with initial state', () => {
    const nextState = clients.reducer(undefined, {});
    expect(nextState).to.equal(fromJS({}));
  });
  
  it('can add a client', () => {
    const id = 'foo';
    const type = 'bar';
    
    const initialState = fromJS({});
    const action = clients.actions.add(id, type);
    const nextState = clients.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({
      [id]: {
        type,
        connected: true,
        data: null
      }
    }));
  });
  
  it('can remove a client', () => {
    const id = 'foo';
    
    const initialState = fromJS({ [id]: {} });
    const action = clients.actions.remove(id);
    const nextState = clients.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({}));
  });
  
  it('can set a client\'s connected state', () => {
    const id = 'foo';
    const connected = false;
    
    const initialState = fromJS({ [id]: { connected: true } });
    const action = clients.actions.setConnected(id, connected);
    const nextState = clients.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({
      [id]: { connected }
    }));
  });
  
  it('can set a Corner Judge\'s name', () => {
    const id = 'foo';
    const name = 'Bar';
    
    const initialState = fromJS({ [id]: { data: { name: 'Baz' } } });
    const action = clients.actions.setCJName(id, name);
    const nextState = clients.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({
      [id]: {
        data: { name }
      }
    }));
  });
  
  it('can set a Corner Judge\'s authorised state', () => {
    const id = 'foo';
    const authorised = true;
    
    const initialState = fromJS({ [id]: { data: { authorised: false } } });
    const action = clients.actions.setCJAuthorised(id, authorised);
    const nextState = clients.reducer(initialState, action);

    expect(nextState).to.equal(fromJS({
      [id]: {
        data: { authorised }
      }
    }));
  });

});
