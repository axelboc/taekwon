
import 'babel-core/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Root from './components/root';

import { createStore } from 'redux';
import { Provider } from 'react-redux';
import reducer from './reducers';


// Create Redux store
let store = createStore(reducer);


// Get main container
let main = document.getElementById('main');

// Render Corner Judge interface
ReactDOM.render(
	<Provider store={store}>
		{() => <Root />}
	</Provider>,
	main
);
