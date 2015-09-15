
import React, { Component } from 'react';


export default class RingList extends Component {
	
	render() {
		return (
			<div>
				{this.renderBtnNodes()}
			</div>
		);
	}
	
	renderBtnNodes() {
		const disableWhenClosed = this.props.disableWhenClosed;
		
		return this.props.rings.map((isOpen, index) => {
			const disableBtn = disableWhenClosed && !isOpen || !disableWhenClosed && isOpen;
			
			return (
				<button type="button" disabled={disableBtn} key={index}>{index + 1}</button>
			);
		});
	}
	
}
