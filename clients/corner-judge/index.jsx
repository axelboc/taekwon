
import 'babel-core/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import CornerJudge from './components/CornerJudge';

import { createStore } from 'redux';
import { Provider } from 'react-redux';
import reducer from './reducer';


// Create Redux store
let store = createStore(reducer);
store.dispatch({
	type: 'SET_STATE',
	state: {
		rings: [true, false],
		isIdentified: true,
		isAuthorised: true,
		joinedRing: 1,
		maxScore: 3
	}
});

// Get main container
let main = document.getElementById('main');

// Render Corner Judge interface
ReactDOM.render(
	<Provider store={store}>
		<CornerJudge />
	</Provider>,
	main
);
