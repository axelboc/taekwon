
import 'babel-core/polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import JuryPresident from './components/JuryPresident';

// Get main container
let main = document.getElementById('main');

// Render Corner Judge interface
ReactDOM.render(<JuryPresident />, main);
