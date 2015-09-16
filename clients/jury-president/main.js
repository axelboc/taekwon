
import 'babel-core/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import Root from './components/root';

// Get main container
let main = document.getElementById('main');

// Render Corner Judge interface
ReactDOM.render(<Root />, main);
