import { Map } from 'immutable';
import { expect } from 'chai';
import combinePresenters from '../combinePresenters';

describe ('Presenters::combinePresenters', () => {

  it('returns a function', () => {
    const presenter = combinePresenters({});
    expect(typeof presenter).to.equal('function');
  });

});
