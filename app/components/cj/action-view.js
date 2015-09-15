
import React, { Component } from 'react';
import ActionBox from '../action-box';
import IdentificationForm from '../identification-form';
import RingList from '../ring-list';


export default class ActionView extends Component {
	
	render() {
		return (
			<div>
				<h1>Corner Judge</h1>
				{this.renderBox()}
			</div>
		);
	}
	
	renderBox() {
		if (!this.props.isIdentified) {
			return (
				<ActionBox instructions="Enter your name">
					<IdentificationForm type="text" autoCapitalize="on" />
				</ActionBox>
			);
		} else if (this.props.joinedRing === null) {
			return (
				<ActionBox instructions="Select ring number">
					<RingList disableWhenClosed={true} rings={this.props.rings} />
				</ActionBox>
			);
		} else {
			return (
				<ActionBox instructions="Waiting for authorisation...">
					<button type="button">Cancel</button>
				</ActionBox>
			);
		}
	}
	
}
