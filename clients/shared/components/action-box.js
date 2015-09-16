
import React, { Component } from 'react';


export default class ActionBox extends Component {
	
	render() {
		return (
			<div className="action">
				<p className="instr">{this.props.instructions}</p>
				{this.props.children}
			</div>
		);
	}
	
}
