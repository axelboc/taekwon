
import {List, Map, fromJS} from 'immutable';
import {expect} from 'chai';

import reducer from '../../../clients/corner-judge/reducer';


describe('reducer', () => {

	it('handles SET_STATE', () => {
		const initialState = Map();
		const action = {
			type: 'SET_STATE',
			state: {
				test: 'foo'
			}
		};
		
		const nextState = reducer(initialState, action);

		expect(nextState).to.equal(Map({
			test: 'foo'
		}));
	});

});
