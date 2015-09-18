
import React, { Component } from 'react';
import ScoreBtns from './ScoreBtns';


export default class ScoringView extends Component {
	
	render() {
		return (
			<div>
				<button type="button">Undo</button>
				<ScoreBtns maxScore={this.props.maxScore} />
				<ScoreBtns maxScore={this.props.maxScore} />
				<div className="feedback"></div>
			</div>
		);
	}
	
}
