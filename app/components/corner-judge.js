
import React, { Component } from 'react';
import ActionBox from './action-box';
import IdentificationForm from './identification-form';
import RingList from './ring-list';
import ScoreBtns from './score-btns';


export default class CornerJudge extends Component {
	
	constructor() {
		super();
		this.state = {
			rings: [true, false],
			maxScore: 3
		}
	}
	
	render() {
		return (
			<div>
				<div>
					<h1>Corner Judge</h1>
					<ActionBox instructions="Enter your name">
						<IdentificationForm type="text" autoCapitalize="on" />
					</ActionBox>
					<ActionBox instructions="Select ring number">
						<RingList disableWhenClosed={true} rings={this.state.rings} />
					</ActionBox>
					<ActionBox instructions="Waiting for authorisation...">
						<button type="button">Cancel</button>
					</ActionBox>
				</div>
				<div>
					<button type="button">Undo</button>
					<ScoreBtns maxScore={this.state.maxScore} />
					<ScoreBtns maxScore={this.state.maxScore} />
					<div className="feedback"></div>
				</div>
			</div>
		);
	}
	
}
