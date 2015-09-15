
import React, { Component } from 'react';


export default class ScoreBtns extends Component {
	
	render() {
		return (
			<div>
				{this.renderBtns()}
			</div>
		);
	}
	
	renderBtns() {
		const max = this.props.maxScore;
		let btns = [];
		
		for (let i = max; i > 0; i -= 1) {
			btns.push((
				<button type="button" key={max - i}>{i}</button>
			));
		}
		
		return btns;
	}
	
}
