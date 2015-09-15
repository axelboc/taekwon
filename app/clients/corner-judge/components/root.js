
import React, { Component } from 'react';
import ActionView from './action-view';
import ScoringView from './scoring-view';


export default class Root extends Component {
	
	constructor() {
		super();
		this.state = {
			rings: [true, false],
			isIdentified: true,
			isAuthorised: true,
			joinedRing: 1,
			maxScore: 3
		}
	}
	
	render() {
		return (
			<div>
				{this.renderView()}
			</div>
		);
	}
	
	renderView() {
		if (!this.state.isAuthorised) {
			return <ActionView 
						isIdentified={this.state.isIdentified}
						joinedRing={this.state.joinedRing}
						rings={this.state.rings} />
		} else {
			return <ScoringView maxScore={this.state.maxScore} />
		}
	}
	
}
